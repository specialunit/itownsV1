import { CameraHelper, Color, Vector3 } from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import OBB from 'Renderer/OBB';
import * as THREE from 'three';
import ThreeStatsChart from './charts/ThreeStatsChart';
import { backgroundChartDiv, color_blue } from './charts/ChartConfig';
import OBBHelper from './OBBHelper';

/**
 * Create a debug instance attached to an itowns instance
 *
 * @Constructor
 * @param {Scene} scene the itowns Scene
 * @return {Debug} a debug instance
 */

// disabling eslint errors as it is the exported constructor
function Debug(view, datDebugTool, chartDivContainer) {
    // CHARTS
    // Create default charts div if missing
    if (!chartDivContainer) {
        chartDivContainer = document.createElement('div');
        chartDivContainer.id = 'chart-div';
        chartDivContainer.style.cssText = `z-index: 10; position: absolute; bottom: 0; left: 0; width: 100vw; height: 30%; background-color: ${backgroundChartDiv}; display: none`;
        document.body.appendChild(chartDivContainer);
    }

    this.chartDivContainer = chartDivContainer;
    const canvas = this.createChartContainer('three-info');

    const ctx = canvas.getContext('2d');

    this.charts = [];

    this.charts.push(new ThreeStatsChart(ctx, view.mainLoop.gfxEngine.renderer));

    const charts = this.charts;
    const tileLayer = view.tileLayer;
    const initialPosition = new Coordinates(view.referenceCrs, 0.0, 0.0, 0.0);
    const geoPosition = new Coordinates('EPSG:4326', 0.0, 0.0, 0.0);

    function debugChartUpdate(updateDuration) {
        const displayed = chartDivContainer.style.display != 'none';
        charts.forEach(c => c.update(displayed, updateDuration));
    }

    // DEBUG CONTROLS
    const gui = datDebugTool.addFolder('Debug Tools');

    const state = {
        displayCharts: false,
        eventsDebug: false,
        debugCameraWindow: false,
        freeze: false,
    };

    let before;
    const startChart = () => {
        before = Date.now();
    };
    const endChart = () => {
        const duration = Date.now() - before;
        // debug graphs update
        debugChartUpdate(duration);
    };

    // charts
    gui.add(state, 'displayCharts').name('Display charts').onChange((newValue) => {
        if (newValue) {
            view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_START, startChart);
            view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, endChart);
            chartDivContainer.style.display = 'flex';
        } else {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.UPDATE_START, startChart);
            view.removeFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, endChart);
            chartDivContainer.style.display = 'none';
        }
        this.updateChartDivSize();
        view.notifyChange();
    });

    gui.add(state, 'debugCameraWindow').name('debug Camera').onChange((value) => {
        if (value) {
            view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, renderCameraDebug);
        } else {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, renderCameraDebug);
        }
        view.notifyChange();
    });

    gui.add(state, 'freeze').name('freeze update').onChange((newValue) => {
        tileLayer.frozen = newValue;
        view.notifyChange();
    });

    // camera-target-updated event
    let LatController;
    let LongController;
    let AltiController;
    let eventFolder;
    const controls = view.controls;
    initialPosition.crs = view.referenceCrs;
    const cursorWorldPosition = new THREE.Vector3();

    const getCenter = (controls && controls.getCameraTargetPosition) ? controls.getCameraTargetPosition : () => view.camera3D.position;
    const cameraTargetListener = (event) => {
        if (view.getPickingPositionFromDepth(view.eventToViewCoords(event), cursorWorldPosition)) {
            initialPosition.setFromVector3(cursorWorldPosition).as('EPSG:4326', geoPosition);
            state.latitude = `${geoPosition.y.toFixed(6)}`;
            state.longitude = `${geoPosition.x.toFixed(6)}`;
            state.altitude = `${geoPosition.z.toFixed(2)}`;
        } else {
            state.latitude = '---------';
            state.longitude = '---------';
            state.altitude = '---------';
        }
        LatController.updateDisplay();
        LongController.updateDisplay();
        AltiController.updateDisplay();
    };

    gui.add(state, 'eventsDebug').name('Debug event').onChange((() => (newValue) => {
        if (newValue) {
            eventFolder = gui.addFolder('Events');
            eventFolder.open();

            initialPosition.setFromVector3(getCenter()).as('EPSG:4326', geoPosition);
            state.latitude = `${geoPosition.y.toFixed(6)}`;
            state.longitude = `${geoPosition.x.toFixed(6)}`;
            state.altitude = `${geoPosition.z.toFixed(2)}`;

            LatController = eventFolder.add(state, 'latitude');
            LongController = eventFolder.add(state, 'longitude');
            AltiController = eventFolder.add(state, 'altitude');

            view.domElement.addEventListener('mousemove', cameraTargetListener);
        } else {
            view.domElement.removeEventListener('mousemove', cameraTargetListener);
            gui.removeFolder('Events');
        }
    })());

    // Camera debug
    const helper = new CameraHelper(view.camera3D);
    const debugCamera = view.camera3D.clone();
    debugCamera.fov *= 1.5;
    debugCamera.updateProjectionMatrix();
    const g = view.mainLoop.gfxEngine;
    const r = g.renderer;
    let fogDistance = 10e10;
    const layerAtmosphere = view.getLayerById('atmosphere');
    if (layerAtmosphere) {
        fogDistance = layerAtmosphere.fog.distance;
    }
    helper.visible = false;
    view.scene.add(helper);

    // Displayed tiles boundind box
    const displayedTilesObb = new OBB();
    const displayedTilesObbHelper = new OBBHelper(displayedTilesObb, '', new Color(color_blue));
    displayedTilesObbHelper.visible = false;
    view.scene.add(displayedTilesObb);
    view.scene.add(displayedTilesObbHelper);

    function updateFogDistance(obj) {
        if (obj.material && fogDistance) {
            obj.material.setUniform('fogDistance', fogDistance);
        }
    }

    const clearColor = new Color();
    const lookAtCameraDebug = new Vector3();
    function renderCameraDebug() {
        if (state.debugCameraWindow && debugCamera) {
            const ratio = 0.25;
            const size = { x: g.width * ratio, y: g.height * ratio };
            debugCamera.aspect = size.x / size.y;
            const camera = view.camera3D;
            const coord = new Coordinates(view.referenceCrs)
                .setFromVector3(camera.position)
                .as(tileLayer.extent.crs);
            const extent = view.tileLayer.info.displayed.extent;
            displayedTilesObb.setFromExtent(extent);
            displayedTilesObbHelper.visible = true;
            displayedTilesObbHelper.updateMatrixWorld(true);

            // Note Method to compute near and far...
            // const bbox = displayedTilesObb.box3D.clone().applyMatrix4(displayedTilesObb.matrixWorld);
            // const distance = bbox.distanceToPoint(view.camera3D.position);
            // console.log('distance', distance, distance + bbox.getBoundingSphere(sphere).radius * 2);

            // Compute position camera debug
            const altitudeCameraDebug = 1.5 * coord.z;
            coord.z = altitudeCameraDebug;
            coord.as(view.referenceCrs).toVector3(debugCamera.position);
            // Compute recoil camera
            camera.worldToLocal(debugCamera.position);
            debugCamera.position.z += altitudeCameraDebug;
            camera.localToWorld(debugCamera.position);
            // Compute target camera debug
            lookAtCameraDebug.copy(view.camera3D.position);
            camera.worldToLocal(lookAtCameraDebug);
            lookAtCameraDebug.z -= altitudeCameraDebug * 1.5;
            camera.localToWorld(lookAtCameraDebug);
            debugCamera.lookAt(lookAtCameraDebug);

            helper.update();

            debugCamera.updateProjectionMatrix();
            if (layerAtmosphere) {
                layerAtmosphere.object3d.visible = false;
                fogDistance = 10e10;
                for (const obj of tileLayer.level0Nodes) {
                    obj.traverseVisible(updateFogDistance);
                }
            }

            const deltaY = state.displayCharts ? Math.round(parseFloat(chartDivContainer.style.height.replace('%', '')) * g.height / 100) + 3 : 0;
            helper.visible = true;
            helper.updateMatrixWorld(true);
            r.getClearColor(clearColor);
            r.setViewport(g.width - size.x, deltaY, size.x, size.y);
            r.setScissor(g.width - size.x, deltaY, size.x, size.y);
            r.setScissorTest(true);
            r.setClearColor(backgroundChartDiv);
            r.clear();
            r.render(view.scene, debugCamera);
            r.setScissorTest(false);
            r.setClearColor(clearColor);
            r.setViewport(0, 0, g.width, g.height);

            helper.visible = false;
            displayedTilesObbHelper.visible = false;
            if (layerAtmosphere) {
                layerAtmosphere.object3d.visible = true;
            }
            if (layerAtmosphere) {
                fogDistance = layerAtmosphere.fog.distance;
                for (const obj of tileLayer.level0Nodes) {
                    obj.traverseVisible(updateFogDistance);
                }
            }
        }
    }
}


Debug.prototype.createChartContainer = function createChartContainer(chartId) {
    const div = document.createElement('div');
    div.style.cssText = `background-color: ${backgroundChartDiv}; flex: auto;`;
    this.chartDivContainer.appendChild(div);

    const chartCanvas = document.createElement('canvas');
    chartCanvas.height = '20rem';
    chartCanvas.id = chartId;
    div.appendChild(chartCanvas);
    return chartCanvas;
};

Debug.prototype.updateChartDivSize = function updateChartDivSize() {
    let count = 0;
    for (const div of this.chartDivContainer.getElementsByTagName('div')) {
        if (div.style.display !== 'none') {
            count++;
        }
    }
    const size = Math.floor(100 / count);
    for (const div of this.chartDivContainer.getElementsByTagName('div')) {
        if (div.style.display !== 'none') {
            div.style.width = `${size}%`;
        }
    }
    this.charts.forEach((c) => {
        c.resize();
        c.update();
    });
};

export default Debug;
