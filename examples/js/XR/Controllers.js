const Controllers = {};

var ITOWNS_CAMERA_CRS = 'EPSG:4326';
var WORLD_CRS = 'EPSG:3857';
let renderer;

// move clipped to a fixed altitude
let clipToground = false;

Controllers.MIN_DELTA_ALTITUDE = 1.8;

let deltaRotation = 0;

let startedPressButton;

let actionElevationPerformed = false;

// hack mode switch between navigation Mode
let rightCtrChangeNavMode = false;
let leftCtrChangeNavMode = false;
let alreadySwitched = false;
const navigationMode = [];
let currentNavigationModeIndex = 0;
var trackPositionActive = true;
var isMovingLeft = false;
var isMovingRight = false;

let view;
let contextXR;
// [{ coords: {itowns.Coordinates}, rotation : {Quaternion} }]
var savedCoordinates = [];
var indexSavedCoordinates = 1;
initSavedCoordinates();
var cache = {};

/**
 * Controller.userData {
 *  isSelecting
 *  lockedTeleportPosition
 * }
 * requires a contextXR variable.
 * @param {*} _view itowns view object
 * @param {*} _contextXR itowns WebXR context object
 */
Controllers.addControllers = (_view, _contextXR) => {
    view = _view;
    contextXR = _contextXR;
    // eslint-disable-next-line no-use-before-define
    navigationMode.push(Mode1, Mode2);
    renderer = view.mainLoop.gfxEngine.renderer;
    const controller1 = bindListeners(0);
    const controller2 = bindListeners(1);
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

    const cameraRightCtrl = new itowns.THREE.PerspectiveCamera(view.camera.camera3D.fov);
    cameraRightCtrl.position.copy(view.camera.camera3D.position);
    const cameraRighthelper = new itowns.THREE.CameraHelper(cameraRightCtrl);

    XRUtils.addToScene (cameraRighthelper, true);


    contextXR.cameraRightGrp = { camera : cameraRightCtrl, cameraHelper : cameraRighthelper };

    contextXR.controller1 = controller1;
    contextXR.controller2 = controller2;

    // init cache
    cache.position = null;
    cache.isFixedPosition = false;
};

Controllers.getGeodesicalQuaternion = () => {
    // TODO can be optimized with better cache
    const position = view.controls.getCameraCoordinate().clone().as(view.referenceCrs);
    const geodesicNormal = new itowns.THREE.Quaternion().setFromUnitVectors(new itowns.THREE.Vector3(0, 0, 1), position.geodesicNormal).invert();
    return new itowns.THREE.Quaternion(-1, 0, 0, 1).normalize().multiply(geodesicNormal);
};

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
    if(trackPositionActive){
        XRUtils.addPositionPoints('cameraPositionsPoints', trans, 0xb51800, 30, true);
        XRUtils.addPositionSegment('cameraPositionsLine', trans, 0xffffff, 1, true);
    }
    const finalTransformation = trans.multiplyScalar(-1).applyQuaternion(offsetRotation);
    const transform = new XRRigidTransform(finalTransformation, offsetRotation);
    const teleportSpaceOffset = contextXR.baseReferenceSpace.getOffsetReferenceSpace(transform);
    renderer.xr.setReferenceSpace(teleportSpaceOffset);
}

/**
 * Clamp camera to ground if option {clipToground} is active
 * @param {Vector3} trans
 * @returns {Vector3} coordinates clamped to ground
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
    if(!isMovingRight) {
        isMovingRight = true;
        console.log("starting right stick");
    }
    navigationMode[currentNavigationModeIndex].onRightAxisChanged(data);
}

function onLeftAxisChanged(data) {
    if (data.target.name !== 'leftController') {
        return;
    }
    if(!isMovingLeft) {
        isMovingLeft = true;
        console.log("starting left stick");
    }
    navigationMode[currentNavigationModeIndex].onLeftAxisChanged(data);
}

function onRightAxisStop(data) {
    // camera fly reset
    data.message.controller.flyDirectionQuat = undefined;
    console.log("stopping right stick, reset fixed Quat");
    isMovingRight = false;
    navigationMode[currentNavigationModeIndex].onRightAxisStop(data);
}

function onLeftAxisStop(data) {
    navigationMode[currentNavigationModeIndex].onLeftAxisStop(data);
    console.log("stopping left stick");
    isMovingLeft = false;
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
    const speedFactor = Math.min(Math.max(view.camera.elevationToGround / 10, 5), 2000);
    return speedFactor;
}

function getTranslationZ(axisValue, speedFactor) {
    // flying following the locked camera look at
    const speed = axisValue * speedFactor;
    const matrixHeadset = new itowns.THREE.Matrix4();
    matrixHeadset.identity().extractRotation(view.camera.camera3D.matrixWorld);
    const directionY = new itowns.THREE.Vector3(0, 0, 1).applyMatrix4(matrixHeadset).multiplyScalar(speed);
    return directionY;
}

function printPosition() {
    console.log('pos:', view.camera.camera3D.position, 'rot:', Controllers.getGeodesicalQuaternion());
}

function switchRegisteredCoordinates() {
    if(indexSavedCoordinates > savedCoordinates.length - 1) {
        indexSavedCoordinates = 1;
    } else{
        indexSavedCoordinates++;
    }
    applyTransformationToXR(savedCoordinates[indexSavedCoordinates-1].coords.toVector3(), savedCoordinates[indexSavedCoordinates-1].rotation);
}


// ////////////////////////////////// MODE 1

function getRotationYaw(axisValue) {
    if (axisValue) {
        deltaRotation += Math.PI * axisValue / (140);
    }

    // console.log('rotY: ', deltaRotation);
    const offsetRotation = Controllers.getGeodesicalQuaternion();
    const thetaRotMatrix = new itowns.THREE.Matrix4().identity().makeRotationY(deltaRotation);
    const rotationQuartenion = new itowns.THREE.Quaternion().setFromRotationMatrix(thetaRotMatrix).normalize();
    offsetRotation.premultiply(rotationQuartenion);
    return offsetRotation;
}

function getTranslationElevation(axisValue, speedFactor) {
    const speed = axisValue * speedFactor;
    const direction = view.controls.getCameraCoordinate().geodesicNormal.clone();
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
        console.log("fixing rotation quat", ctrl.flyDirectionQuat);
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
    const trans = view.camera.camera3D.position.clone().add(directionX.add(directionZ));
    clampAndApplyTransformationToXR(trans, offsetRotation);
}

const Mode1 = {
    onSelectRightEnd: (ctrl) => {
        // applyTeleportation(ctrl);
    },
    onSelectRightStart: (ctrl) => {
        ctrl.userData.isSelecting = true;
    },
    onSelectLeftStart: (ctrl) => {
        // nothing yet needed
    },
    onSelectLeftEnd: (ctrl) => {
        // first left click while right selecting locks the teleportation target
        // Second left click cancels teleportation target.
        if (contextXR.controller2.userData.lockedTeleportPosition) {
            contextXR.controller2.userData.isSelecting = false;
        }
        if (contextXR.controller2.userData.isSelecting) {
            contextXR.controller2.userData.lockedTeleportPosition = true;
        }
    },
    onRightButtonPressed: (data) => {
        const ctrl = data.message.controller;
        if (data.message.buttonIndex === 1) {
            // activate vertical adjustment
            if(ctrl.gamepad.axes[3] === 0) {
                return;
            }
            // disable clip to ground
            clipToground = false;
            const offsetRotation = getRotationYaw();
            const speedFactor = getSpeedFactor();
            const deltaTransl = getTranslationElevation(ctrl.gamepad.axes[3], speedFactor);
            const trans = view.camera.camera3D.position.clone().add(deltaTransl);
            clampAndApplyTransformationToXR(trans, offsetRotation);
        }
    },
    onLeftButtonPressed: (data) => {
        if (data.message.buttonIndex === 1) {
            // activate vertical adjustment
            // setCameraTocontroller();
        }
    },
    onRightAxisChanged: (data) => {
        const ctrl = data.message.controller;
        // translation controls
        if (ctrl.lockButtonIndex) {
            return;
        }
        if (contextXR.INTERSECTION) {
            // updating elevation at intersection destination
            contextXR.deltaAltitude -= ctrl.gamepad.axes[3] * 100;
        } else {
            cameraOnFly(ctrl);
        }
    },
    onLeftAxisChanged: (data) => {
        const ctrl = data.message.controller;
        // rotation controls
        if (contextXR.INTERSECTION) {
            // inop
        } else {
            let trans = cache.isFixedPosition ? cache.position.clone() : view.camera.camera3D.position.clone();
            if(!isMovingRight && !cache.isFixedPosition) {
                cache.position = view.camera.camera3D.position.clone();
                trans = view.camera.camera3D.position.clone();
                cache.isFixedPosition = true;
            }
            const quat = getRotationYaw(ctrl.gamepad.axes[2]);
            applyTransformationToXR(trans, quat);
        }
    },
    onRightAxisStop: (data) => {
        // inop
    },
    onLeftAxisStop: (data) => {
        console.log("left axis stop mode 1");
        cache.isFixedPosition = false;
    },
    onRightButtonReleased: (data) => {
        // inop
        if(data.message.buttonIndex === 4) {
            switchRegisteredCoordinates();
        }
        if(data.message.buttonIndex === 5) {
            trackPositionActive = !trackPositionActive;
        }
    },
    onLeftButtonReleased: (data) => {
        // inop
        if (data.message.buttonIndex === 1) {
         printPosition();
        }
    },
};


// ////////////////////////////////// MODE 2

const Mode2 = {
    onSelectRightEnd: (ctrl) => {
        applyTeleportation(ctrl);
    },
    onSelectRightStart: (ctrl) => {
        ctrl.userData.isSelecting = true;
    },
    onSelectLeftStart: (ctrl) => {
        // nothing yet needed
    },
    /**
     * first left click while right selecting locks the teleportation target
     * Second left click cancels teleportation target.
     * @param {*} ctrl
     */
    onSelectLeftEnd: (ctrl) => {
        if (contextXR.controller2.userData.lockedTeleportPosition) {
            contextXR.controller2.userData.isSelecting = false;
        }
        if (contextXR.controller2.userData.isSelecting) {
            contextXR.controller2.userData.lockedTeleportPosition = true;
        }
    },
    onRightButtonPressed: (data) => {
        if (data.message.buttonIndex === 4 || data.message.buttonIndex === 5) {
            if(!startedPressButton) {
                startedPressButton = Date.now();
            }
            // disable clip to ground
            clipToground = false;
        }

        const deltaTimePressed = Date.now() - startedPressButton;
        if (deltaTimePressed > 2000 && !actionElevationPerformed) {
            const offsetRotation = Controllers.getGeodesicalQuaternion();
            let deltaTransl;
            const speedFactor = 1;
            if (data.message.buttonIndex === 4) {
                // activate vertical adjustment down : clamp to ground
                deltaTransl = getTranslationElevation(1000000, speedFactor);
            } else if (data.message.buttonIndex === 5) {
                // activate vertical adjustment up : bird view
                deltaTransl = getTranslationElevation(-10000, speedFactor);
            }
            const trans = view.camera.camera3D.position.clone().add(deltaTransl);
            clampAndApplyTransformationToXR(trans, offsetRotation);
            actionElevationPerformed = true;
        }
    },
    onLeftButtonPressed: (data) => {
        // inop
    },
    onRightAxisChanged: (data) => {
        // translation controls
        const ctrl = data.message.controller;
        if (ctrl.lockButtonIndex) {
            return;
        }
        if (contextXR.INTERSECTION) {
            // updating elevation at intersection destination
            contextXR.deltaAltitude -= ctrl.gamepad.axes[3] * 100;
        } else {
            const trans = view.camera.camera3D.position.clone();
            let quat = Controllers.getGeodesicalQuaternion();
            if (ctrl.gamepad.axes[3] !== 0) {
                const deltaZ = getTranslationZ(ctrl.gamepad.axes[3], getSpeedFactor());
                trans.add(deltaZ);
            }
            if (ctrl.gamepad.axes[2] !== 0) {
                quat = getRotationYaw(ctrl.gamepad.axes[2]);
            }
            clampAndApplyTransformationToXR(trans, quat);
        }
    },
    onLeftAxisChanged: (data) => {
        // inop
    },
    onRightAxisStop: (data) => {
        // inop
    },
    onLeftAxisStop: (data) => {
        // inop
    },
    onRightButtonReleased: (data) => {
        let deltaTransl = new itowns.THREE.Vector3();
        startedPressButton = undefined;

        const offsetRotation = Controllers.getGeodesicalQuaternion();

        if (!actionElevationPerformed) {
            const speedFactor = getSpeedFactor();
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
        } else {
            actionElevationPerformed = false;
        }

    },
    onLeftButtonReleased: (data) => {
        // inop
    },
};


function initSavedCoordinates() {
    var coords0 = new itowns.Coordinates(WORLD_CRS, 4412622, -26373.39453125, 4593361);
    var rot0 =  new itowns.THREE.Quaternion(-0.6579757940364078, -0.2629275384741631, 0.2629275384741631, 0.6548328591984319);
    var coords1 = new itowns.Coordinates(WORLD_CRS, 4413284.5, -18949.275390625, 4589538.5);
    var rot1 = new itowns.THREE.Quaternion(-0.6574699759393404, -0.26308946606438166, 0.26308946606438166, 0.6552107267362463);
    var coords2 = new itowns.Coordinates(WORLD_CRS, 4413334, -20101.763671875, 4589446);
    var rot2 = new itowns.THREE.Quaternion(-0.6575365516693648, -0.26309449351722863, 0.26309449351722863, 0.6551398768053935);
    var coords3 = new itowns.Coordinates(WORLD_CRS, 4413393, -19901.205078125, 4589395.5);
    var rot3 =  new itowns.THREE.Quaternion(-0.6575230100706515, -0.26309850880864316, 0.26309850880864316, 0.6551502427328912);

    savedCoordinates.push({coords: coords0, rotation: rot0});
    savedCoordinates.push({coords: coords1, rotation: rot1});
    savedCoordinates.push({coords: coords2, rotation: rot2});
    savedCoordinates.push({coords: coords3, rotation: rot3});
}
