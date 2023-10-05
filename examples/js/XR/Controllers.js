
const Controllers = {};

var renderer;

// move clipped to a fixed altitude
var clipToground = false;

const minDeltaAltitude = 1.8;

// TODO cache geodesicQuat

/**
 * Controller.userData {
 *  isSelecting
 *  lockedTeleportPosition
 * }
 * requires a contextXR variable.
 */
Controllers.addControllers = function() {
    renderer = view.mainLoop.gfxEngine.renderer;
    var controller1 = bindListeners(0);
    var controller2 = bindListeners(1);
    controller1.addEventListener('itowns-xr-axes-changed', onLeftAxisChanged);
    controller2.addEventListener('itowns-xr-axes-changed', onRightAxisChanged);
    controller2.addEventListener('itowns-xr-axes-stop', onRightAxisStop);
    controller2.addEventListener('itowns-xr-button-pressed', onRightButtonPressed);
    controller1.addEventListener('itowns-xr-button-pressed', onLeftButtonPressed);
    controller1.addEventListener( 'selectstart', onSelectLeftStart );
    controller1.addEventListener( 'selectend', onSelectLeftEnd );
    controller2.addEventListener( 'selectstart', onSelectRightStart );
    controller2.addEventListener( 'selectend', onSelectRightEnd );


    var cameraRightCtrl = new itowns.THREE.PerspectiveCamera(view.camera.camera3D.fov);
    cameraRightCtrl.position.copy(view.camera.camera3D.position);
    var cameraRighthelper = new itowns.THREE.CameraHelper(cameraRightCtrl);
    view.scene.add(cameraRighthelper);
    contextXR.cameraRightGrp = { camera : cameraRightCtrl, cameraHelper : cameraRighthelper };
    
    contextXR.controller1 = controller1;
    contextXR.controller2 = controller2;
}

Controllers.getGeodesicalQuaternion = function() {
    //TODO can be optimized with better cache
    const position = view.controls.getCameraCoordinate().clone().as(view.referenceCrs);
    const geodesicNormal = new itowns.THREE.Quaternion().setFromUnitVectors(new itowns.THREE.Vector3(0, 0, 1), position.geodesicNormal).invert();
    return new itowns.THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
}

function bindListeners(index) {
    const controller = renderer.xr.getController(index);
    return controller;
}

function applyTransformationToXR(trans, offsetRotation) {
    const transCoordinate = new itowns.Coordinates(view.referenceCrs, trans.x, trans.y, trans.z);
    const terrainElevation = itowns.DEMUtils.getElevationValueAt(view.tileLayer, transCoordinate, itowns.DEMUtils.PRECISE_READ_Z);
    if(!terrainElevation) {
        console.error('no elevation intersection possible');
        return;
    }
    const coordsProjected = transCoordinate.as(view.controls.getCameraCoordinate().crs);
    if (clipToground || (coordsProjected.altitude - terrainElevation) - minDeltaAltitude <= 0) {
        clipToground = true;
        coordsProjected.altitude = terrainElevation + minDeltaAltitude;
    }
    trans = coordsProjected.as(view.referenceCrs).toVector3();

    trans = trans.multiplyScalar(-1).applyQuaternion(offsetRotation);
    const transform = new XRRigidTransform(trans, offsetRotation);
    const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace(transform);
    renderer.xr.setReferenceSpace(teleportSpaceOffset);
}

function onSelectRightStart() {
    this.userData.isSelecting = true;
}

function onSelectLeftStart() {
    // nothing yet needed
}

function onSelectRightEnd() { // if locked, should I do a second click to validate as we are locked ?
    if(!this.userData.isSelecting) {
        // if has been aborted
        return;
    }
    this.userData.isSelecting = false;
    this.userData.lockedTeleportPosition = false;
    if ( contextXR.coordOnCamera ) {
        const offsetRotation = Controllers.getGeodesicalQuaternion();
        const projectedCoordinate = contextXR.coordOnCamera.as(view.referenceCrs);
        XRUtils.showPosition('intersect', projectedCoordinate, 0x0000ff);
        // reset continuous translation applied to headSet parent.
        contextXR.xrHeadSet.position.copy(new itowns.THREE.Vector3());

       // compute targeted position relative to the origine camera.
        const trans = new itowns.THREE.Vector3(projectedCoordinate.x, projectedCoordinate.y, projectedCoordinate.z);
        applyTransformationToXR(trans, offsetRotation);
    }
}

/**
 * first left click while right selecting locks the teleportation target
 * Second left click cancels teleportation target.
 */
function onSelectLeftEnd() {
    if (contextXR.controller2.userData.lockedTeleportPosition) {
        contextXR.controller2.userData.isSelecting = false;
    }
    if (contextXR.controller2.userData.isSelecting) {
        contextXR.controller2.userData.lockedTeleportPosition = true;
    }
}

function onRightButtonPressed(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    var ctrl = data.message.controller;
    if (data.message.buttonIndex === 1) {
        // activate vertical adjustment
        udpateCameraElevationLive(ctrl);
    }
}


function onLeftButtonPressed(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    var ctrl = data.message.controller;
    if (data.message.buttonIndex === 1) {
        // activate vertical adjustment
     //   setCameraTocontroller();
    }
}
   /**
function setCameraTocontroller() {
 
    //TODO debug this
    if(!contextXR.controllerCameraRelativePos) {
        contextXR.originalPosition = contextXR.cameraRightGrp.camera.position.clone();
        contextXR.controllerCameraRelativePos = contextXR.cameraRightGrp.camera.position.clone().sub(view.camera.camera3D.position);
    } else {
        contextXR.controllerCameraRelativePos = contextXR.originalPosition.clone().sub(view.camera.camera3D.position);
    }
    var quat = new itowns.THREE.Quaternion().setFromEuler(contextXR.cameraRightGrp.camera.rotation);
    
    const transform = new XRRigidTransform( contextXR.originalPosition.clone().add(contextXR.controllerCameraRelativePos).applyQuaternion(quat), quat );
    const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace( transform );
    renderer.xr.setReferenceSpace( teleportSpaceOffset );
}*/

// rotation controls
function onLeftAxisChanged(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    var ctrl = data.message.controller;
    if ( contextXR.INTERSECTION ) {
        
    } else {
        applyRotation(ctrl);
    } 
}

function getSpeedFactor() {
    var speedFactor = Math.min(Math.max(view.camera.elevationToGround / 10, 5), 2000);
    return speedFactor;
}


function applyRotation(ctrl) {
    if(ctrl.gamepad.axes[2] === 0) {
        return;
    }
    contextXR.deltaRotation += Math.PI / (160 * ctrl.gamepad.axes[2]);
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    var thetaRotMatrix = new itowns.THREE.Matrix4().identity().makeRotationY(contextXR.deltaRotation);
    var rotationQuartenion = new itowns.THREE.Quaternion().setFromRotationMatrix(thetaRotMatrix).normalize();
    offsetRotation.premultiply(rotationQuartenion);
    const trans = view.camera.camera3D.position.clone();
    applyTransformationToXR(trans, offsetRotation);
}

function udpateCameraElevationLive(ctrl) {
    if(ctrl.gamepad.axes[3] === 0) {
        return;
    }
    // disable clip to ground
    clipToground = false;
    var speedFactor = getSpeedFactor();
    var speed = ctrl.gamepad.axes[3] * speedFactor;
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    var direction = view.controls.getCameraCoordinate().geodesicNormal.clone();
    direction.multiplyScalar(-speed);
    const trans = view.camera.camera3D.position.clone().add(direction);
    applyTransformationToXR(trans, offsetRotation);
}


// translation controls
function onRightAxisChanged(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    var ctrl = data.message.controller;
    if (ctrl.lockButtonIndex) {
        return;
    }
    if ( contextXR.INTERSECTION ) {
        //updating elevation at intersection destination
        contextXR.deltaAltitude -= ctrl.gamepad.axes[3] * 100;
    } else {
        cameraOnFly(ctrl);
    }
}


function cameraOnFly(ctrl) {
    if (!ctrl.flyDirectionMatrix) {
        // locking camera look at
        var matrixHeadset = new itowns.THREE.Matrix4();
        matrixHeadset.identity().extractRotation( view.camera.camera3D.matrixWorld );
        ctrl.flyDirectionMatrix = matrixHeadset;
    }
    if (ctrl.gamepad.axes[2] === 0 && ctrl.gamepad.axes[3] === 0) {
        return;
    }
    var directionX = new itowns.THREE.Vector3();
    var directionY = new itowns.THREE.Vector3();
    var speedFactor = getSpeedFactor();
    if (ctrl.gamepad.axes[3] !== 0) {
        // flying following the locked camera look at
        var speed = ctrl.gamepad.axes[3] * speedFactor;
        directionY = new itowns.THREE.Vector3(0,0,1).applyMatrix4(ctrl.flyDirectionMatrix).multiplyScalar(speed);
    } 
    if (ctrl.gamepad.axes[2] !== 0) {
        var speed = ctrl.gamepad.axes[2] * speedFactor;
        directionX = new itowns.THREE.Vector3(1,0,0).applyMatrix4(ctrl.flyDirectionMatrix).multiplyScalar(speed);
    }
    
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    const trans = view.camera.camera3D.position.clone().add(directionX.add(directionY));
    applyTransformationToXR(trans, offsetRotation);
}

function onRightAxisStop(data) {
    // camera fly reset
    data.message.controller.flyDirectionMatrix = undefined;
}