import * as THREE from 'three';
import { XRControllerModelFactory } from  'ThreeExtended/webxr/XRControllerModelFactory';
import Coordinates from 'Core/Geographic/Coordinates';
import DEMUtils from 'Utils/DEMUtils';

async function shutdownXR(session) {
    if (session) {
        await session.end();
    }
}

/**
 *
 * @param {*} view  dsfsdf
 * @param {*} options webXR, callback
 */
const initializeWebXR = (view, options) => {
    const scale = options.scale || 1.0;

    const xr = view.mainLoop.gfxEngine.renderer.xr;

    xr.addEventListener('sessionstart', () => {
        const camera = view.camera.camera3D;

        const exitXRSession = (event) => {
            if (event.key === 'Escape') {
                document.removeEventListener('keydown', exitXRSession);
                xr.enabled = false;
                view.camera.camera3D = camera;

                view.scene.scale.multiplyScalar(1 / scale);
                view.scene.updateMatrixWorld();

                shutdownXR(xr.getSession());
                view.notifyChange(view.camera.camera3D, true);
            }
        };

        const vrHeadSet = new THREE.Object3D();
        vrHeadSet.name = 'xrHeadset';

        view.scene.scale.multiplyScalar(scale);
        view.scene.updateMatrixWorld();
        
        const xrControllers = initControllers(webXRManager, vrHeadSet);
        
        const position = view.controls.getCameraCoordinate().as(view.referenceCrs);
        // To avoid controllers precision issues, headset should handle camera position and camera should be reset to origin
        view.scene.add(vrHeadSet);



        xr.enabled = true;
        xr.getReferenceSpace('local');

        const geodesicNormal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.geodesicNormal).invert();

        const quat = new THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
        // https://github.com/immersive-web/webxr/issues/1236 for high position value
        const trans = camera.position.clone().multiplyScalar(-scale).applyQuaternion(quat);
        const transform = new XRRigidTransform(trans, quat);
        // here position seems ok {x: 4485948.637198923, y: 476198.0416370128, z: 4497216.056600053, w: 1}
        const baseReferenceSpace = xr.getReferenceSpace();
        const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);
        // there it is not anymore : originOffset Matrix is :  4485948.5, 476198.03125, 4497216
          
        // Must delay replacement to allow user listening to sessionstart to get original ReferenceSpace
        setTimeout(() => {
             xr.setReferenceSpace(teleportSpaceOffset);
             // does a regression over controller matrixWorld update...
         });
        view.notifyChange();

        view.camera.camera3D = xr.getCamera();
        view.camera.camera3D.far = 100;
        view.camera.resize(view.camera.width, view.camera.height);
        vrHeadSet.add(view.camera.camera3D);

        document.addEventListener('keydown', exitXRSession, false);

        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && view.camera.camera3D.cameras[0]) {

                if (xrControllers.left) {
                    listenGamepad(xrControllers.left);
                }
                if (xrControllers.right) {
                    listenGamepad(xrControllers.right);
                }

                view.camera.camera3D.updateMatrix();
                view.camera.camera3D.updateMatrixWorld(true);
                resyncControlCamera();

                if (view.scene.matrixWorldAutoUpdate === true) {
                    view.scene.updateMatrixWorld();
                }

                computeDistanceToGround();
                updateFarDistance();
                if (options.callback) {
                    options.callback();
                }

                view.notifyChange(view.camera.camera3D, true);
            }

            view.mainLoop.step(view, timestamp);

        });
    });

    function resyncControlCamera() {
        // search for other this.camera in Itowns code for perfs issues
        view.controls.camera.position.copy(view.camera.camera3D.position);
        view.controls.camera.rotation.copy(view.camera.camera3D.rotation);
        view.controls.camera.updateMatrix();
        // view.controls.camera.rotation.
    }

    function computeDistanceToGround() {
        // view.controls.getCameraCoordinate().altitude updates are not triggered
        const vectorPostion = new THREE.Vector3().setFromMatrixPosition(view.camera.camera3D.matrixWorld);
        const coordsCamera = new Coordinates(view.referenceCrs, vectorPostion.x, vectorPostion.y, vectorPostion.z);
        const elevation = DEMUtils.getElevationValueAt(view.tileLayer, coordsCamera, DEMUtils.PRECISE_READ_Z);
        const coords = coordsCamera.as(view.controls.getCameraCoordinate().crs);
        view.camera.elevationToGround = coords.altitude - elevation;
        view.camera.testPosition = vectorPostion;
        view.camera.projectedCoordinates = coords;
    }

    function updateFarDistance() {
        view.camera.camera3D.far =  Math.min(Math.max(view.camera.elevationToGround * 1000, 10000), 100000);
        view.camera.camera3D.updateProjectionMatrix();
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
                } else if (controller.lastButtonItem === button && controller.lastButtonItem) {
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


