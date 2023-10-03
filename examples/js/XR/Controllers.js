
const Controllers = {};

var renderer;

Controllers.addControllers = function() {
    renderer = view.mainLoop.gfxEngine.renderer;
    
    console.log('coucou');
    var controller1 = bindListeners(0);
    var controller2 = bindListeners(1);
    controller1.addEventListener('itowns-xr-axes-changed', onLeftAxisChanged);
    controller2.addEventListener('itowns-xr-axes-changed', onRightAxisChanged);
    controller2.addEventListener('itowns-xr-axes-stop', onRightAxisStop);
    controller2.addEventListener('itowns-xr-button-pressed', onRightButtonPressed);
    controller1.addEventListener('itowns-xr-button-pressed', onLeftButtonPressed);

    var cameraRightCtrl = new itowns.THREE.PerspectiveCamera(view.camera.camera3D.fov);
    cameraRightCtrl.position.copy(view.camera.camera3D.position);
    var cameraRighthelper = new itowns.THREE.CameraHelper( cameraRightCtrl );
    view.scene.add(cameraRighthelper);
    contextXR.cameraRightGrp = { camera : cameraRightCtrl, cameraHelper : cameraRighthelper };
    contextXR.controller1 = controller1;
    contextXR.controller2 = controller2;
}

function bindListeners(index) {
    const controller = renderer.xr.getController(index);
    controller.addEventListener( 'selectstart', onSelectStart );
    controller.addEventListener( 'selectend', onSelectEnd );
    return controller;
}

function onSelectStart() {
    this.userData.isSelecting = true;
}

function onSelectEnd() {
    this.userData.isSelecting = false;
    if ( contextXR.coordOnCamera ) {
        const offsetRotation = getGeodesicalQuaternion();
        const projectedCoordinate = contextXR.coordOnCamera.as(view.referenceCrs);
        XRUtils.showPosition('intersect', projectedCoordinate, 0x0000ff);
        // reset continuous translation applied to headSet parent.
        contextXR.xrHeadSet.position.copy(new itowns.THREE.Vector3());

       // compute targeted position relative to the origine camera.
        const trans = new itowns.THREE.Vector3(projectedCoordinate.x, projectedCoordinate.y, projectedCoordinate.z).multiplyScalar(-1).applyQuaternion(offsetRotation);
        const transform = new XRRigidTransform( trans, offsetRotation );
        const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace( transform );
        renderer.xr.setReferenceSpace( teleportSpaceOffset );
    }
}


function getGeodesicalQuaternion() {
    //TODO can be optimized with better cache
    const position = view.controls.getCameraCoordinate().clone().as(view.referenceCrs);
    const geodesicNormal = new itowns.THREE.Quaternion().setFromUnitVectors(new itowns.THREE.Vector3(0, 0, 1), position.geodesicNormal).invert();
    return new itowns.THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
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


function applyRotation(ctrl) {
    if(ctrl.gamepad.axes[2] === 0) {
        return;
    }
    contextXR.deltaRotation += Math.PI / (160 * ctrl.gamepad.axes[2]);
    const offsetRotation = getGeodesicalQuaternion();
    var thetaRotMatrix = new itowns.THREE.Matrix4().identity().makeRotationY(contextXR.deltaRotation);
    var rotationQuartenion = new itowns.THREE.Quaternion().setFromRotationMatrix(thetaRotMatrix).normalize();
    offsetRotation.premultiply(rotationQuartenion);
    const trans = view.camera.camera3D.position.clone().multiplyScalar(-1).applyQuaternion(offsetRotation);
    const transform = new XRRigidTransform( trans, offsetRotation );
    const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace( transform );
    renderer.xr.setReferenceSpace( teleportSpaceOffset );
}

function udpateCameraElevationLive(ctrl) {
    if(ctrl.gamepad.axes[3] === 0) {
        return;
    }
    var speed = ctrl.gamepad.axes[3] * 100;
    var direction = view.controls.getCameraCoordinate().geodesicNormal.clone();
    direction.multiplyScalar(-speed);
    contextXR.xrHeadSet.position.add(direction);
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

    if (ctrl.gamepad.axes[3] !== 0) {
        // flying following the locked camera look at
        // TODO itowns.camera.adjustAltitudeToAvoidCollisionWithLayer() to avoid collision
        var speed = ctrl.gamepad.axes[3] * 100;
        
        directionY = new itowns.THREE.Vector3(0,0,1).applyMatrix4(ctrl.flyDirectionMatrix).multiplyScalar(speed);
    } 
    if (ctrl.gamepad.axes[2] !== 0) {
        var speed = ctrl.gamepad.axes[2] * 100;
        
        directionX = new itowns.THREE.Vector3(1,0,0).applyMatrix4(ctrl.flyDirectionMatrix).multiplyScalar(speed);
        
    }
    contextXR.xrHeadSet.position.add(directionX.add(directionY));
}

function onRightAxisStop(data) {
    // camera fly reset
    data.message.controller.flyDirectionMatrix = undefined;
}