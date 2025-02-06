import * as THREE from 'three';
import { XRControllerModelFactory } from  'ThreeExtended/webxr/XRControllerModelFactory';
import Coordinates from 'Core/Geographic/Coordinates';
import DEMUtils from 'Utils/DEMUtils';
import { Matrix4, Vector3 } from 'three';

async function shutdownXR(session) {
    if (session) {
        await session.end();
    }
}
function extractCameraAttributesFromProjectionMatrix(projectionMatrix) {
    const m = projectionMatrix.elements;

    // Extract near and far
    const near = m[14] / (m[10] - 1);
    const far = m[14] / (m[10] + 1);

    // Extract vertical FOV
    const fovY = 2 * Math.atan(1 / m[5]); // m[5] = 1 / tan(fovY / 2)
    const fov = THREE.MathUtils.radToDeg(fovY); // Convert to degrees

    // Extract aspect ratio
    const aspect = m[5] / m[0]; // m[0] = 1 / (tan(fovY / 2) * aspect)

    return { near, far, aspect, fov };
}


/**
 *
 * @param {*} view  dsfsdf
 * @param {*} options webXR, callback
 */
const initializeWebXR = (view, options) => {
    const scale = options.scale || 1.0;
    const camera = view.camera.camera3D;

    const xr = view.renderer.xr;
    xr.addEventListener('sessionstart', () => {
        const initpos = view.controls.getCameraCoordinate().as(view.referenceCrs);

        // xr.enabled = true;



        const vrHeadSet = new THREE.Object3D();
        vrHeadSet.name = 'xrHeadset';

        // view.scene.scale.multiplyScalar(2);

        const xrControllers = initControllers(xr, vrHeadSet);

        // To avoid controllers precision issues, headset should handle camera position and camera should be reset to origin
        view.scene.add(vrHeadSet);
        view.camera.camera3D.updateMatrixWorld(true);

        //
        view.camera.camera3D.getWorldPosition(vrHeadSet.position);
        view.camera.camera3D.getWorldQuaternion(vrHeadSet.quaternion);



        xr.getReferenceSpace('local');


        vrHeadSet.add(xr.getCamera());

        view.camera.camera3D.updateMatrixWorld(true);


        view.camXR = view.camera.camera3D.clone();      // placeholder camera to initialize correctly the vr, which needs a parent

        // view.camera.resize(view.camera.width, view.camera.height);
        // view.camXR.far = 2000000;
        // view.camXR.near = 0.1;
        view.camXR.updateMatrixWorld(true);
        vrHeadSet.add(view.camXR);

        //
        view.notifyChange();

        // let init = true;

        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && xr.getCamera().cameras.length > 0) {
                xr.getCamera().getWorldPosition(view.camera3D.position);
                xr.getCamera().getWorldQuaternion(view.camera3D.quaternion);

                const { near, far, aspect, fov } = extractCameraAttributesFromProjectionMatrix(xr.getCamera().projectionMatrix);
                view.camera3D.near = near;
                view.camera3D.far = far;
                view.camera3D.aspect = aspect;
                view.camera3D.fov = fov;
                view.camera3D.updateProjectionMatrix();
                //
                // Update the local transformation matrix for the object itself
                view.camera3D.updateMatrix();
                //
                // // Update the world transformation matrix, ensuring it reflects global transforms
                view.camera3D.updateMatrixWorld(true);




                if (xrControllers.left) {
                    listenGamepad(xrControllers.left);
                }
                if (xrControllers.right) {
                    listenGamepad(xrControllers.right);
                }
                //
                resyncControlCamera();
                // //
                computeDistanceToGround();
                updateFarDistance();
                if (options.callback) {
                    options.callback();
                }


                if (view.scene.matrixWorldAutoUpdate === true) {
                    view.scene.updateMatrixWorld();
                }
                //
                view.notifyChange(vrHeadSet, true);
                view.notifyChange(view.camera.camera3D, true);
                // if (!init) {
                //     // init = false;
                //     // view.controls.getLookAtCoordinate();
                //     view.camXR = view.camera3D;
                // }
                // init = false;
            }

            view.mainLoop.step(view, timestamp);
        });
    });

    function resyncControlCamera() {
        // search for other this.camera in Itowns code for perfs issues
        view.controls.camera.position.copy(view.camera.camera3D.position);
        view.controls.camera.rotation.copy(view.camera.camera3D.rotation);
    }

    function computeDistanceToGround() {
        view.camera.elevationToGround = view.controls.getCameraCoordinate().altitude;
    }

    function updateFarDistance() {
        view.camera.camera3D.far =  Math.min(Math.max(view.camera.elevationToGround * 1000, 10000), 100000);
    }

    /*
    Listening {XRInputSource} and emit changes for convenience user binding
    Adding a few internal states for reactivity
    - controller.lockButtonIndex    {number} when a button is pressed, gives its index
    - controller.isStickActive      {boolean} true when a controller stick is not on initial state.
    -
    */
    function listenGamepad(controller) {
        if (controller.gamepad) {
            // gamepad.axes = [0, 0, x, y];
            const gamepad = controller.gamepad;
            const activeValue = gamepad.axes.find(value => value !== 0);
            if (controller.isStickActive && !activeValue && controller.gamepad.endGamePadtrackEmit) {
                controller.dispatchEvent({ type: 'itowns-xr-axes-stop', message: { controller } });
                controller.isStickActive = false;
                return;
            } else if (!controller.isStickActive && activeValue) {
                controller.gamepad.endGamePadtrackEmit = false;
                controller.isStickActive = true;
            } else if (controller.isStickActive && !activeValue) {
                controller.gamepad.endGamePadtrackEmit = true;
            }

            if (activeValue) {
                controller.dispatchEvent({ type: 'itowns-xr-axes-changed', message: { controller } });
            }

            for (const [index, button] of gamepad.buttons.entries()) {
                if (button.pressed) {
                    // 0 - gachette index
                    // 1 - gachette majeur
                    // 3 - stick pressed
                    // 4 - bottom button
                    // 5 - upper button
                    controller.dispatchEvent({ type: 'itowns-xr-button-pressed', message: { controller, buttonIndex: index, button } });
                    controller.lastButtonItem = button;
                } else if (controller.lastButtonItem && controller.lastButtonItem === button) {
                    controller.dispatchEvent({ type: 'itowns-xr-button-released', message: { controller, buttonIndex: index, button } });
                    controller.lastButtonItem = undefined;
                }

                if (button.touched) {
                    // triggered really often
                }
            }
        }
    }

    function initControllers(webXRManager, vrHeadSet) {
        const controllerModelFactory = new XRControllerModelFactory();
        const leftController = webXRManager.getController(0);
        leftController.name = 'leftController';
        const rightController = webXRManager.getController(1);
        rightController.name = 'rightController';
        bindControllerListeners(leftController, vrHeadSet);
        bindControllerListeners(rightController, vrHeadSet);
        const leftGripController = webXRManager.getControllerGrip(0);
        leftGripController.name = 'leftGripController';
        const rightGripController = webXRManager.getControllerGrip(1);
        rightGripController.name = 'rightGripController';
        bindGripController(controllerModelFactory, leftGripController, vrHeadSet);
        bindGripController(controllerModelFactory, rightGripController, vrHeadSet);
        vrHeadSet.add(new THREE.HemisphereLight(0xa5a5a5, 0x898989, 3));
        return { left: leftController, right: rightController };
    }

    function bindControllerListeners(controller, vrHeadSet) {
        controller.addEventListener('disconnected', function removeCtrl() {
            this.remove(this.children[0]);
        });
        controller.addEventListener('connected', (event) => {
            // this.add(buildController(event.data));
            // {XRInputSource} event.data
            controller.gamepad = event.data.gamepad;
            // controller.inputSource = event.data;
        });
        controller.addEventListener('itowns-xr-button-released', (event) => {
            const ctrl = event.message.controller;
            ctrl.lockButtonIndex = undefined;
        });
        controller.addEventListener('itowns-xr-button-pressed', (event) => {
            const ctrl = event.message.controller;
            ctrl.lockButtonIndex = event.message.buttonIndex;
        });
        vrHeadSet.add(controller);
    }

    function bindGripController(controllerModelFactory, gripController, vrHeadSet) {
        gripController.add(controllerModelFactory.createControllerModel(gripController));
        const righthand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                wireframe: true,
            }),
        );
        const controllerGrip1 = xr.getControllerGrip(1);
        controllerGrip1.addEventListener('connected', () => {
            controllerGrip1.add(righthand);
        });
        // vrHeadSet.add(controllerGrip1);

        vrHeadSet.add(gripController);
    }

    function buildController(data) {
        const params = { geometry: {}, material: {} };
        // let cameraTargetPosition = view.controls.getCameraCoordinate();
        // let meshCoord = cameraTargetPosition;
        // let projectedCoords = meshCoord.as(view.referenceCrs);

        switch (data.targetRayMode) {
            case 'tracked-pointer':
                params.geometry = new THREE.BufferGeometry();

                params.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -view.camera.camera3D.far], 3));
                params.geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1], 3));

                params.material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });
                return new THREE.Line(params.geometry, params.material);

            case 'gaze':
                params.geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                params.material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });

                // geometry.position.copy(meshCoord.as(view.referenceCrs));
                return new THREE.Mesh(params.geometry, params.material);
            default:
                break;
        }
    }
};

export default initializeWebXR;


