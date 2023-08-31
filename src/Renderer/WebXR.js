import * as THREE from 'three';
import { XRControllerModelFactory } from  'ThreeExtended/webxr/XRControllerModelFactory';

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

        const xrControllers = initControllers(webXRManager);

        view.scene.scale.multiplyScalar(scale);
        view.scene.updateMatrixWorld();
        xr.enabled = true;
        xr.getReferenceSpace('local');
         view.camera.camera3D.position.multiplyScalar(scale);
         view.camera.camera3D.updateMatrixWorld();

        const position = view.camera.position();
        view.camera.initialPosition = position.clone();
        const geodesicNormal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.geodesicNormal).invert();

        const quat = new THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
        // https://github.com/immersive-web/webxr/issues/1236 for high position value
        const trans = camera.position.clone().multiplyScalar(-scale).applyQuaternion(quat);
        const transform = new XRRigidTransform(trans, quat);
        // here position seems ok {x: 4485948.637198923, y: 476198.0416370128, z: 4497216.056600053, w: 1}

        const baseReferenceSpace = xr.getReferenceSpace();
        const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);
        // there it is not anymore : originOffset Matrix is :  4485948.5, 476198.03125, 4497216

        xr.setReferenceSpace(teleportSpaceOffset);

        view.camera.camera3D = xr.getCamera();
        view.camera.camera3D.far = 20000000000;
        view.camera.resize(view.camera.width, view.camera.height);

        document.addEventListener('keydown', exitXRSession, false);

        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && view.camera.camera3D.cameras[0]) {
                if (options.callback) {
                    options.callback();
                }

                listenGamepad(xrControllers.left);
                listenGamepad(xrControllers.right);

                view.camera.camera3D.updateMatrix();
                view.camera.camera3D.updateMatrixWorld(true);

                if (view.scene.matrixWorldAutoUpdate === true) {
                    view.scene.updateMatrixWorld();
                }

                view.notifyChange(view.camera.camera3D, true);
            }

            view.mainLoop.step(view, timestamp);

        });
    });

    let endGamePadtrackEmit = false;

    /*
    Listening {XRInputSource} and emit changes for convenience user binding
    */
    function listenGamepad(controller) {
        if (controller.gamepad) {
            // gamepad.axes = [0, x, y, z];
            const gamepad = controller.gamepad;
            if (gamepad.axes.lastItem === 0 && endGamePadtrackEmit) {
                return;
            } else {
                endGamePadtrackEmit = false;
            }
            
            controller.dispatchEvent({ type: 'itowns-xr-axes-changed', message: { controller } });
            controller.lastAxisItem = gamepad.axes.lastItem;
            controller.lastAxisIndex = gamepad.axes.lastIndex;
            if (gamepad.axes.lastItem === 0) {
                endGamePadtrackEmit = true;
            }

            for (const [index, button] of gamepad.buttons.entries()) {
                if (button.pressed) {
                    // 0 - gachette index
                    // 1 - gachette majeur
                    // 3 - stick pressed
                    // 4 - botton button
                    // 5 - upper button
                    controller.dispatchEvent({ type: 'itowns-xr-button-pressed', message: { buttonIndex: index, button } });
                        controller.lastButtonItem = gamepad.lastItem;
                }
                if (button.touched) {
                    // triggered really often
                }
            }
        }
    }

    function initControllers(webXRManager) {
        const controllerModelFactory = new XRControllerModelFactory();
        const leftController = webXRManager.getController(0);
        leftController.name = 'leftController';
        const rightController = webXRManager.getController(1);
        rightController.name = 'rightController';
        bindControllerListeners(leftController);
        bindControllerListeners(rightController);
        const leftGripController = webXRManager.getControllerGrip(0);
        leftGripController.name = 'leftGripController';
        const rightGripController = webXRManager.getControllerGrip(1);
        rightGripController.name = 'rightGripController';
        bindGripController(controllerModelFactory, leftGripController);
        bindGripController(controllerModelFactory, rightGripController);
        view.scene.add(new THREE.HemisphereLight(0xa5a5a5, 0x898989, 3));
        return { left: leftController, right: rightController };
    }

    function bindControllerListeners(controller) {
        controller.addEventListener('disconnected', function removeCtrl() {
            this.remove(this.children[0]);
        });
        controller.addEventListener('connected', function addCtrl(event) {
            this.add(buildController(event.data));
            // {XRInputSource} event.data
            controller.gamepad = event.data.gamepad;
        });
        // controller.matrix.makeScale(scale, scale, scale);
        view.scene.add(controller);
    }

    function bindGripController(controllerModelFactory, gripController) {
        gripController.add(controllerModelFactory.createControllerModel(gripController));
        view.scene.add(gripController);
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


