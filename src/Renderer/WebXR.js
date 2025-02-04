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

        // view.scene.scale.multiplyScalar(scale);
        // view.scene.updateMatrixWorld();

        const xrControllers = initControllers(xr, vrHeadSet);

        const position = view.controls.getCameraCoordinate().as(view.referenceCrs);
        // To avoid controllers precision issues, headset should handle camera position and camera should be reset to origin
        view.scene.add(vrHeadSet);
        view.camera.camera3D.updateMatrixWorld(true);

        const matrixWorld = new Matrix4().copy(view.camera.camera3D.matrixWorld);
        //
        view.camera.camera3D.getWorldPosition(vrHeadSet.position);
        view.camera.camera3D.getWorldQuaternion(vrHeadSet.quaternion);
        // view.camera.camera3D.getWorldPosition(view.scene.position);
        // view.camera.camera3D.getWorldQuaternion(view.scene.quaternion);
        // view.scene.updateMatrixWorld( true );
        // // vrHeadSet.matrixWorld.copy( matrixWorld.invert() );
        //
        //
        // vrHeadSet.updateMatrixWorld( true );
        //


        xr.getReferenceSpace('local');

        // const geodesicNormal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.geodesicNormal);
        // // // const geodesicNormal = position.geodesicNormal;
        // // const quat = new THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
        // const quat = new THREE.Quaternion(0, 0, 0, 1).normalize();
        // // // https://github.com/immersive-web/webxr/issues/1236 for high position value
        // const trans = camera.position.clone().multiplyScalar(-scale).applyQuaternion(quat);
        // const transform = new XRRigidTransform(trans, quat);
        // const transform = new XRRigidTransform(new Vector3(4485948.637198923, 476198.0416370128, 4497216.056600053), quat);
        // const mat2 = new Float64Array(transform.matrix);
        // mat2[12] = 4485948.637198923;
        // mat2[13] = 476198.0416370128;
        // mat2[14] = 4497216.056600053;
        // const transform2 = {};
        // transform2.matrix = mat2;


        // here position seems ok {x: 4485948.637198923, y: 476198.0416370128, z: 4497216.056600053, w: 1}
        // const baseReferenceSpace = xr.getReferenceSpace();
        // const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);
        // // there it is not anymore : originOffset Matrix is :  4485948.5, 476198.03125, 4497216
        //
        // vrHeadSet.matrixWorld.copy( matrixWorld );
        //
        //
        //
        //
        // vrHeadSet.matrix.decompose( camera.position, camera.quaternion, camera.scale );
        // vrHeadSet.updateMatrixWorld( true );
        // vrHeadSet.position.set(4485948.637198923, 476198.0416370128, 4497216.056600053);


        // vrHeadSet.position.set(camera.position.x,camera.position.y, camera.position.z);
        // vrHeadSet.quaternion.set(quat);
        // vrHeadSet.updateMatrixWorld( true );

        // // // // Must delay replacement to allow user listening to sessionstart to get original ReferenceSpace
        // setTimeout(() => {
        // const baseReferenceSpace = xr.getReferenceSpace();
        // const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);
        //     // teleportSpaceOffset[Symbol(@@webxr-polyfill/XRReferenceSpace)].originOffset = transform2;
        // // // there it is not anymore : originOffset Matrix is :  4485948.5, 476198.03125, 4497216
        //     xr.setReferenceSpace(teleportSpaceOffset);
        //
        //     // does a regression over controller matrixWorld update...
        // });

        // view.camera.camera3D.getWorldPosition(xr.getCamera().position);
        // view.camera.camera3D.getWorldQuaternion(xr.getCamera().quaternion);
        // xr.getCamera().updateMatrixWorld( true );
        // xr.getCamera().name = "alala"
        // // view.camera.camera3D = xr.getCamera();
        //
        // // view.camera.cameraXR = xr.getCamera();
        // //
        vrHeadSet.add(xr.getCamera());
        // // xr.getCamera().matrixAutoUpdate = true;
        // // xr.getCamera().updateMatrixWorld( true );
        // // vrHeadSet.updateMatrix( true );
        // // vrHeadSet.updateMatrixWorld( true );
        //
        // view.camera.camera3D.far = 2000000;
        // view.camera.camera3D.near = 0.1;
        view.camera.camera3D.updateMatrixWorld(true);


        view.camXR = view.camera.camera3D.clone();      // placeholder camera to initialize correctly the vr, which needs a parent
        // view.camera.camera3D.fov = xr.getCamera().fov;
        // view.camXR.far = 100;
        // view.camera.resize(view.camera.width, view.camera.height);
        view.camXR.far = 2000000;
        view.camXR.near = 0.1;
        view.camXR.updateMatrixWorld(true);
        view.camXR.position.set(new THREE.Vector3());
        vrHeadSet.add(view.camXR);

        // vrHeadSet.add(view.camera.camera3D);
        //
        view.notifyChange();

        // view.camera.camera3D.projectionMatrix.copy( cameraXR.projectionMatrix );
        // view.camera.camera3D.projectionMatrixInverse.copy( cameraXR.projectionMatrixInverse );

        // view.camera.resize(view.camera.width, view.camera.height);
        // vrHeadSet.add(view.camera.camera3D);
        // cameraGroup.add(view.camera.camera3D);
        // view.scene.add(cameraGroup);
        // cameraGroup.position.set(initpos.x, initpos.y, initpos.z);
        // cameraGroup.rotation.set(0, 0, 0);
        // cameraGroup.lookAt(0, 0, 0);

        // document.addEventListener('keydown', exitXRSession, false);
        // view.notifyChange();
        // setTimeout(() => {
        //     view.controls.getLookAtCoordinate();
        //
        // });

        // let init = true;

        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && xr.getCamera().cameras.length > 0) {
                xr.getCamera().updateMatrixWorld(true);

                //  update itowns Camera
                // xr.getCamera().getWorldPosition(view.camera.camera3D.position);
                // xr.getCamera().getWorldQuaternion(view.camera.camera3D.quaternion);
                xr.getCamera().getWorldPosition(view.camera3D.position);
                xr.getCamera().getWorldQuaternion(view.camera3D.quaternion);
                //
                view.camera3D.near = xr.getCamera().near;
                view.camera3D.far = xr.getCamera().far;
                view.camera3D.fov = xr.getCamera().fov;
                view.camera3D.aspect = xr.getCamera().aspect;

                view.camera3D.projectionMatrix.copy(xr.getCamera().projectionMatrix);
                view.camera3D.updateProjectionMatrix();
                // const tempPos = new THREE.Vector3();
                // xr.getCamera().getWorldPosition(tempPos);
                //

                // view.camera3D.matrix.copy(xr.getCamera().matrixWorld);
                // view.camera3D.matrixWorld.copy(xr.getCamera().matrixWorld);
                // const posT = new Vector3();
                // xr.getCamera().getWorldPosition(posT);
                // view.camera3D.lookAt(posT);
                // Update the local transformation matrix for the object itself
                view.camera3D.updateMatrix();
                //
                // // Update the world transformation matrix, ensuring it reflects global transforms
                view.camera3D.updateMatrixWorld(true);



                // xr.getCamera().getWorldQuaternion(view.camera.camera3D.rotation);

                // view.camXR.getWorldPosition(view.camera.camera3D.position);
                // view.camXR.getWorldQuaternion(view.camera.camera3D.quaternion);
                // view.camera.camera3D.updateMatrixWorld(true);
                // view.camera3D.updateMatrixWorld(true);


                // // view.camera.camera3D = xr.getCamera().cameras[0];



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
                // if (options.callback) {
                //     options.callback();
                // }
                //

                if (view.scene.matrixWorldAutoUpdate === true) {
                    view.scene.updateMatrixWorld();
                }
                //
                view.notifyChange(vrHeadSet, true);
                view.notifyChange(view.camera.camera3D, true);
                // if (init) {
                //     init = false;
                //     view.controls.getLookAtCoordinate();
                // }
            }

            view.mainLoop.step(view, timestamp);
        });
        // });
        // });
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


