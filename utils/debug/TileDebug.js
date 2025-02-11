import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import GeometryLayer from 'Layer/GeometryLayer';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import TileObjectChart from './charts/TileObjectChart';
import TileVisibilityChart from './charts/TileVisibilityChart';
import GeometryDebug from './GeometryDebug';
import Debug from './Debug';
import OBBHelper from './OBBHelper';

function applyToNodeFirstMaterial(view, root, layer, cb) {
    root.traverse((object) => {
        if (object.material && object.layer === layer) {
            cb(object.material);
        }
    });
    view.notifyChange();
}

let selectedNode;
/**
 * Select tile
 *
 * @param      {View} view
 * @param      {Object} mouseOrEvt - mouse position in window coordinates (0, 0 = top-left)
 * or MouseEvent or TouchEvent.
 * @param      {boolean}  [showInfo=true] Show tile information in console.
 * @return     {TileMesh} Selected tile.
 */
function selectTileAt(view, mouseOrEvt, showInfo = true) {
    if (selectedNode) {
        selectedNode.material.overlayAlpha = 0;
        selectedNode.material.setUniform('showOutline', view.tileLayer.showOutline);
        view.notifyChange(selectedNode);
    }

    const picked = view.tileLayer.pickObjectsAt(view, mouseOrEvt);
    selectedNode = picked.length ? picked[0].object : undefined;

    if (selectedNode) {
        if (showInfo) {
            // eslint-disable-next-line no-console
            console.info(selectedNode);
        }
        selectedNode.material.overlayAlpha = 0.5;
        selectedNode.material.setUniform('showOutline', true);
        view.notifyChange(selectedNode);
    }
    return selectedNode;
}

export default function createTileDebugUI(datDebugTool, view, layer, debugInstance, force = false) {
    if (!view.isDebugMode && !force) {
        return;
    }
    debugInstance = debugInstance || new Debug(view, datDebugTool);
    layer = layer || view.tileLayer;
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, layer);

    const objectChardId = `${layer.id}-nb-objects`;
    const canvasObjectChardId = debugInstance.createChartContainer(objectChardId);
    const visibleChardId = `${layer.id}-nb-visible`;
    const canvasVisibleChardId = debugInstance.createChartContainer(visibleChardId);

    debugInstance.charts.push(new TileObjectChart(canvasObjectChardId.getContext('2d'), layer));
    debugInstance.charts.push(new TileVisibilityChart(canvasVisibleChardId.getContext('2d'), layer));

    layer.showOutline = false;
    layer.wireframe = false;
    const state = {
        objectChart: true,
        visibilityChart: true,
        sseHelper: false,
    };

    // tiles outline
    gui.add(layer, 'showOutline').name('Show tiles').onChange((newValue) => {
        layer.showOutline = newValue;

        applyToNodeFirstMaterial(view, layer.object3d, layer, (material) => {
            material.setUniform('showOutline', newValue);
        });
    });

    // tiles wireframe
    gui.add(layer, 'wireframe').name('Wireframe').onChange(() => {
        view.notifyChange(layer);
    });

    // TileObjectChart visibility
    gui.add(state, 'objectChart').name('Object chart').onChange((newValue) => {
        if (newValue) {
            document.getElementById(objectChardId).parentNode.style.display = 'block';
        } else {
            document.getElementById(objectChardId).parentNode.style.display = 'none';
        }
        debugInstance.updateChartDivSize();
        debugInstance.charts.forEach(c => c.update());
    });

    // TileVisibilityChart visibility
    gui.add(state, 'visibilityChart').name('Visibility chart').onChange((newValue) => {
        if (newValue) {
            document.getElementById(visibleChardId).parentNode.style.display = 'block';
        } else {
            document.getElementById(visibleChardId).parentNode.style.display = 'none';
        }
        debugInstance.updateChartDivSize();
        debugInstance.charts.forEach(c => c.update());
    });

    // Bounding box control
    const obb_layer_id = `${layer.id}_obb_debug`;
    const sb_layer_id = `${layer.id}_sb_debug`;
    const geometrySphere = new THREE.SphereGeometry(1, 16, 16);

    function debugIdUpdate(context, layer, node) {
        if (!node.parent || !layer.visible) {
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, node);
            return;
        }

        // filtering helper attached to node with the current debug layer
        let helper = node.link[layer.id];
        if (node.visible && node.material && node.material.visible) {
            if (!helper) {
                helper = new THREE.Group();
                helper.layer = layer;
                node.matrixWorld.decompose(helper.position, helper.quaternion, helper.scale);

                if (layer.id == obb_layer_id) {
                    const obbHelper = new OBBHelper(node.obb);
                    obbHelper.layer = layer;
                    helper.add(obbHelper);
                } else if (layer.id == sb_layer_id) {
                    const color = new THREE.Color(Math.random(), Math.random(), Math.random());
                    const material = new THREE.MeshBasicMaterial({ color: color.getHex(), wireframe: true });
                    const sphereHelper = new THREE.Mesh(geometrySphere, material);
                    sphereHelper.position.copy(node.boundingSphere.center);
                    sphereHelper.scale.multiplyScalar(node.boundingSphere.radius);
                    sphereHelper.scale.set(1, 1, 1).multiplyScalar(node.boundingSphere.radius);
                    sphereHelper.layer = layer;
                    helper.add(sphereHelper);
                }

                node.link[layer.id] = helper;
            }

            layer.object3d.add(helper);
            helper.updateMatrixWorld(true);
        } else if (helper) {
            layer.object3d.remove(helper);
        }
    }

    class DebugLayer extends GeometryLayer {
        constructor(id, options = {}) {
            super(id, options.object3d || new THREE.Group(), options);
            this.update = debugIdUpdate;
            this.isDebugLayer = true;
        }

        preUpdate(context, sources) {
            if (sources.has(this.parent)) {
                this.object3d.clear();
            }
        }
    }

    const obbLayer = new DebugLayer(obb_layer_id, {
        visible: false,
        cacheLifeTime: Infinity,
        source: false,
    });

    view.addLayer(obbLayer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(l);
        });
    });

    const sbLayer = new DebugLayer(sb_layer_id, {
        visible: false,
        cacheLifeTime: Infinity,
        source: false,
    });

    view.addLayer(sbLayer).then((l) => {
        gui.add(l, 'visible').name('Bounding Spheres').onChange(() => {
            view.notifyChange(l);
        });
    });

    const viewerDiv = document.getElementById('viewerDiv');
    const circle = document.createElement('span');
    circle.className = 'circleBase';

    viewerDiv.appendChild(circle);

    const centerNode = new THREE.Vector3();
    let actualNode;

    const animationFrameRequester = () => {
        TWEEN.update();
        view.notifyChange();
    };

    const removeAnimationRequester = () => {
        TWEEN.removeAll();
        if (view._frameRequesters[MAIN_LOOP_EVENTS.BEFORE_RENDER].includes(animationFrameRequester)) {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, animationFrameRequester);
        }
    };

    function picking(event) {
        const selectNode = selectTileAt(view, event, false);
        if (selectNode) {
            circle.style.display = 'table-cell';
            centerNode.copy(selectNode.boundingSphere.center).applyMatrix4(selectNode.matrixWorld);
            const project = centerNode.project(view.camera3D);
            const coords = view.normalizedToViewCoords(project);
            const size = selectNode.screenSize;

            if (actualNode != selectNode) {
                const actualSize = Number(circle.style.width.replace('px', ''));
                actualNode = selectNode;
                removeAnimationRequester();
                new TWEEN.Tween({ size: actualSize })
                    .to({ size }, 500)
                    .easing(TWEEN.Easing.Sinusoidal.In)
                    .easing(TWEEN.Easing.Exponential.Out)
                    .onUpdate((object) => {
                        circle.style['line-height'] = `${object.size}px`;
                        circle.style.width = `${object.size}px`;
                        circle.style.height = `${object.size}px`;
                        circle.innerHTML = `${Math.floor(object.size)} px`;
                        circle.style.left = `${coords.x - object.size * 0.5}px`;
                        circle.style.top = `${coords.y - object.size * 0.5}px`;
                    })
                    .onComplete(removeAnimationRequester)
                    .start();

                view.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, animationFrameRequester);
            }
        } else {
            circle.style.display = 'none';
        }
    }

    gui.add(state, 'sseHelper').name('Sse helper').onChange((v) => {
        if (v) {
            window.addEventListener('mousemove', picking, false);
        } else {
            circle.style.display = 'none';
            removeAnimationRequester();
            window.removeEventListener('mousemove', picking);
        }
    });
    let currKey = null;

    window.addEventListener('mousedown', (event) => {
        if (currKey == 83) {
            selectTileAt(view, event);
        }
    });

    window.addEventListener('keydown', (event) => {
        currKey = event.which;
    });
    window.addEventListener('keyup', () => {
        currKey = null;
    });
}
