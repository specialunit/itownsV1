import * as THREE from 'three';
import { XRControllerModelFactory } from  'ThreeExtended/webxr/XRControllerModelFactory';
import { VRControls } from 'Main.js';


/**
 *
 * @param {*} view  dsfsdf
 * @param {*} options webXR, callback
 */
const initializeWebXR = (view, options) => {
    const xr = view.renderer.xr;
    xr.enabled = true;

    xr.addEventListener('sessionstart', () => {
        xr.getReferenceSpace('local');

        // To avoid controllers precision issues, headset should handle camera position
        const vrHeadSet = new THREE.Object3D();
        vrHeadSet.name = 'xrHeadset';
        view.scene.add(vrHeadSet);

        view.camera3D.getWorldPosition(vrHeadSet.position);
        view.camera3D.getWorldQuaternion(vrHeadSet.quaternion);
        vrHeadSet.updateMatrixWorld(true);
        vrHeadSet.add(xr.getCamera());

        // Placeholder camera to initialize correctly the vr, which needs a parent
        view._camXR = view.camera3D.clone();

        // Important to see the controllers -> maybe could be improved
        view._camXR.far = 2000000;
        view._camXR.near = 0.1;
        view._camXR.updateProjectionMatrix();

        // view._camXR.updateMatrixWorld(true);
        vrHeadSet.add(view._camXR);

        view.notifyChange();

        const xrControllers = initControllers(xr, vrHeadSet);
        VRControls.init(view, vrHeadSet);


        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && xr.getCamera().cameras.length > 0) {
                // TODO should be called only once, but the first values are wrong because the camL&camR weren't updated
                updateCamera3D();

                // This will also update the controllers position
                vrHeadSet.updateMatrixWorld(true);

                if (xrControllers.left) {
                    listenGamepad(xrControllers.left);
                }
                if (xrControllers.right) {
                    listenGamepad(xrControllers.right);
                }
                if (options.callback) {
                    options.callback();
                }
            }
            view.mainLoop.step(view, timestamp);
        });
    });


    /*
    Listening {XRInputSource} and emit changes for convenience user binding,
    There is NO JOYSTICK Events so we need to ckeck it ourselves
    Adding a few internal states for reactivity
    - controller.isStickActive      {boolean} true when a controller stick is not on initial state.
    -
    */

    function listenGamepad(controller) {
        if (!controller.gamepad) { return; }
        // gamepad.axes = [0, 0, x, y];

        const gamepad = controller.gamepad;
        const activeValue = gamepad.axes.some(value => value !== 0);

        // Handle stick activity state
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
                // 0 - trigger
                // 1 - grip
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

    function initControllers(webXRManager, vrHeadSet) {
        const controllerModelFactory = new XRControllerModelFactory();
        const leftController = webXRManager.getController(0);
        // leftController.addEventListener('connected', (event) => {
        //     console.log(event.data.handedness);
        // });
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
        //  Add a light for the controllers
        vrHeadSet.add(new THREE.HemisphereLight(0xa5a5a5, 0x898989, 3));
        return { left: leftController, right: rightController };
    }

    function bindControllerListeners(controller, vrHeadSet) {
        controller.addEventListener('disconnected', function removeCtrl() {
            this.remove(this.children[0]);
        });
        controller.addEventListener('connected', (event) => {
            controller.gamepad = event.data.gamepad;
        });
        vrHeadSet.add(controller);
    }

    function bindGripController(controllerModelFactory, gripController, vrHeadSet) {
        gripController.add(controllerModelFactory.createControllerModel(gripController));
        vrHeadSet.add(gripController);
    }


    function updateCamera3D() {
        /* This is what's done in updateUserCamera the WebXRManager.js of threejs
                Update projectionMatrix, could be replaced by:
               camera.projectionMatrix.copy( cameraXR.projectionMatrix );
              camera.projectionMatrixInverse.copy( cameraXR.projectionMatrixInverse );
               But it safer to also change all the attributes, in case of another call to updateProjectionMatrix
       */

        const { near, far, aspect, fov } = extractCameraAttributesFromProjectionMatrix(view._camXR.projectionMatrix);
        view.camera3D.near = near;
        view.camera3D.far = far;
        view.camera3D.aspect = aspect;
        view.camera3D.fov = fov;
        view.camera3D.zoom = 1;
        view.camera3D.updateProjectionMatrix();

        xr.getCamera().getWorldPosition(view.camera3D.position);
        xr.getCamera().getWorldQuaternion(view.camera3D.quaternion);



        //                //  TODO is it necessary ?
        // Update the local transformation matrix for the object itself
        view.camera3D.updateMatrix();
        //
        // // Update the world transformation matrix, ensuring it reflects global transforms
        view.camera3D.updateMatrixWorld(true);
        view.notifyChange(view.camera3D, true);
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
};

export default initializeWebXR;


