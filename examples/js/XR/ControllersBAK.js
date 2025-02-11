const Controllers = {};

let renderer;


Controllers.MIN_DELTA_ALTITUDE = 1.8;




// hack mode switch between navigation Mode
let isMovingLeft = false;
let isMovingRight = false;

let view;
let controller1;
let controller2;
const cache = {};
let groupXR;

/**
 * Controller.userData {
 *  isSelecting
 *  lockedTeleportPosition
 * }
 * requires a contextXR variable.
 * @param {*} _view itowns view object
 */
Controllers.addControllers = (_view) => {
    view = _view;
    groupXR = _view._camXR.parent;
    // vrHeadSet = view.camXR.parent;
    renderer = view.mainLoop.gfxEngine.renderer;
    controller1 = bindListeners(0);
    controller2 = bindListeners(1);
    controller1.addEventListener('itowns-xr-axes-changed', onLeftAxisChanged);
    controller2.addEventListener('itowns-xr-axes-changed', onRightAxisChanged);
    controller2.addEventListener('itowns-xr-axes-stop', onRightAxisStop);
    controller1.addEventListener('itowns-xr-axes-stop', onLeftAxisStop);
    controller2.addEventListener('itowns-xr-button-pressed', onRightButtonPressed);
    controller1.addEventListener('itowns-xr-button-pressed', onLeftButtonPressed);
    controller1.addEventListener('itowns-xr-button-released', onLeftButtonReleased);
    controller2.addEventListener('itowns-xr-button-released', onRightButtonReleased);
    controller1.addEventListener('selectstart', onSelectLeftStart);
    controller1.addEventListener('selectend', onSelectLeftEnd);
    controller2.addEventListener('selectstart', onSelectRightStart);
    controller2.addEventListener('selectend', onSelectRightEnd);



    // init cache
    cache.position = null;
    cache.isFixedPosition = false;
};



function bindListeners(index) {
    return renderer.xr.getController(index);
}

function clampAndApplyTransformationToXR(trans, offsetRotation) {
    const transClamped = clampToGround(trans);
    applyTransformationToXR(transClamped, offsetRotation);
}


function applyTransformationToXR(trans, offsetRotation) {

    if (!offsetRotation) {
        console.error('missing rotation quaternion');
        offsetRotation = groupXR.quaternion;
        // return;
    }
    if (!trans) {
        console.error('missing translation vector');
        return;
    }


    groupXR.position.copy(trans);
    groupXR.quaternion.copy(offsetRotation);
    groupXR.updateMatrixWorld(true);
}

/**
 * Clamp camera to ground if option {clipToground} is active
 * @param {Vector3} trans
 * @returns {Vector3} coordinates clamped to ground
 */
function clampToGround(trans) {
    const transCoordinate = new itowns.Coordinates(view.referenceCrs, trans.x, trans.y, trans.z);
    const terrainElevation = itowns.DEMUtils.getElevationValueAt(view.tileLayer, transCoordinate, itowns.DEMUtils.PRECISE_READ_Z) || 0;
    if (terrainElevation == null) {
        console.error('no elevation intersection possible');
        return;
    }
    const coordsProjected = transCoordinate.as(view.controls.getCameraCoordinate().crs);
    // const coordsProjected = transCoordinate.as(new itowns.Coordinates('EPSG:4978', renderer.xr.getCamera().position).as('EPSG:4326').crs);
    if (coordsProjected.altitude - terrainElevation - Controllers.MIN_DELTA_ALTITUDE <= 0) {
        coordsProjected.altitude = terrainElevation + Controllers.MIN_DELTA_ALTITUDE;
    }
    return coordsProjected.as(view.referenceCrs).toVector3();
}



function getSpeedFactor() {
    const speedFactor = Math.min(Math.max(view.controls.getCameraCoordinate().altitude / 50, 2), 2000);
    return speedFactor * 10;    //  todo remove *10
}


function getRotationYaw(axisValue) {
    // Get the current XR group orientation
    const baseOrientation = groupXR.quaternion.clone();
    // const baseOrientation = view.renderer.xr.getCamera().quaternion.clone().normalize();
    // const baseOrientation = view.camera3D.quaternion.clone().normalize();

    //  Don't use the directly the camera
    let deltaRotation = 0;
    // Update deltaRotation based on the controller’s axis input
    if (axisValue) {
        deltaRotation = -Math.PI * axisValue / 140; // Adjust sensitivity as needed
    }

    // Get the local “up” direction from the camera coordinate
    const cameraCoordinate = view.controls.getCameraCoordinate();
    const upAxis = cameraCoordinate.geodesicNormal.clone().normalize();

    // Create a quaternion for yaw rotation about the up axis
    const yawQuaternion = new itowns.THREE.Quaternion().setFromAxisAngle(upAxis, deltaRotation).normalize();

    // Apply yaw rotation to the current orientation
    baseOrientation.premultiply(yawQuaternion);

    return baseOrientation;
}

function getTranslationElevation(axisValue, speedFactor) {
    const speed = axisValue * speedFactor;
    const direction = view.controls.getCameraCoordinate().geodesicNormal.clone();
    direction.multiplyScalar(-speed);
    return direction;
}

function cameraOnFly(ctrl) {
    if (!ctrl.flyDirectionQuat) {
        // locking camera look at (using camera3D get us the orientation on the headset)
        // FIXME using {view.camera3D.matrixWorld} or normalized quaternion produces the same effect and shift to the up direction
        ctrl.flyDirectionQuat = view.camera3D.quaternion.clone().normalize();

        // ctrl.flyDirectionQuat = new itowns.THREE.Quaternion();
        // view.renderer.xr.getCamera().getWorldQuaternion(ctrl.flyDirectionQuat);
        // ctrl.flyDirectionQuat = ctrl.flyDirectionQuat.normalize();

        console.log('fixing rotation quat', ctrl.flyDirectionQuat);
    }
    if (ctrl.gamepad.axes[2] === 0 && ctrl.gamepad.axes[3] === 0) {
        return;
    }
    let directionX = new itowns.THREE.Vector3();
    let directionZ = new itowns.THREE.Vector3();
    const speedFactor = getSpeedFactor();
    if (ctrl.gamepad.axes[3] !== 0) {
        // flying following the locked camera look at
        const speed = ctrl.gamepad.axes[3] * speedFactor;
        directionZ = new itowns.THREE.Vector3(0, 0, 1).applyQuaternion(ctrl.flyDirectionQuat).multiplyScalar(speed);
    }
    if (ctrl.gamepad.axes[2] !== 0) {
        const speed = ctrl.gamepad.axes[2] * speedFactor;
        directionX = new itowns.THREE.Vector3(1, 0, 0).applyQuaternion(ctrl.flyDirectionQuat).multiplyScalar(speed);
    }

    const offsetRotation = getRotationYaw();
    // Get the position of the XR group
    const trans = groupXR.position.clone().add(directionX.add(directionZ));

    // applyTransformationToXR(trans, offsetRotation);
    //
    clampAndApplyTransformationToXR(trans, offsetRotation);
}



/*
        Events functions
 */
// Function called when the right select ends
function onSelectRightEnd(ctrl) {
    // applyTeleportation(ctrl);
}

// Function called when the right select starts
function onSelectRightStart(ctrl) {
    ctrl.userData.isSelecting = true;
}

// Function called when the left select starts
function onSelectLeftStart(ctrl) {
    // nothing yet needed
}

// Function called when the left select ends
function onSelectLeftEnd(ctrl) {
    // First left click while right selecting locks the teleportation target.
    // Second left click cancels the teleportation target.
    if (controller2.userData.lockedTeleportPosition) {
        controller2.userData.isSelecting = false;
    }
    if (controller2.userData.isSelecting) {
        controller2.userData.lockedTeleportPosition = true;
    }
}

// Function called when the right button is pressed
function onRightButtonPressed(data) {
    const ctrl = data.message.controller;
    if (data.message.buttonIndex === 1) {
        // Activate vertical adjustment
        if (ctrl.gamepad.axes[3] === 0) {
            return;
        }
        const offsetRotation = getRotationYaw();
        const speedFactor = getSpeedFactor();
        const deltaTransl = getTranslationElevation(ctrl.gamepad.axes[3], speedFactor);
        // const trans = view.camera3D.position.clone().add(deltaTransl);
        // Get the position of the XR group
        const trans = groupXR.position.clone().add(deltaTransl);
        clampAndApplyTransformationToXR(trans, offsetRotation);
    }
}

// Function called when the left button is pressed
function onLeftButtonPressed(data) {
    // No operation currently defined.

}

// Function called when the right axis changes
function onRightAxisChanged(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    if (!isMovingRight) {
        isMovingRight = true;
        console.log('starting right stick');
    }
    const ctrl = data.message.controller;
    // Translation controls: ignore if the controller has a lock button active.
    if (ctrl.lockButtonIndex) {
        return;
    }

    cameraOnFly(ctrl);
}

// Function called when the left axis changes
function onLeftAxisChanged(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    if (!isMovingLeft) {
        isMovingLeft = true;
        console.log('starting left stick');
    }


    const ctrl = data.message.controller;
    // Rotation controls

    // Determine the translation based on the cache status
    let trans = cache.isFixedPosition
        ? cache.position.clone()
        : view.camera3D.position.clone();

    // If not moving right and position is not fixed, fix the camera position in cache
    if (!isMovingRight && !cache.isFixedPosition) {
        cache.position = view.camera3D.position.clone();
        trans = view.camera3D.position.clone();
        cache.isFixedPosition = true;
    }
    const quat = getRotationYaw(ctrl.gamepad.axes[2]);
    applyTransformationToXR(trans, quat);
}

// Function called when the right axis stops changing
function onRightAxisStop(data) {
    // camera fly reset
    data.message.controller.flyDirectionQuat = undefined;
    console.log('stopping right stick, reset fixed Quat');
    isMovingRight = false;
}

// Function called when the left axis stops changing
function onLeftAxisStop(data) {
    isMovingLeft = false;

    cache.isFixedPosition = false;
}

// Function called when the right button is released
function onRightButtonReleased(data) {
    // No operation currently defined.
}

// Function called when the left button is released
function onLeftButtonReleased(data) {
    // No operation currently defined.
}











