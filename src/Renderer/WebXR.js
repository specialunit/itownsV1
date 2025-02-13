import * as THREE from 'three';
import { VRControls } from 'Main.js';

// TODO handle xr session end

/**
 *
 * @param {*} view  current view
 * @param {*} options controllers, callback
 */
const initializeWebXR = (view, options) => {
    const xr = view.renderer.xr;
    xr.enabled = true;

    xr.addEventListener('sessionstart', () => {
        let vrControls;

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

        if (options.controllers) {
            vrControls = new VRControls(view, vrHeadSet);
        }

        // TODO Fix asynchronization between xr and MainLoop render loops.
        // (see MainLoop#scheduleViewUpdate).
        xr.setAnimationLoop((timestamp) => {
            if (xr.isPresenting && xr.getCamera().cameras.length > 0) {
                // TODO should be called only once, but the first values are wrong because the camL&camR weren't updated
                updateCamera3D();

                // This will also update the controllers position
                vrHeadSet.updateMatrixWorld(true);

                if (vrControls) {
                    vrControls.listenGamepad();
                }

                if (options.callback) {
                    options.callback();
                }
            }
            view.mainLoop.step(view, timestamp);
        });
    });

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


