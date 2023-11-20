const Controllers = {};

var renderer;

// move clipped to a fixed altitude
var clipToground = false;

Controllers.MIN_DELTA_ALTITUDE = 1.8;

var deltaRotation = 0;

var startedPressButton = undefined;

var actionElevationPerformed = false;

// hack mode switch between navigation Mode
var rightCtrChangeNavMode = false;
var leftCtrChangeNavMode = false;
var alreadySwitched = false;
var navigationMode = [];
var currentNavigationModeIndex = 0;
// TODO cache geodesicQuat

/**
 * Controller.userData {
 *  isSelecting
 *  lockedTeleportPosition
 * }
 * requires a contextXR variable.
 */
Controllers.addControllers = function() {
    navigationMode.push(Mode1, Mode2);
    renderer = view.mainLoop.gfxEngine.renderer;
    var controller1 = bindListeners(0);
    var controller2 = bindListeners(1);
    controller1.addEventListener('itowns-xr-axes-changed', onLeftAxisChanged);
    controller2.addEventListener('itowns-xr-axes-changed', onRightAxisChanged);
    controller2.addEventListener('itowns-xr-axes-stop', onRightAxisStop);
    controller1.addEventListener('itowns-xr-axes-stop', onLeftAxisStop);
    controller2.addEventListener('itowns-xr-button-pressed', onRightButtonPressed);
    controller1.addEventListener('itowns-xr-button-pressed', onLeftButtonPressed);
    controller1.addEventListener('itowns-xr-button-released', onLeftButtonReleased);
    controller2.addEventListener('itowns-xr-button-released', onRightButtonReleased);
    controller1.addEventListener( 'selectstart', onSelectLeftStart);
    controller1.addEventListener( 'selectend', onSelectLeftEnd);
    controller2.addEventListener( 'selectstart', onSelectRightStart);
    controller2.addEventListener( 'selectend', onSelectRightEnd);

    var cameraRightCtrl = new itowns.THREE.PerspectiveCamera(view.camera.camera3D.fov);
    cameraRightCtrl.position.copy(view.camera.camera3D.position);
    var cameraRighthelper = new itowns.THREE.CameraHelper(cameraRightCtrl);

    XRUtils.addToScene (cameraRighthelper, true);

    
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
    return renderer.xr.getController(index);
}

function clampAndApplyTransformationToXR(trans, offsetRotation) {
    const transClamped = clampToGround(trans);
    applyTransformationToXR(transClamped, offsetRotation);
}


function applyTransformationToXR(trans, offsetRotation) {
    if(!offsetRotation){
        console.error('missing rotation quaternion');
        return;
    }
    if(!trans) {
        console.error('missing translation vector');
        return;
    }
    var finalTransformation = trans.multiplyScalar(-1).applyQuaternion(offsetRotation);
    const transform = new XRRigidTransform(finalTransformation, offsetRotation);
    const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace(transform);
    renderer.xr.setReferenceSpace(teleportSpaceOffset);
}

/**
 * Clamp camera to ground if option {clipToground} is active
 * @param {Vector3} trans 
 * @returns coordinates clamped to ground
 */
function clampToGround(trans) {
    const transCoordinate = new itowns.Coordinates(view.referenceCrs, trans.x, trans.y, trans.z);
    const terrainElevation = itowns.DEMUtils.getElevationValueAt(view.tileLayer, transCoordinate, itowns.DEMUtils.PRECISE_READ_Z);
    if(!terrainElevation) {
        console.error('no elevation intersection possible');
        return;
    }
    const coordsProjected = transCoordinate.as(view.controls.getCameraCoordinate().crs);
    if (clipToground || (coordsProjected.altitude - terrainElevation) - Controllers.MIN_DELTA_ALTITUDE <= 0) {
        clipToground = true;
        coordsProjected.altitude = terrainElevation + Controllers.MIN_DELTA_ALTITUDE;
    }
    return coordsProjected.as(view.referenceCrs).toVector3();
}

function onSelectRightStart() {
    navigationMode[currentNavigationModeIndex].onSelectRightStart(this);
}

function onSelectLeftStart() {
    navigationMode[currentNavigationModeIndex].onSelectLeftStart(this);
}

function onSelectRightEnd() { 
    navigationMode[currentNavigationModeIndex].onSelectRightEnd(this);
}

function onSelectLeftEnd() {
    navigationMode[currentNavigationModeIndex].onSelectLeftEnd(this);
}

function onRightButtonPressed(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    navigationMode[currentNavigationModeIndex].onRightButtonPressed(data);
    if (data.message.buttonIndex === 3) {
        // hack mode, test many stick interaction
        rightCtrChangeNavMode = true;
        if(leftCtrChangeNavMode) {
            switchNavigationMode();
        }
    }
}

function onLeftButtonPressed(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    navigationMode[currentNavigationModeIndex].onLeftButtonPressed(data);
    if (data.message.buttonIndex === 3) {
        // hack mode, test many stick interaction
        leftCtrChangeNavMode = true;
        if(rightCtrChangeNavMode) {
            switchNavigationMode();
        }
    }
}

function onRightAxisChanged(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    navigationMode[currentNavigationModeIndex].onRightAxisChanged(data);
}

function onLeftAxisChanged(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    navigationMode[currentNavigationModeIndex].onLeftAxisChanged(data);
}

function onRightAxisStop(data) {
    // camera fly reset
    data.message.controller.flyDirectionQuat = undefined;
    navigationMode[currentNavigationModeIndex].onRightAxisStop(data);
}

function onLeftAxisStop(data) {
    navigationMode[currentNavigationModeIndex].onLeftAxisStop(data);
}

function onLeftButtonReleased(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    leftCtrChangeNavMode = false;
    alreadySwitched=false;
    navigationMode[currentNavigationModeIndex].onLeftButtonReleased(data);
    if (data.message.buttonIndex === 4){
        switchDebugMode();
    }
    if(data.message.buttonIndex === 5){
        Controllers.change3DTileRepresentation();
    }
}

function onRightButtonReleased(data) {
    if (data.target.name !== 'rightController') {
        return;
    }
    rightCtrChangeNavMode = false;
    alreadySwitched=false;
    navigationMode[currentNavigationModeIndex].onRightButtonReleased(data);
}

///////// Common binding available for each mode ////////////////////

function switchNavigationMode() {
    if(alreadySwitched) {
        return;
    }
    alreadySwitched = true;
    if(currentNavigationModeIndex >= navigationMode.length - 1) {
        currentNavigationModeIndex=0;
    } else {
        currentNavigationModeIndex++;
    }
    console.log('switching nav mode: ', currentNavigationModeIndex);
}

function switchDebugMode() {
        contextXR.showDebug = !contextXR.showDebug;
        XRUtils.updateDebugVisibilities(contextXR.showDebug);
        console.log('debug is: ', contextXR.showDebug);
}

Controllers.change3DTileRepresentation = function() {
    let pntsLayer = view.getLayerById("3d-tiles-geredis");
                
    if(pntsLayer){
        pntsLayer = pntsLayer;
        pntsLayer.pntsMode = pntsLayer.pntsMode == itowns.PNTS_MODE.COLOR ? itowns.PNTS_MODE.CLASSIFICATION : itowns.PNTS_MODE.COLOR;
        view.notifyChange(view.camera.camera3D);
    }
}

function applyTeleportation(ctrl) {
    // if locked, should I do a second click to validate as we are locked ?
    if(!ctrl.userData.isSelecting) {
        // if has been aborted
        return;
    }
    ctrl.userData.isSelecting = false;
    ctrl.userData.lockedTeleportPosition = false;
    if ( contextXR.coordOnCamera ) {
        const offsetRotation = Controllers.getGeodesicalQuaternion();
        const projectedCoordinate = contextXR.coordOnCamera.as(view.referenceCrs);
        XRUtils.showPosition('intersect', projectedCoordinate, 0x0000ff, 50, true);
        // reset continuous translation applied to headSet parent.
        contextXR.xrHeadSet.position.copy(new itowns.THREE.Vector3());
    // compute targeted position relative to the origine camera.
        const trans = new itowns.THREE.Vector3(projectedCoordinate.x, projectedCoordinate.y, projectedCoordinate.z);
        applyTransformationToXR(trans, offsetRotation);
        // cache.geodesicNormal = null;
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

function getSpeedFactor() {
    var speedFactor = Math.min(Math.max(view.camera.elevationToGround / 10, 5), 2000);
    return speedFactor;
}

function getTranslationZ(axisValue, speedFactor) {
  // flying following the locked camera look at
  var speed = axisValue * speedFactor;
  var matrixHeadset = new itowns.THREE.Matrix4();
  matrixHeadset.identity().extractRotation(view.camera.camera3D.matrixWorld);
  directionY = new itowns.THREE.Vector3(0,0,1).applyMatrix4(matrixHeadset).multiplyScalar(speed);
  return directionY;
}
              

//////////////////////////////////// MODE 1

function getRotationYaw(axisValue) {
    if(axisValue === 0) {
        return;
    }
    deltaRotation += Math.PI / (160 * axisValue);
    console.log('rotY: ', deltaRotation);
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    var thetaRotMatrix = new itowns.THREE.Matrix4().identity().makeRotationY(deltaRotation);
    var rotationQuartenion = new itowns.THREE.Quaternion().setFromRotationMatrix(thetaRotMatrix).normalize();
    offsetRotation.premultiply(rotationQuartenion);
    return offsetRotation;
}

function getTranslationElevation(axisValue, speedFactor) {
    var speed = axisValue * speedFactor;
    var direction = view.controls.getCameraCoordinate().geodesicNormal.clone();
    direction.multiplyScalar(-speed);
    return direction;
}

/**
 * FIXME flying back and forth cause a permanent shift to up.
 * @param {*} ctrl 
 * @returns 
 */
function cameraOnFly(ctrl) {
    if (!ctrl.flyDirectionQuat) {
        // locking camera look at
        // FIXME using {view.camera.camera3D.matrixWorld} or normalized quaternion produces the same effect and shift to the up direction.
        ctrl.flyDirectionQuat = view.camera.camera3D.quaternion.clone().normalize();
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
        directionY = new itowns.THREE.Vector3(0,0,1).applyQuaternion(ctrl.flyDirectionQuat).multiplyScalar(speed);
    } 
    if (ctrl.gamepad.axes[2] !== 0) {
        var speed = ctrl.gamepad.axes[2] * speedFactor;
        directionX = new itowns.THREE.Vector3(1,0,0).applyQuaternion(ctrl.flyDirectionQuat).multiplyScalar(speed);
    }
    
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    const trans = view.camera.camera3D.position.clone().add(directionX.add(directionY));
    clampAndApplyTransformationToXR(trans, offsetRotation);
}

const Mode1 = {
    onSelectRightEnd: function(ctrl){
        applyTeleportation(ctrl);
    },
    onSelectRightStart: function(ctrl) {
        ctrl.userData.isSelecting = true;
    },
        onSelectLeftStart : function(ctrl) {
        // nothing yet needed
    },
    /**
     * first left click while right selecting locks the teleportation target
     * Second left click cancels teleportation target.
     */
    onSelectLeftEnd: function(ctrl) {
        if (contextXR.controller2.userData.lockedTeleportPosition) {
            contextXR.controller2.userData.isSelecting = false;
        }
        if (contextXR.controller2.userData.isSelecting) {
            contextXR.controller2.userData.lockedTeleportPosition = true;
        }
    },
    onRightButtonPressed: function(data) {
        var ctrl = data.message.controller;
        if (data.message.buttonIndex === 1) {
            // activate vertical adjustment
            if(ctrl.gamepad.axes[3] === 0) {
                return;
            }
            // disable clip to ground
            clipToground = false;
            const offsetRotation = Controllers.getGeodesicalQuaternion();
            var speedFactor = getSpeedFactor();
            const deltaTransl = getTranslationElevation(ctrl.gamepad.axes[3], speedFactor);
            const trans = view.camera.camera3D.position.clone().add(deltaTransl);
            clampAndApplyTransformationToXR(trans, offsetRotation);
        } 
    },
    onLeftButtonPressed: function(data) {
        var ctrl = data.message.controller;
        if (data.message.buttonIndex === 1) {
            // activate vertical adjustment
         //   setCameraTocontroller();
        }
    },
    onRightAxisChanged: function(data) {
        // translation controls
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
    },
    onLeftAxisChanged: function(data) {
        // rotation controls
        var ctrl = data.message.controller;
        if (contextXR.INTERSECTION) {
            
        } else {
            const trans = view.camera.camera3D.position.clone();
            var quat = getRotationYaw(ctrl.gamepad.axes[2]);
            applyTransformationToXR(trans, quat);
        } 
    },
    onRightAxisStop(data) {
        // inop
    },
    onLeftAxisStop(data) {
        // inop
    },
    onRightButtonReleased: function(data) {
        // inop
    },
    onLeftButtonReleased: function(data) {
        // inop
    }
};


//////////////////////////////////// MODE 2

const Mode2 = {
    onSelectRightEnd: function(ctrl){
        applyTeleportation(ctrl);
    },
    onSelectRightStart: function(ctrl) {
        ctrl.userData.isSelecting = true;
    },
        onSelectLeftStart : function(ctrl) {
        // nothing yet needed
    },
    /**
     * first left click while right selecting locks the teleportation target
     * Second left click cancels teleportation target.
     */
    onSelectLeftEnd: function(ctrl) {
        if (contextXR.controller2.userData.lockedTeleportPosition) {
            contextXR.controller2.userData.isSelecting = false;
        }
        if (contextXR.controller2.userData.isSelecting) {
            contextXR.controller2.userData.lockedTeleportPosition = true;
        }
    },
    onRightButtonPressed: function(data) {
        if (data.message.buttonIndex === 4 || data.message.buttonIndex === 5) {
            if(!startedPressButton) {
                startedPressButton = Date.now();
            }
            // disable clip to ground
            clipToground = false;
        }

        var deltaTimePressed = Date.now() - startedPressButton;
        if(deltaTimePressed > 2000 && !actionElevationPerformed) {
            const offsetRotation = Controllers.getGeodesicalQuaternion();
            var deltaTransl;
            var speedFactor = 1;
            if (data.message.buttonIndex === 4) {
                // activate vertical adjustment down : clamp to ground
                deltaTransl = getTranslationElevation(1000000, speedFactor);
            }
            else if (data.message.buttonIndex === 5) {
                // activate vertical adjustment up : bird view
                deltaTransl = getTranslationElevation(-10000, speedFactor);
            }
            const trans = view.camera.camera3D.position.clone().add(deltaTransl);
            clampAndApplyTransformationToXR(trans, offsetRotation);
            actionElevationPerformed = true;
        }
    },
    onLeftButtonPressed: function(data) {
        var ctrl = data.message.controller;
        /** 
        if (data.message.buttonIndex === 1) {
            // activate vertical adjustment
         //   setCameraTocontroller();
        }
        else if (data.message.buttonIndex === 3) {
            // hack mode, test many stick interaction
            leftCtrChangeNavMode = true;
            if(rightCtrChangeNavMode) {
                switchNavigationMode();
            }
        }*/
    },
    onRightAxisChanged: function(data) {
        // translation controls
        var ctrl = data.message.controller;
        if (ctrl.lockButtonIndex) {
            return;
        }
        if (contextXR.INTERSECTION) {
            //updating elevation at intersection destination
            contextXR.deltaAltitude -= ctrl.gamepad.axes[3] * 100;
        } else {
            var trans = view.camera.camera3D.position.clone();
            var quat = Controllers.getGeodesicalQuaternion();
            if (ctrl.gamepad.axes[3] !== 0) {
                var deltaZ = getTranslationZ(ctrl.gamepad.axes[3], getSpeedFactor());
                trans.add(deltaZ);
            }
            if (ctrl.gamepad.axes[2] !== 0) {
                quat = getRotationYaw(ctrl.gamepad.axes[2]);
            }
            clampAndApplyTransformationToXR(trans, quat);
        }
    },
    onLeftAxisChanged: function(data) {
        // rotation controls
        /** 
        var ctrl = data.message.controller;
        if (contextXR.INTERSECTION) {
            
        } else {
           
        } */
    },
    onRightAxisStop(data) {
        // inop
    },
    onLeftAxisStop(data) {
        // inop
    },
    onRightButtonReleased: function(data) {
        var deltaTransl = new itowns.THREE.Vector3();
        startedPressButton = undefined;

        const offsetRotation = Controllers.getGeodesicalQuaternion();

        if (!actionElevationPerformed) {
            var speedFactor = getSpeedFactor();
            // lower button
            if (data.message.buttonIndex === 4) {
                // activate vertical adjustment down
                deltaTransl = getTranslationElevation(5, speedFactor);

                // upper button
            } else if (data.message.buttonIndex === 5) {
                // activate vertical adjustment up
                deltaTransl = getTranslationElevation(-5, speedFactor);
            }
            const trans = view.camera.camera3D.position.clone().add(deltaTransl);
            clampAndApplyTransformationToXR(trans, offsetRotation);
        }
        else {
            actionElevationPerformed = false;
        }
        
    },
    onLeftButtonReleased: function(data) {
        // inop
    }
};
