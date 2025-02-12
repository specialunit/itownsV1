import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import { DEMUtils } from 'Main.js';


/**
 * Controller.userData {
 *   isSelecting,
 *  lockedTeleportPosition
 * }
 * Requires a contextXR variable.
 * @param {*} _view itowns view object
 */
class VRControls {
    static MIN_DELTA_ALTITUDE = 1.8;

    constructor(_view, _groupXR = {}) {
    // Store instance references.
        this.view = _view;
        this.groupXR = _groupXR;
        this.renderer = _view.mainLoop.gfxEngine.renderer;

        this.rightButtonPressed = false;

        // Initialize controllers
        this.controller1 = this.bindListeners(0);
        this.controller2 = this.bindListeners(1);

        // Event listeners
        this.setupEventListeners();
    }

    // Static factory method:
    static init(view, vrHeadSet) {
        return new VRControls(view, vrHeadSet);
    }
    // Register event listeners for controllers.
    setupEventListeners() {
        this.controller1.addEventListener('itowns-xr-axes-changed', e => this.onLeftAxisChanged(e));
        this.controller2.addEventListener('itowns-xr-axes-changed', e => this.onRightAxisChanged(e));
        this.controller2.addEventListener('itowns-xr-axes-stop', e => this.onRightAxisStop(e));
        this.controller1.addEventListener('itowns-xr-axes-stop', e => this.onLeftAxisStop(e));
        this.controller2.addEventListener('itowns-xr-button-pressed', e => this.onRightButtonPressed(e));
        this.controller1.addEventListener('itowns-xr-button-pressed', e => this.onLeftButtonPressed(e));
        this.controller1.addEventListener('itowns-xr-button-released', e => this.onLeftButtonReleased(e));
        this.controller2.addEventListener('itowns-xr-button-released', e => this.onRightButtonReleased(e));
        this.controller1.addEventListener('selectstart', e => this.onSelectLeftStart(e));
        this.controller1.addEventListener('selectend', e => this.onSelectLeftEnd(e));
        this.controller2.addEventListener('selectstart', e => this.onSelectRightStart(e));
        this.controller2.addEventListener('selectend', e => this.onSelectRightEnd(e));
    }

    // Helper method to bind a controller listener.
    bindListeners(index) {
        return this.renderer.xr.getController(index);
    }

    // Clamp a translation to ground and then apply the transformation.
    clampAndApplyTransformationToXR(trans, offsetRotation) {
        const transClamped = this.clampToGround(trans);
        this.applyTransformationToXR(transClamped, offsetRotation);
    }

    // Apply a translation and rotation to the XR group.
    applyTransformationToXR(trans, offsetRotation) {
        if (!offsetRotation) {
            console.error('missing rotation quaternion');
            offsetRotation = this.groupXR.quaternion;
        }

        if (!trans) {
            console.error('missing translation vector');
            return;
        }

        this.groupXR.position.copy(trans);
        this.groupXR.quaternion.copy(offsetRotation);
        this.groupXR.updateMatrixWorld(true);
    }

    /**
   * Clamp the given translation vector so that the camera remains at or above ground level.
   * @param {Vector3} trans - The translation vector.
   * @returns {Vector3} The clamped coordinates as a Vector3.
   */
    clampToGround(trans) {
        const transCoordinate = new Coordinates(
            this.view.referenceCrs,
            trans.x,
            trans.y,
            trans.z,
        );

        const terrainElevation = DEMUtils.getElevationValueAt(
            this.view.tileLayer,
            transCoordinate,
            DEMUtils.PRECISE_READ_Z,
        ) || 0;

        if (terrainElevation == null) {
            console.error('no elevation intersection possible');
            return trans;
        }

        const coordsProjected = transCoordinate.as(this.view.controls.getCameraCoordinate().crs);
        if (coordsProjected.altitude - terrainElevation - VRControls.MIN_DELTA_ALTITUDE <= 0) {
            coordsProjected.altitude = terrainElevation + VRControls.MIN_DELTA_ALTITUDE;
        }

        return coordsProjected.as(this.view.referenceCrs).toVector3();
    }

    // Calculate a speed factor based on the camera's altitude.
    getSpeedFactor() {
        const altitude = this.view.controls.getCameraCoordinate().altitude;

        const speedFactor = Math.min(Math.max(altitude / 50, 2), 2000);
        return speedFactor * 10; // TODO: Adjust or remove the *10 multiplier if needed.
    }

    // Calculate a yaw rotation quaternion based on an axis value.
    getRotationYaw(axisValue) {
        // Clone the current XR group's orientation.
        const baseOrientation = this.groupXR.quaternion.clone().normalize();
        let deltaRotation = 0;

        if (axisValue) {
            deltaRotation = -Math.PI * axisValue / 140; // Adjust sensitivity as needed.
        }
        // Get the "up" direction from the camera coordinate.
        const cameraCoordinate = this.view.controls.getCameraCoordinate();
        const upAxis = cameraCoordinate.geodesicNormal.clone().normalize();
        // Create a quaternion representing a yaw rotation about the up axis.
        const yawQuaternion = new THREE.Quaternion()
            .setFromAxisAngle(upAxis, deltaRotation)
            .normalize();
        // Apply the yaw rotation.
        baseOrientation.premultiply(yawQuaternion);
        return baseOrientation;
    }

    // Compute a translation vector for vertical adjustment.
    getTranslationElevation(axisValue, speedFactor) {
        const speed = axisValue * speedFactor;
        const direction = this.view.controls.getCameraCoordinate().geodesicNormal.clone();
        direction.multiplyScalar(-speed);
        return direction;
    }

    // Handles camera flying based on controller input.
    cameraOnFly(ctrl) {
        if (ctrl.gamepad.axes[2] === 0 && ctrl.gamepad.axes[3] === 0) {
            return;
        }
        let directionX = new THREE.Vector3();
        let directionZ = new THREE.Vector3();
        const speedFactor = this.getSpeedFactor();
        if (ctrl.gamepad.axes[3] !== 0) {
            const speed = ctrl.gamepad.axes[3] * speedFactor;
            directionZ = new THREE.Vector3(0, 0, 1)
                .applyQuaternion(this.view.camera3D.quaternion.clone().normalize())
                .multiplyScalar(speed);
        }
        if (ctrl.gamepad.axes[2] !== 0) {
            const speed = ctrl.gamepad.axes[2] * speedFactor;
            directionX = new THREE.Vector3(1, 0, 0)
                .applyQuaternion(this.view.camera3D.quaternion.clone().normalize())
                .multiplyScalar(speed);
        }
        const offsetRotation = this.getRotationYaw();
        const trans = this.groupXR.position.clone().add(directionX.add(directionZ));
        this.clampAndApplyTransformationToXR(trans, offsetRotation);
    }

    /* =======================
     Event Handler Methods
     ======================= */

    // Right select ends.
    onSelectRightEnd(data) {
    // Uncomment and implement teleportation if needed:
    }

    // Right select starts.
    onSelectRightStart(data) {
    // No operation needed yet.
    }

    // Left select starts.
    onSelectLeftStart(data) {
    // No operation needed yet.
    }

    // Left select ends.
    onSelectLeftEnd(data) {
        // No operation needed yet.
    }

    // Right button pressed.
    onRightButtonPressed(data) {
        const ctrl = data.message.controller;
        if (data.message.buttonIndex === 1) {
            // Activate vertical adjustment.
            if (ctrl.gamepad.axes[3] === 0) {
                return;
            }
            this.rightButtonPressed = true;


            // const offsetRotation = this.getRotationYaw();
            // const speedFactor = this.getSpeedFactor();
            // const deltaTransl = this.getTranslationElevation(ctrl.gamepad.axes[3], speedFactor);
            // const trans = this.groupXR.position.clone().add(deltaTransl);
            // this.clampAndApplyTransformationToXR(trans, offsetRotation);
        }
    }

    // Left button pressed.
    onLeftButtonPressed(data) {
    // No operation defined.
    }

    // Right axis changed.
    onRightAxisChanged(data) {
        if (data.target.name !== 'rightController') {
            return;
        }
        const ctrl = data.message.controller;
        //  Check if GRIP is pressed
        if (this.rightButtonPressed) {
            const offsetRotation = this.getRotationYaw();
            const speedFactor = this.getSpeedFactor();
            const deltaTransl = this.getTranslationElevation(ctrl.gamepad.axes[3], speedFactor);
            const trans = this.groupXR.position.clone().add(deltaTransl);
            this.clampAndApplyTransformationToXR(trans, offsetRotation);
        } else {
            this.cameraOnFly(ctrl);
        }
    }

    // Left axis changed.
    onLeftAxisChanged(data) {
        if (data.target.name !== 'leftController') {
            return;
        }
        const ctrl = data.message.controller;
        const trans = this.groupXR.position.clone();

        const quat = this.getRotationYaw(ctrl.gamepad.axes[2]);
        this.applyTransformationToXR(trans, quat);
    }

    // Right axis stops.
    onRightAxisStop(data) {
        // No operation defined.
    }

    // Left axis stops.
    onLeftAxisStop(data) {
        // No operation defined.
    }

    // Right button released.
    onRightButtonReleased(data) {
    // No operation defined.
        console.log('eeeeeeeeeeee');
        this.rightButtonPressed = false;
    }

    // Left button released.
    onLeftButtonReleased(data) {
    // No operation defined.
    }
}

export default VRControls;

