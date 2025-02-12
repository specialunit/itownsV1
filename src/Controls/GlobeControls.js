import * as THREE from 'three';
import AnimationPlayer from 'Core/AnimationPlayer';
import Coordinates from 'Core/Geographic/Coordinates';
import { ellipsoidSizes } from 'Core/Math/Ellipsoid';
import CameraUtils from 'Utils/CameraUtils';
import StateControl from 'Controls/StateControl';
import { VIEW_EVENTS } from 'Core/View';

// private members
const EPS = 0.000001;

const direction = {
    up: new THREE.Vector2(0, 1),
    bottom: new THREE.Vector2(0, -1),
    left: new THREE.Vector2(1, 0),
    right: new THREE.Vector2(-1, 0),
};

// Orbit
const rotateStart = new THREE.Vector2();
const rotateEnd = new THREE.Vector2();
const rotateDelta = new THREE.Vector2();
const spherical = new THREE.Spherical(1.0, 0.01, 0);
const sphericalDelta = new THREE.Spherical(1.0, 0, 0);
let orbitScale = 1.0;

// Pan
const panStart = new THREE.Vector2();
const panEnd = new THREE.Vector2();
const panDelta = new THREE.Vector2();
const panOffset = new THREE.Vector3();

// Dolly
const dollyStart = new THREE.Vector2();
const dollyEnd = new THREE.Vector2();
const dollyDelta = new THREE.Vector2();
let dollyScale;

// Globe move
const moveAroundGlobe = new THREE.Quaternion();
const cameraTarget = new THREE.Object3D();
const coordCameraTarget = new Coordinates('EPSG:4978');
cameraTarget.matrixWorldInverse = new THREE.Matrix4();

const xyz = new Coordinates('EPSG:4978', 0, 0, 0);
const c = new Coordinates('EPSG:4326', 0, 0, 0);
// Position object on globe
function positionObject(newPosition, object) {
    xyz.setFromVector3(newPosition).as('EPSG:4326', c);
    object.position.copy(newPosition);
    object.lookAt(c.geodesicNormal.add(newPosition));
    object.rotateX(Math.PI * 0.5);
    object.updateMatrixWorld(true);
}

// Save the last time of mouse move for damping
let lastTimeMouseMove = 0;

// Animations and damping
let enableAnimation = true;
const dampingFactorDefault = 0.25;
const dampingMove = new THREE.Quaternion(0, 0, 0, 1);
const durationDampingMove = 120;
const durationDampingOrbital = 60;

// Pan Move
const panVector = new THREE.Vector3();

// Save last transformation
const lastPosition = new THREE.Vector3();
const lastQuaternion = new THREE.Quaternion();

// Tangent sphere to ellipsoid
const pickSphere = new THREE.Sphere();
const pickingPoint = new THREE.Vector3();

// Sphere intersection
const intersection = new THREE.Vector3();

// Set to true to enable target helper
const enableTargetHelper = false;
const helpers = {};

if (enableTargetHelper) {
    helpers.picking = new THREE.AxesHelper(500000);
    helpers.target = new THREE.AxesHelper(500000);
}

/**
 * Globe control pan event. Fires after camera pan
 * @event GlobeControls#pan-changed
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} orientation-changed
 */
/**
 * Globe control orientation event. Fires when camera's orientation change
 * @event GlobeControls#orientation-changed
 * @property new {object}
 * @property new.tilt {number} the new value of the tilt of the camera
 * @property new.heading {number} the new value of the heading of the camera
 * @property previous {object}
 * @property previous.tilt {number} the previous value of the tilt of the camera
 * @property previous.heading {number} the previous value of the heading of the camera
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} orientation-changed
 */
/**
 * Globe control range event. Fires when camera's range to target change
 * @event GlobeControls#range-changed
 * @property new {number} the new value of the range
 * @property previous {number} the previous value of the range
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} range-changed
 */
/**
 * Globe control camera's target event. Fires when camera's target change
 * @event GlobeControls#camera-target-changed
 * @property new {object}
 * @property new {Coordinates} the new camera's target coordinates
 * @property previous {Coordinates} the previous camera's target coordinates
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} camera-target-changed
 */

/**
 * globe controls events
 * @property PAN_CHANGED {string} Fires after camera pan
 * @property ORIENTATION_CHANGED {string} Fires when camera's orientation change
 * @property RANGE_CHANGED {string} Fires when camera's range to target change
 * @property CAMERA_TARGET_CHANGED {string} Fires when camera's target change
 */

export const CONTROL_EVENTS = {
    PAN_CHANGED: 'pan-changed',
    ORIENTATION_CHANGED: 'orientation-changed',
    RANGE_CHANGED: 'range-changed',
    CAMERA_TARGET_CHANGED: 'camera-target-changed',
};

const quaterPano = new THREE.Quaternion();
const quaterAxis = new THREE.Quaternion();
const axisX = new THREE.Vector3(1, 0, 0);
let minDistanceZ = Infinity;
const lastNormalizedIntersection = new THREE.Vector3();
const normalizedIntersection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const targetPosition = new THREE.Vector3();
const pickedPosition = new THREE.Vector3();
const sphereCamera = new THREE.Sphere();

let previous;
/**
 * GlobeControls is a camera controller
 *
 * @class      GlobeControls
 * @param      {GlobeView}  view the view where the control will be used
 * @param      {CameraTransformOptions|Extent} placement   the {@link CameraTransformOptions} to apply to view's camera
 * or the extent it must display at initialisation, see {@link CameraTransformOptions} in {@link CameraUtils}.
 * @param      {object}  [options] An object with one or more configuration properties. Any property of GlobeControls
 * can be passed in this object.
 * @property      {number}  zoomFactor The factor the scale is multiplied by when dollying (zooming) in or
 * divided by when dollying out. Default is 1.1.
 * @property      {number}  rotateSpeed Speed camera rotation in orbit and panoramic mode. Default is 0.25.
 * @property      {number}  minDistance Minimum distance between ground and camera in meters (Perspective Camera only).
 * Default is 250.
 * @property      {number}  maxDistance Maximum distance between ground and camera in meters
 * (Perspective Camera only). Default is ellipsoid radius * 8.
 * @property      {number}  minZoom How far you can zoom in, in meters (Orthographic Camera only). Default is 0.
 * @property      {number}  maxZoom How far you can zoom out, in meters (Orthographic Camera only). Default
 * is Infinity.
 * @property      {number}  keyPanSpeed Number of pixels moved per push on array key. Default is 7.
 * @property      {number}  minPolarAngle Minimum vertical orbit angle (in degrees). Default is 0.5.
 * @property      {number}  maxPolarAngle Maximum vertical orbit angle (in degrees). Default is 86.
 * @property      {number}  minAzimuthAngle Minimum horizontal orbit angle (in degrees). If modified,
 * should be in [-180,0]. Default is -Infinity.
 * @property      {number}  maxAzimuthAngle Maximum horizontal orbit angle (in degrees). If modified,
 * should be in [0,180]. Default is Infinity.
 * @property      {boolean} handleCollision Handle collision between camera and ground or not, i.e. whether
 * you can zoom underground or not. Default is true.
 * @property      {boolean} enableDamping Enable damping or not (simulates the lag that a real camera
 * operator introduces while operating a heavy physical camera). Default is true.
 * @property      {boolean} dampingMoveFactor the damping move factor. Default is 0.25.
 * @property      {StateControl~State} stateControl redefining which controls state is triggered by the keyboard/mouse
 * event (For example, rewrite the PAN movement to be triggered with the 'left' mouseButton instead of 'right').
 */
class GlobeControls extends THREE.EventDispatcher {
    constructor(view, placement, options = {}) {
        super();
        this.player = new AnimationPlayer();
        this.view = view;
        this.camera = view.camera3D;

        // State control
        this.states = new StateControl(this.view, options.stateControl);

        // this.enabled property has moved to StateControl
        Object.defineProperty(this, 'enabled', {
            get: () => this.states.enabled,
            set: (value) => {
                console.warn(
                    'GlobeControls.enabled property is deprecated. Use StateControl.enabled instead ' +
                    '- which you can access with GlobeControls.states.enabled.',
                );
                this.states.enabled = value;
            },
        });

        // These options actually enables dollying in and out; left as "zoom" for
        // backwards compatibility
        if (options.zoomSpeed) {
            console.warn('Controls zoomSpeed parameter is deprecated. Use zoomFactor instead.');
            options.zoomFactor = options.zoomFactor || options.zoomSpeed;
        }
        this.zoomFactor = options.zoomFactor || 1.1;

        // Limits to how far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = options.minDistance || 250;
        this.maxDistance = options.maxDistance || ellipsoidSizes.x * 8.0;

        // Limits to how far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = options.minZoom || 0;
        this.maxZoom = options.maxZoom || Infinity;

        // Set to true to disable this control
        this.rotateSpeed = options.rotateSpeed || 0.25;

        // Set to true to disable this control
        this.keyPanSpeed = options.keyPanSpeed || 7.0; // pixels moved per arrow key push

        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        // TODO Warning minPolarAngle = 0.01 -> it isn't possible to be perpendicular on Globe
        this.minPolarAngle = THREE.MathUtils.degToRad(options.minPolarAngle ?? 0.5);
        this.maxPolarAngle = THREE.MathUtils.degToRad(options.minPolarAngle ?? 86);

        // How far you can orbit horizontally, upper and lower limits.
        // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
        this.minAzimuthAngle = options.minAzimuthAngle ? THREE.MathUtils.degToRad(options.minAzimuthAngle) : -Infinity; // radians
        this.maxAzimuthAngle = options.maxAzimuthAngle ? THREE.MathUtils.degToRad(options.maxAzimuthAngle) : Infinity; // radians

        // Set collision options
        this.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
        this.minDistanceCollision = 60;

        // this.enableKeys property has moved to StateControl
        Object.defineProperty(this, 'enableKeys', {
            get: () => this.states.enableKeys,
            set: (value) => {
                console.warn(
                    'GlobeControls.enableKeys property is deprecated. Use StateControl.enableKeys instead ' +
                    '- which you can access with GlobeControls.states.enableKeys.',
                );
                this.states.enableKeys = value;
            },
        });

        // Enable Damping
        this.enableDamping = options.enableDamping !== false;
        this.dampingMoveFactor = options.dampingMoveFactor != undefined ? options.dampingMoveFactor : dampingFactorDefault;

        this.startEvent = {
            type: 'start',
        };
        this.endEvent = {
            type: 'end',
        };
        // Update helper
        this.updateHelper = enableTargetHelper ? (position, helper) => {
            positionObject(position, helper);
            view.notifyChange(this.camera);
        } : function empty() { };

        this._onEndingMove = null;
        this._onTravel = this.travel.bind(this);
        this._onTouchStart = this.onTouchStart.bind(this);
        this._onTouchEnd = this.onTouchEnd.bind(this);
        this._onTouchMove = this.onTouchMove.bind(this);

        this._onStateChange = this.onStateChange.bind(this);

        this._onRotation = this.handleRotation.bind(this);
        this._onDrag = this.handleDrag.bind(this);
        this._onDolly = this.handleDolly.bind(this);
        this._onPan = this.handlePan.bind(this);
        this._onPanoramic = this.handlePanoramic.bind(this);

        this._onZoom = this.handleZoom.bind(this);

        this.states.addEventListener('state-changed', this._onStateChange, false);

        this.states.addEventListener(this.states.ORBIT._event, this._onRotation, false);
        this.states.addEventListener(this.states.MOVE_GLOBE._event, this._onDrag, false);
        this.states.addEventListener(this.states.DOLLY._event, this._onDolly, false);
        this.states.addEventListener(this.states.PAN._event, this._onPan, false);
        this.states.addEventListener(this.states.PANORAMIC._event, this._onPanoramic, false);

        this.states.addEventListener('zoom', this._onZoom, false);

        this.view.domElement.addEventListener('touchstart', this._onTouchStart, false);
        this.view.domElement.addEventListener('touchend', this._onTouchEnd, false);
        this.view.domElement.addEventListener('touchmove', this._onTouchMove, false);

        this.states.addEventListener(this.states.TRAVEL_IN._event, this._onTravel, false);
        this.states.addEventListener(this.states.TRAVEL_OUT._event, this._onTravel, false);

        view.scene.add(cameraTarget);
        if (enableTargetHelper) {
            cameraTarget.add(helpers.target);
            view.scene.add(helpers.picking);
        }

        if (placement.isExtent) {
            placement.center().as('EPSG:4978', xyz);
        } else {
            placement.coord.as('EPSG:4978', xyz);

            placement.tilt = placement.tilt || 89.5;
            placement.heading = placement.heading || 0;
        }
        positionObject(xyz, cameraTarget);
        this.lookAtCoordinate(placement, false);

        coordCameraTarget.crs = this.view.referenceCrs;
    }

    get zoomInScale() {
        return this.zoomFactor;
    }
    get zoomOutScale() {
        return 1 / this.zoomFactor;
    }

    get isPaused() {
        // TODO : also check if CameraUtils is performing an animation
        return this.states.currentState === this.states.NONE
            && !this.player.isPlaying();
    }

    onEndingMove(current) {
        if (this._onEndingMove) {
            this.player.removeEventListener('animation-stopped', this._onEndingMove);
            this._onEndingMove = null;
        }
        this.handlingEvent(current);
    }

    rotateLeft(angle = 0) {
        sphericalDelta.theta -= angle;
    }

    rotateUp(angle = 0) {
        sphericalDelta.phi -= angle;
    }

    // pass in distance in world space to move left
    panLeft(distance) {
        const te = this.camera.matrix.elements;
        // get X column of matrix
        panOffset.fromArray(te);
        panOffset.multiplyScalar(-distance);
        panVector.add(panOffset);
    }

    // pass in distance in world space to move up
    panUp(distance) {
        const te = this.camera.matrix.elements;
        // get Y column of matrix
        panOffset.fromArray(te, 4);
        panOffset.multiplyScalar(distance);
        panVector.add(panOffset);
    }

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    mouseToPan(deltaX, deltaY) {
        const gfx = this.view.mainLoop.gfxEngine;
        if (this.camera.isPerspectiveCamera) {
            let targetDistance = this.camera.position.distanceTo(this.getCameraTargetPosition());
            // half of the fov is center to top of screen
            targetDistance *= 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(deltaX * targetDistance / gfx.width * this.camera.aspect);
            this.panUp(deltaY * targetDistance / gfx.height);
        } else if (this.camera.isOrthographicCamera) {
            // orthographic
            this.panLeft(deltaX * (this.camera.right - this.camera.left) / gfx.width);
            this.panUp(deltaY * (this.camera.top - this.camera.bottom) / gfx.height);
        }
    }

    // For Mobile
    dolly(delta) {
        if (delta === 0) { return; }
        dollyScale = delta > 0 ? this.zoomInScale : this.zoomOutScale;

        if (this.camera.isPerspectiveCamera) {
            orbitScale /= dollyScale;
        } else if (this.camera.isOrthographicCamera) {
            this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * dollyScale, this.minZoom, this.maxZoom);
            this.camera.updateProjectionMatrix();
            this.view.notifyChange(this.camera);
        }
    }

    getMinDistanceCameraBoundingSphereObbsUp(tile) {
        if (tile.level > 10 && tile.children.length == 1 && tile.geometry) {
            const obb = tile.obb;
            sphereCamera.center.copy(this.camera.position);
            sphereCamera.radius = this.minDistanceCollision;
            if (obb.isSphereAboveXYBox(sphereCamera)) {
                minDistanceZ = Math.min(sphereCamera.center.z - obb.box3D.max.z, minDistanceZ);
            }
        }
    }

    update(state = this.states.currentState) {
        // We compute distance between camera's bounding sphere and geometry's obb up face
        minDistanceZ = Infinity;
        if (this.handleCollision) { // We check distance to the ground/surface geometry
            // add minDistanceZ between camera's bounding and tiles's oriented bounding box (up face only)
            // Depending on the distance of the camera with obbs, we add a slowdown or constrain to the movement.
            // this constraint or deceleration is suitable for two types of movement MOVE_GLOBE and ORBIT.
            // This constraint or deceleration inversely proportional to the camera/obb distance
            if (this.view.tileLayer) {
                for (const tile of this.view.tileLayer.level0Nodes) {
                    tile.traverse(this.getMinDistanceCameraBoundingSphereObbsUp.bind(this));
                }
            }
        }
        switch (state) {
            // MOVE_GLOBE Rotate globe with mouse
            case this.states.MOVE_GLOBE:
                if (minDistanceZ < 0) {
                    cameraTarget.translateY(-minDistanceZ);
                    this.camera.position.setLength(this.camera.position.length() - minDistanceZ);
                } else if (minDistanceZ < this.minDistanceCollision) {
                    const translate = this.minDistanceCollision * (1.0 - minDistanceZ / this.minDistanceCollision);
                    cameraTarget.translateY(translate);
                    this.camera.position.setLength(this.camera.position.length() + translate);
                }
                lastNormalizedIntersection.copy(normalizedIntersection).applyQuaternion(moveAroundGlobe);
                cameraTarget.position.applyQuaternion(moveAroundGlobe);
                this.camera.position.applyQuaternion(moveAroundGlobe);
                break;
            // PAN Move camera in projection plan
            case this.states.PAN:
                this.camera.position.add(panVector);
                cameraTarget.position.add(panVector);
                break;
            // PANORAMIC Move target camera
            case this.states.PANORAMIC: {
                this.camera.worldToLocal(cameraTarget.position);
                const normal = this.camera.position.clone().normalize().applyQuaternion(this.camera.quaternion.clone().invert());
                quaterPano.setFromAxisAngle(normal, sphericalDelta.theta).multiply(quaterAxis.setFromAxisAngle(axisX, sphericalDelta.phi));
                cameraTarget.position.applyQuaternion(quaterPano);
                this.camera.localToWorld(cameraTarget.position);
                break;
            }
            // ZOOM/ORBIT Move Camera around the target camera
            default: {
                // get camera position in local space of target
                this.camera.position.applyMatrix4(cameraTarget.matrixWorldInverse);

                // angle from z-axis around y-axis
                if (sphericalDelta.theta || sphericalDelta.phi) {
                    spherical.setFromVector3(this.camera.position);
                }
                // far underground
                const dynamicRadius = spherical.radius * Math.sin(this.minPolarAngle);
                const slowdownLimit = dynamicRadius * 8;
                const contraryLimit = dynamicRadius * 2;
                const minContraintPhi = -0.01;

                if (this.handleCollision) {
                    if (minDistanceZ < slowdownLimit && minDistanceZ > contraryLimit && sphericalDelta.phi > 0) {
                        // slowdown zone : slowdown sphericalDelta.phi
                        const slowdownZone = slowdownLimit - contraryLimit;
                        // the deeper the camera is in this zone, the bigger the factor is
                        const slowdownFactor = 1 - (slowdownZone - (minDistanceZ - contraryLimit)) / slowdownZone;
                        // apply slowdown factor on tilt mouvement
                        sphericalDelta.phi *= slowdownFactor * slowdownFactor;
                    } else if (minDistanceZ < contraryLimit && minDistanceZ > -contraryLimit && sphericalDelta.phi > minContraintPhi) {
                        // contraint zone : contraint sphericalDelta.phi
                        const contraryZone = 2 * contraryLimit;
                        // calculation of the angle of rotation which allows to leave this zone
                        let contraryPhi = -Math.asin((contraryLimit - minDistanceZ) * 0.25 / spherical.radius);
                        // clamp contraryPhi to make a less brutal exit
                        contraryPhi = THREE.MathUtils.clamp(contraryPhi, minContraintPhi, 0);
                        // the deeper the camera is in this zone, the bigger the factor is
                        const contraryFactor = 1 - (contraryLimit - minDistanceZ) / contraryZone;
                        sphericalDelta.phi = THREE.MathUtils.lerp(sphericalDelta.phi, contraryPhi, contraryFactor);
                        minDistanceZ -= Math.sin(sphericalDelta.phi) * spherical.radius;
                    }
                }

                spherical.theta += sphericalDelta.theta;
                spherical.phi += sphericalDelta.phi;

                // restrict spherical.theta to be between desired limits
                spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, spherical.theta));

                // restrict spherical.phi to be between desired limits
                spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, spherical.phi));
                spherical.radius = this.camera.position.length() * orbitScale;

                // restrict spherical.phi to be betwee EPS and PI-EPS
                spherical.makeSafe();

                // restrict radius to be between desired limits
                spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));

                this.camera.position.setFromSpherical(spherical);

                // if camera is underground, so move up camera
                if (minDistanceZ < 0) {
                    this.camera.position.y -= minDistanceZ;
                    spherical.setFromVector3(this.camera.position);
                    sphericalDelta.phi = 0;
                }

                cameraTarget.localToWorld(this.camera.position);
            }
        }

        this.camera.up.copy(cameraTarget.position).normalize();
        this.camera.lookAt(cameraTarget.position);

        if (!this.enableDamping) {
            sphericalDelta.theta = 0;
            sphericalDelta.phi = 0;
            moveAroundGlobe.set(0, 0, 0, 1);
        } else {
            sphericalDelta.theta *= (1 - dampingFactorDefault);
            sphericalDelta.phi *= (1 - dampingFactorDefault);
            moveAroundGlobe.slerp(dampingMove, this.dampingMoveFactor * 0.2);
        }

        orbitScale = 1;
        panVector.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        if (lastPosition.distanceToSquared(this.camera.position) > EPS || 8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {
            this.view.notifyChange(this.camera);

            lastPosition.copy(this.camera.position);
            lastQuaternion.copy(this.camera.quaternion);
        }
        // Launch animationdamping if mouse stops these movements
        if (this.enableDamping && state === this.states.ORBIT && this.player.isStopped() && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
            this.player.setCallback(() => { this.update(this.states.ORBIT); });
            this.player.playLater(durationDampingOrbital, 2);
        }

        this.view.dispatchEvent({
            type: VIEW_EVENTS.CAMERA_MOVED,
            coord: coordCameraTarget.setFromVector3(cameraTarget.position),
            range: spherical.radius,
            heading: -THREE.MathUtils.radToDeg(spherical.theta),
            tilt: 90 - THREE.MathUtils.radToDeg(spherical.phi),
        });
    }

    onStateChange(event) {
        // If the state changed to NONE, end the movement associated to the previous state.
        if (this.states.currentState === this.states.NONE) {
            this.handleEndMovement(event);
            return;
        }

        // Stop CameraUtils ongoing animations, which can for instance be triggered with `this.travel` or
        // `this.lookAtCoordinate` methods.
        CameraUtils.stop(this.view, this.camera);

        // Dispatch events which specify if changes occurred in camera transform options.
        this.onEndingMove();

        // Stop eventual damping movement.
        this.player.stop();

        // Update camera transform options.
        this.updateTarget();
        previous = CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, pickedPosition);

        // Initialize rotation and panoramic movements.
        rotateStart.copy(event.viewCoords);

        // Initialize drag movement.
        if (this.view.getPickingPositionFromDepth(event.viewCoords, pickingPoint)) {
            pickSphere.radius = pickingPoint.length();
            lastNormalizedIntersection.copy(pickingPoint).normalize();
            this.updateHelper(pickingPoint, helpers.picking);
        }

        // Initialize dolly movement.
        dollyStart.copy(event.viewCoords);
        this.view.getPickingPositionFromDepth(event.viewCoords, pickedPosition);        // mouse position

        // Initialize pan movement.
        panStart.copy(event.viewCoords);
    }

    handleRotation(event) {
        // Stop player if needed. Player can be playing while moving mouse in the case of rotation. This is due to the
        // fact that a damping move can occur while rotating (without the need of releasing the mouse button)
        this.player.stop();
        this.handlePanoramic(event);
    }

    handleDrag(event) {
        const normalized = this.view.viewToNormalizedCoords(event.viewCoords);

        // An updateMatrixWorld on the camera prevents camera jittering when moving globe on a zoomed out view, with
        // devtools open in web browser.
        this.camera.updateMatrixWorld();

        raycaster.setFromCamera(normalized, this.camera);

        // If there's intersection then move globe else we stop the move
        if (raycaster.ray.intersectSphere(pickSphere, intersection)) {
            normalizedIntersection.copy(intersection).normalize();
            moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
            lastTimeMouseMove = Date.now();
            this.update();
        } else {
            this.states.onPointerUp();
        }
    }

    handleDolly(event) {
        dollyEnd.copy(event.viewCoords);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        dollyStart.copy(dollyEnd);
        event.delta = dollyDelta.y;
        if (event.delta != 0) { this.handleZoom(event); }
    }

    handlePan(event) {
        if (event.viewCoords) {
            panEnd.copy(event.viewCoords);
            panDelta.subVectors(panEnd, panStart);
            panStart.copy(panEnd);
        } else if (event.direction) {
            panDelta.copy(direction[event.direction]).multiplyScalar(this.keyPanSpeed);
        }

        this.mouseToPan(panDelta.x, panDelta.y);

        this.update(this.states.PAN);
    }

    handlePanoramic(event) {
        rotateEnd.copy(event.viewCoords);
        rotateDelta.subVectors(rotateEnd, rotateStart);

        const gfx = this.view.mainLoop.gfxEngine;

        sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / gfx.width * this.rotateSpeed;
        // rotating up and down along whole screen attempts to go 360, but limited to 180
        sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / gfx.height * this.rotateSpeed;

        rotateStart.copy(rotateEnd);
        this.update();
    }

    handleEndMovement(event = {}) {
        this.dispatchEvent(this.endEvent);

        this.player.stop();

        // Launch damping movement for :
        //      * this.states.ORBIT
        //      * this.states.MOVE_GLOBE
        if (this.enableDamping) {
            if (event.previous === this.states.ORBIT && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
                this.player.setCallback(() => { this.update(this.states.ORBIT); });
                this.player.play(durationDampingOrbital);
                this._onEndingMove = () => this.onEndingMove();
                this.player.addEventListener('animation-stopped', this._onEndingMove);
            } else if (event.previous === this.states.MOVE_GLOBE && (Date.now() - lastTimeMouseMove < 50)) {
                this.player.setCallback(() => { this.update(this.states.MOVE_GLOBE); });
                // animation since mouse up event occurs less than 50ms after the last mouse move
                this.player.play(durationDampingMove);
                this._onEndingMove = () => this.onEndingMove();
                this.player.addEventListener('animation-stopped', this._onEndingMove);
            } else {
                this.onEndingMove();
            }
        } else {
            this.onEndingMove();
        }
    }

    updateTarget() {
        // Check if the middle of the screen is on the globe (to prevent having a dark-screen bug if outside the globe)
        if (this.view.getPickingPositionFromDepth(null, pickedPosition)) {
            // Update camera's target position
            const distance = !isNaN(pickedPosition.x) ? this.camera.position.distanceTo(pickedPosition) : 100;
            targetPosition.set(0, 0, -distance);
            this.camera.localToWorld(targetPosition);

            // set new camera target on globe
            positionObject(targetPosition, cameraTarget);
            cameraTarget.matrixWorldInverse.copy(cameraTarget.matrixWorld).invert();
            targetPosition.copy(this.camera.position);
            targetPosition.applyMatrix4(cameraTarget.matrixWorldInverse);
            spherical.setFromVector3(targetPosition);
        }
    }

    handlingEvent(current) {
        current = current || CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera);
        const diff = CameraUtils.getDiffParams(previous, current);
        if (diff) {
            if (diff.range) {
                this.dispatchEvent({
                    type: CONTROL_EVENTS.RANGE_CHANGED,
                    previous: diff.range.previous,
                    new: diff.range.new,
                });
            }
            if (diff.coord) {
                this.dispatchEvent({
                    type: CONTROL_EVENTS.CAMERA_TARGET_CHANGED,
                    previous: diff.coord.previous,
                    new: diff.coord.new,
                });
            }
            if (diff.tilt || diff.heading) {
                const event = {
                    type: CONTROL_EVENTS.ORIENTATION_CHANGED,
                };
                if (diff.tilt) {
                    event.previous = { tilt: diff.tilt.previous };
                    event.new = { tilt: diff.tilt.new };
                }

                if (diff.heading) {
                    event.previous = event.previous || {};
                    event.new = event.new || {};
                    event.new.heading = diff.heading.new;
                    event.previous.heading = diff.heading.previous;
                }

                this.dispatchEvent(event);
            }
        }
    }

    travel(event) {
        this.player.stop();
        const point = this.view.getPickingPositionFromDepth(event.viewCoords);
        const range = this.getRange(point);
        if (point && range > this.minDistance) {
            return this.lookAtCoordinate({
                coord: new Coordinates('EPSG:4978').setFromVector3(point),
                range: range * (event.direction === 'out' ? 1 / 0.6 : 0.6),
                time: 1500,
            });
        }
    }

    handleZoom(event) {
        this.player.stop();
        CameraUtils.stop(this.view, this.camera);
        const zoomScale = event.delta > 0 ? this.zoomInScale : this.zoomOutScale;
        let point = event.type === 'dolly' ? pickedPosition : this.view.getPickingPositionFromDepth(event.viewCoords);        // get cursor position
        let range = this.getRange();
        range *= zoomScale;

        if (point && (range > this.minDistance && range < this.maxDistance)) {  // check if the zoom is in the allowed interval
            const camPos = xyz.setFromVector3(cameraTarget.position).as('EPSG:4326', c).toVector3();
            point = xyz.setFromVector3(point).as('EPSG:4326', c).toVector3();

            if (camPos.x * point.x < 0) {     // Correct rotation at 180th meridian by using 0 <= longitude <=360 for interpolation purpose
                if (camPos.x - point.x > 180) { point.x += 360; } else if (point.x - camPos.x > 180) { camPos.x += 360; }
            }
            point.lerp(  // point interpol between mouse cursor and cam pos
                camPos,
                zoomScale, // interpol factor
            );

            point = c.setFromVector3(point).as('EPSG:4978', xyz);

            return this.lookAtCoordinate({       // update view to the interpolate point
                coord: point,
                range,
            },
            false);
        }
    }

    onTouchStart(event) {
        // CameraUtils.stop(view);
        this.player.stop();
        // TODO : this.states.enabled check should be removed when moving touch events management to StateControl
        if (this.states.enabled === false) { return; }

        this.state = this.states.touchToState(event.touches.length);

        this.updateTarget();

        if (this.state !== this.states.NONE) {
            switch (this.state) {
                case this.states.MOVE_GLOBE: {
                    const coords = this.view.eventToViewCoords(event);
                    if (this.view.getPickingPositionFromDepth(coords, pickingPoint)) {
                        pickSphere.radius = pickingPoint.length();
                        lastNormalizedIntersection.copy(pickingPoint).normalize();
                        this.updateHelper(pickingPoint, helpers.picking);
                    } else {
                        this.state = this.states.NONE;
                    }
                    break;
                }
                case this.states.ORBIT:
                case this.states.DOLLY: {
                    const x = event.touches[0].pageX;
                    const y = event.touches[0].pageY;
                    const dx = x - event.touches[1].pageX;
                    const dy = y - event.touches[1].pageY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    dollyStart.set(0, distance);
                    rotateStart.set(x, y);
                    break;
                }
                case this.states.PAN:
                    panStart.set(event.touches[0].pageX, event.touches[0].pageY);
                    break;
                default:
            }

            this.dispatchEvent(this.startEvent);
        }
    }

    onTouchMove(event) {
        if (this.player.isPlaying()) {
            this.player.stop();
        }
        // TODO : this.states.enabled check should be removed when moving touch events management to StateControl
        if (this.states.enabled === false) { return; }

        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case this.states.MOVE_GLOBE.finger: {
                const coords = this.view.eventToViewCoords(event);
                const normalized = this.view.viewToNormalizedCoords(coords);
                // An updateMatrixWorld on the camera prevents camera jittering when moving globe on a zoomed out view, with
                // devtools open in web browser.
                this.camera.updateMatrixWorld();
                raycaster.setFromCamera(normalized, this.camera);
                // If there's intersection then move globe else we stop the move
                if (raycaster.ray.intersectSphere(pickSphere, intersection)) {
                    normalizedIntersection.copy(intersection).normalize();
                    moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
                    lastTimeMouseMove = Date.now();
                } else {
                    this.onTouchEnd();
                }
                break;
            }
            case this.states.ORBIT.finger:
            case this.states.DOLLY.finger: {
                const gfx = this.view.mainLoop.gfxEngine;
                rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                // rotating across whole screen goes 360 degrees around
                this.rotateLeft(2 * Math.PI * rotateDelta.x / gfx.width * this.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / gfx.height * this.rotateSpeed);

                rotateStart.copy(rotateEnd);
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                dollyEnd.set(0, distance);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                this.dolly(dollyDelta.y);

                dollyStart.copy(dollyEnd);

                break;
            }
            case this.states.PAN.finger:
                panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                panDelta.subVectors(panEnd, panStart);

                this.mouseToPan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);
                break;
            default:
                this.state = this.states.NONE;
        }

        if (this.state !== this.states.NONE) {
            this.update(this.state);
        }
    }

    onTouchEnd() {
        this.handleEndMovement({ previous: this.state });
        this.state = this.states.NONE;
    }

    dispose() {
        this.view.domElement.removeEventListener('touchstart', this._onTouchStart, false);
        this.view.domElement.removeEventListener('touchend', this._onTouchEnd, false);
        this.view.domElement.removeEventListener('touchmove', this._onTouchMove, false);

        this.states.dispose();

        this.states.removeEventListener('state-changed', this._onStateChange, false);

        this.states.removeEventListener(this.states.ORBIT._event, this._onRotation, false);
        this.states.removeEventListener(this.states.MOVE_GLOBE._event, this._onDrag, false);
        this.states.removeEventListener(this.states.DOLLY._event, this._onDolly, false);
        this.states.removeEventListener(this.states.PAN._event, this._onPan, false);
        this.states.removeEventListener(this.states.PANORAMIC._event, this._onPanoramic, false);

        this.states.removeEventListener('zoom', this._onZoom, false);

        this.states.removeEventListener(this.states.TRAVEL_IN._event, this._onTravel, false);
        this.states.removeEventListener(this.states.TRAVEL_OUT._event, this._onTravel, false);

        this.dispatchEvent({ type: 'dispose' });
    }
    /**
     * Changes the tilt of the current camera, in degrees.
     * @param {number}  tilt
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setTilt(tilt, isAnimated) {
        return this.lookAtCoordinate({ tilt }, isAnimated);
    }

    /**
     * Changes the heading of the current camera, in degrees.
     * @param {number} heading
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setHeading(heading, isAnimated) {
        return this.lookAtCoordinate({ heading }, isAnimated);
    }

    /**
     * Sets the "range": the distance in meters between the camera and the current central point on the screen.
     * @param {number} range
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setRange(range, isAnimated) {
        return this.lookAtCoordinate({ range }, isAnimated);
    }

    /**
     * Returns the {@linkcode Coordinates} of the globe point targeted by the camera in EPSG:4978 projection. See {@linkcode Coordinates} for conversion
     * @return {THREE.Vector3} position
     */
    getCameraTargetPosition() {
        return cameraTarget.position;
    }

    /**
     * Returns the "range": the distance in meters between the camera and the current central point on the screen.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} number
     */
    getRange(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).range;
    }

    /**
     * Returns the tilt of the current camera in degrees.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} The angle of the rotation in degrees.
     */
    getTilt(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).tilt;
    }

    /**
     * Returns the heading of the current camera in degrees.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} The angle of the rotation in degrees.
     */
    getHeading(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).heading;
    }

    /**
     * Displaces the central point to a specific amount of pixels from its current position.
     * The view flies to the desired coordinate, i.e.is not teleported instantly. Note : The results can be strange in some cases, if ever possible, when e.g.the camera looks horizontally or if the displaced center would not pick the ground once displaced.
     * @param      {vector}  pVector  The vector
     * @return {Promise}
     */
    pan(pVector) {
        this.mouseToPan(pVector.x, pVector.y);
        this.update(this.states.PAN);
        return Promise.resolve();
    }

    /**
     * Returns the orientation angles of the current camera, in degrees.
     * @return {Array<number>}
     */
    getCameraOrientation() {
        this.view.getPickingPositionFromDepth(null, pickedPosition);
        return [this.getTilt(pickedPosition), this.getHeading(pickedPosition)];
    }

    /**
     * Returns the camera location projected on the ground in lat,lon. See {@linkcode Coordinates} for conversion.
     * @return {Coordinates} position
     */

    getCameraCoordinate() {
        return new Coordinates('EPSG:4978')
            .setFromVector3(this.camera.position)
            .as('EPSG:4326');
    }

    /**
     * Returns the {@linkcode Coordinates} of the central point on screen in lat,lon. See {@linkcode Coordinates} for conversion.
     * @return {Coordinates} coordinate
     */
    getLookAtCoordinate() {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera).coord;
    }

    /**
     * Sets the animation enabled.
     * @param      {boolean}  enable  enable
     */
    setAnimationEnabled(enable) {
        enableAnimation = enable;
    }

    /**
     * Determines if animation enabled.
     * @return     {boolean}  True if animation enabled, False otherwise.
     */
    isAnimationEnabled() {
        return enableAnimation;
    }

    /**
     * Returns the actual zoom. The zoom will always be between the [getMinZoom(), getMaxZoom()].
     * @return     {number}  The zoom .
     */
    getZoom() {
        return this.view.tileLayer.computeTileZoomFromDistanceCamera(this.getRange(), this.view.camera);
    }

    /**
     * Sets the current zoom, which is an index in the logical scales predefined for the application.
     * The higher the zoom, the closer to the ground.
     * The zoom is always in the [getMinZoom(), getMaxZoom()] range.
     * @param      {number}  zoom    The zoom
     * @param      {boolean}  isAnimated  Indicates if animated
     * @return     {Promise}
     */
    setZoom(zoom, isAnimated) {
        return this.lookAtCoordinate({ zoom }, isAnimated);
    }

    /**
     * Return the current zoom scale at the central point of the view.
     * This function compute the scale of a map
     * @param      {number}  pitch   Screen pitch, in millimeters ; 0.28 by default
     * @return     {number}  The zoom scale.
     *
     * @deprecated Use View#getScale instead.
     */
    getScale(pitch) {
        console.warn('Deprecated, use View#getScale instead.');
        return this.view.getScale(pitch);
    }

    /**
     * To convert the projection in meters on the globe of a number of pixels of screen
     * @param      {number} pixels count pixels to project
     * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number} projection in meters on globe
     *
     * @deprecated Use `View#getPixelsToMeters` instead.
     */
    pixelsToMeters(pixels, pixelPitch = 0.28) {
        console.warn('Deprecated use View#getPixelsToMeters instead.');
        const scaled = this.getScale(pixelPitch);
        const size = pixels * pixelPitch;
        return size / scaled / 1000;
    }

    /**
     * To convert the projection a number of horizontal pixels of screen to longitude degree WGS84 on the globe
     * @param      {number} pixels count pixels to project
     * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number} projection in degree on globe
     *
     * @deprecated Use `View#getPixelsToMeters` and `GlobeControls#metersToDegrees`
     * instead.
     */
    pixelsToDegrees(pixels, pixelPitch = 0.28) {
        console.warn('Deprecated, use View#getPixelsToMeters and GlobeControls#getMetersToDegrees instead.');
        const chord = this.pixelsToMeters(pixels, pixelPitch);
        return THREE.MathUtils.radToDeg(2 * Math.asin(chord / (2 * ellipsoidSizes.x)));
    }

    /**
     * Projection on screen in pixels of length in meter on globe
     * @param      {number}  value Length in meter on globe
     * @param      {number}  pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number}  projection in pixels on screen
     *
     * @deprecated Use `View#getMetersToPixels` instead.
     */
    metersToPixels(value, pixelPitch = 0.28) {
        console.warn('Deprecated, use View#getMetersToPixels instead.');
        const scaled = this.getScale(pixelPitch);
        pixelPitch /= 1000;
        return value * scaled / pixelPitch;
    }

    /**
     * Changes the zoom of the central point of screen so that screen acts as a map with a specified scale.
     *  The view flies to the desired zoom scale;
     * @param      {number}  scale  The scale
     * @param      {number}  pitch  The pitch
     * @param      {boolean}  isAnimated  Indicates if animated
     * @return     {Promise}
     */
    setScale(scale, pitch, isAnimated) {
        return this.lookAtCoordinate({ scale, pitch }, isAnimated);
    }

    /**
     * Changes the center of the scene on screen to the specified in lat, lon. See {@linkcode Coordinates} for conversion.
     * This function allows to change the central position, the zoom, the range, the scale and the camera orientation at the same time.
     * The zoom has to be between the [getMinZoom(), getMaxZoom()].
     * Zoom parameter is ignored if range is set
     * The tilt's interval is between 4 and 89.5 degree
     *
     * @param {CameraUtils~CameraTransformOptions|Extent} [params] - camera transformation to apply
     * @param {number} [params.zoom] - zoom
     * @param {number} [params.scale] - scale
     * @param {boolean} [isAnimated] - Indicates if animated
     * @return {Promise} A promise that resolves when transformation is complete
     */
    lookAtCoordinate(params = {}, isAnimated = this.isAnimationEnabled()) {
        this.player.stop();

        if (!params.isExtent) {
            if (params.zoom) {
                params.range = this.view.tileLayer.computeDistanceCameraFromTileZoom(params.zoom, this.view.camera);
            } else if (params.scale) {
                params.range = this.view.getScaleFromDistance(params.pitch, params.scale);
                if (params.range < this.minDistance || params.range > this.maxDistance) {
                    // eslint-disable-next-line no-console
                    console.warn(`This scale ${params.scale} can not be reached`);
                    params.range = THREE.MathUtils.clamp(params.range, this.minDistance, this.maxDistance);
                }
            }

            if (params.tilt !== undefined) {
                const minTilt = 90 - THREE.MathUtils.radToDeg(this.maxPolarAngle);
                const maxTilt = 90 - THREE.MathUtils.radToDeg(this.minPolarAngle);
                if (params.tilt < minTilt || params.tilt > maxTilt) {
                    params.tilt = THREE.MathUtils.clamp(params.tilt, minTilt, maxTilt);
                    // eslint-disable-next-line no-console
                    console.warn('Tilt was clamped to ', params.tilt, ` the interval is between ${minTilt} and ${maxTilt} degree`);
                }
            }
        }

        previous = CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera);
        if (isAnimated) {
            params.callback = r => cameraTarget.position.copy(r.targetWorldPosition);
            this.dispatchEvent({ type: 'animation-started' });
            return CameraUtils.animateCameraToLookAtTarget(this.view, this.camera, params)
                .then((result) => {
                    this.dispatchEvent({ type: 'animation-ended' });
                    this.handlingEvent(result);
                    return result;
                });
        } else {
            return CameraUtils.transformCameraToLookAtTarget(this.view, this.camera, params).then((result) => {
                cameraTarget.position.copy(result.targetWorldPosition);
                this.handlingEvent(result);
                return result;
            });
        }
    }

    /**
     * Pick a position on the globe at the given position in lat,lon. See {@linkcode Coordinates} for conversion.
     * @param {Vector2} windowCoords - window coordinates
     * @param {number=} y - The y-position inside the Globe element.
     * @return {Coordinates} position
     */
    pickGeoPosition(windowCoords) {
        const pickedPosition = this.view.getPickingPositionFromDepth(windowCoords);

        if (!pickedPosition) {
            return;
        }

        return new Coordinates('EPSG:4978')
            .setFromVector3(pickedPosition)
            .as('EPSG:4326');
    }
}

export default GlobeControls;
