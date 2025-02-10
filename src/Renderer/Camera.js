import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import DEMUtils from 'Utils/DEMUtils';
import { OBB } from 'ThreeExtended/math/OBB';

/**
 * @typedef     {object}    Camera~CAMERA_TYPE
 * Stores the different types of camera usable in iTowns.
 *
 * @property    {number}    PERSPECTIVE     Perspective type of camera
 * @property    {number}    ORTHOGRAPHIC    Orthographic type of camera
 */
export const CAMERA_TYPE = {
    PERSPECTIVE: 0,
    ORTHOGRAPHIC: 1,
};

const tmp = {
    frustum: new THREE.Frustum(),
    matrix: new THREE.Matrix4(),
    box3: new THREE.Box3(),
    obb: new OBB(),
};

const _vector3 = new THREE.Vector3();

const ndcBox3 = new THREE.Box3(
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3(1, 1, 1),
);
const ndcObb = new OBB().fromBox3(ndcBox3);

function updatePreSse(camera, height, fov) {
    // sse = projected geometric error on screen plane from distance
    // We're using an approximation, assuming that the geometric error of all
    // objects is perpendicular to the camera view vector (= we always compute
    // for worst case).
    //
    //            screen plane             object
    //               |                         __
    //               |                        /  \
    //               |             geometric{|
    //  < fov angle  . } sse          error {|    |
    //               |                        \__/
    //               |
    //               |<--------------------->
    //               |        distance
    //
    //              geometric_error * screen_width      (resp. screen_height)
    //     =  ---------------------------------------
    //        2 * distance * tan (horizontal_fov / 2)   (resp. vertical_fov)
    //
    //
    // We pre-compute the preSSE (= constant part of the screen space error formula) once here

    // Note: the preSSE for the horizontal FOV is the same value
    // focal = (this.height * 0.5) / Math.tan(verticalFOV * 0.5);
    // horizontalFOV = 2 * Math.atan(this.width * 0.5 / focal);
    // horizontalPreSSE = this.width / (2.0 * Math.tan(horizontalFOV * 0.5)); (1)
    // => replacing horizontalFOV in Math.tan(horizontalFOV * 0.5)
    // Math.tan(horizontalFOV * 0.5) = Math.tan(2 * Math.atan(this.width * 0.5 / focal) * 0.5)
    //                               = Math.tan(Math.atan(this.width * 0.5 / focal))
    //                               = this.width * 0.5 / focal
    // => now replacing focal
    //                               = this.width * 0.5 / (this.height * 0.5) / Math.tan(verticalFOV * 0.5)
    //                               = Math.tan(verticalFOV * 0.5) * this.width / this.height
    // => back to (1)
    // horizontalPreSSE = this.width / (2.0 * Math.tan(verticalFOV * 0.5) * this.width / this.height)
    //                  = this.height / 2.0 * Math.tan(verticalFOV * 0.5)
    //                  = verticalPreSSE

    if (camera.camera3D.isOrthographicCamera) {
        camera._preSSE = height;
    } else {
        const verticalFOV = THREE.MathUtils.degToRad(fov);
        camera._preSSE = height / (2.0 * Math.tan(verticalFOV * 0.5));
    }
}

/**
 * Wrapper around Three.js camera to expose some geographic helpers.
 *
 * @property    {string}    crs             The camera's coordinate projection system.
 * @property    {THREE.Camera}    camera3D        The Three.js camera that is wrapped around.
 * @property    {number}    width           The width of the camera.
 * @property    {number}    height          The height of the camera.
 * @property    {number}    _preSSE         The precomputed constant part of the screen space error.
 */
class Camera {
    #_viewMatrixNeedsUpdate = true;
    #_viewMatrix = new THREE.Matrix4();

    /**
     * @param   {string}                crs                                     The camera's coordinate projection system.
     * @param   {number}                width                                   The width (in pixels) of the view the
        * camera is associated to.
     * @param   {number}                height                                  The height (in pixels) of the view the
        * camera is associated to.
     * @param   {Object}                [options]                               Options for the camera.
     * @param   {THREE.Camera}          [options.cameraThree]                   A custom Three.js camera object to wrap
        * around.
     * @param   {Camera~CAMERA_TYPE}    [options.type=CAMERA_TYPE.PERSPECTIVE]  The type of the camera. See {@link
        * CAMERA_TYPE}.
     * @constructor
     */
    constructor(crs, width, height, options = {}) {
        this.crs = crs;

        if (options.isCamera) {
            console.warn('options.camera parameter is deprecated. Use options.camera.cameraThree to place a custom ' +
                'camera as a parameter. See the documentation of Camera.');
            this.camera3D = options;
        } else if (options.cameraThree) {
            this.camera3D = options.cameraThree;
        } else {
            switch (options.type) {
                case CAMERA_TYPE.ORTHOGRAPHIC:
                    this.camera3D = new THREE.OrthographicCamera();
                    break;
                case CAMERA_TYPE.PERSPECTIVE:
                default:
                    this.camera3D = new THREE.PerspectiveCamera(30);
                    break;
            }
        }
        this.camera3D.aspect = this.camera3D.aspect ?? 1;

        this.width = width;
        this.height = height;
        this.resize(width, height);

        this._preSSE = Infinity;

        if (this.camera3D.isPerspectiveCamera) {
            let fov = this.camera3D.fov;
            Object.defineProperty(this.camera3D, 'fov', {
                get: () => fov,
                set: (newFov) => {
                    fov = newFov;
                    updatePreSse(this, this.height, fov);
                },
            });
        }
    }

    /**
     * Resize the camera to a given width and height.
     *
     * @param {number} width The width to resize the camera to. Must be strictly positive, won't resize otherwise.
     * @param {number} height The height to resize the camera to. Must be strictly positive, won't resize otherwise.
     */
    resize(width, height) {
        if (!width || width <= 0 || !height || height <= 0) {
            console.warn(`Trying to resize the Camera with invalid height (${height}) or width (${width}). Skipping resize.`);
            return;
        }
        const ratio = width / height;
        if (this.camera3D.aspect !== ratio) {
            if (this.camera3D.isOrthographicCamera) {
                this.camera3D.zoom *= this.width / width;
                const halfH = this.camera3D.top * this.camera3D.aspect / ratio;
                this.camera3D.bottom = -halfH;
                this.camera3D.top = halfH;
            } else if (this.camera3D.isPerspectiveCamera) {
                this.camera3D.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(
                    (height / this.height) * Math.tan(THREE.MathUtils.degToRad(this.camera3D.fov) / 2),
                ));
            }
            this.camera3D.aspect = ratio;
        }

        this.width = width;
        this.height = height;
        updatePreSse(this, this.height, this.camera3D.fov);

        if (this.camera3D.updateProjectionMatrix) {
            this.camera3D.updateProjectionMatrix();
            this.#_viewMatrixNeedsUpdate = true;
        }
    }

    update() {
        // update matrix
        this.camera3D.updateMatrixWorld();
        this.#_viewMatrixNeedsUpdate = true;
    }

    /**
     * Return the position in the requested CRS, or in camera's CRS if undefined.
     *
     * @param   {string}        [crs]   If defined (e.g 'EPSG:4326'), the camera position will be returned in this CRS.
     *
     * @return  {Coordinates}   Coordinates object holding camera's position.
     */
    position(crs) {
        return new Coordinates(this.crs)
            .setFromVector3(this.camera3D.position)
            .as(crs || this.crs);
    }

    /**
     * Set the position of the camera using a Coordinates object.
     * If you want to modify the position directly using x,y,z values then use `camera.camera3D.position.set(x, y, z)`
     *
     * @param   {Coordinates}   position    The new position of the camera.
     */
    setPosition(position) {
        this.camera3D.position.copy(position.as(this.crs));
    }

    isBox3Visible(box3, matrixWorld) {
        return this.box3SizeOnScreen(box3, matrixWorld).intersectsBox(ndcBox3);
    }

    isObbVisible(obb, matrixWorld) {
        return this.obbSizeOnScreen(obb, matrixWorld).intersectsOBB(ndcObb);
    }

    isSphereVisible(sphere, matrixWorld) {
        if (this.#_viewMatrixNeedsUpdate) {
            // update visibility testing matrix
            this.#_viewMatrix.multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse);
            this.#_viewMatrixNeedsUpdate = false;
        }
        if (matrixWorld) {
            tmp.matrix.multiplyMatrices(this.#_viewMatrix, matrixWorld);
            tmp.frustum.setFromProjectionMatrix(tmp.matrix);
        } else {
            tmp.frustum.setFromProjectionMatrix(this.#_viewMatrix);
        }
        return tmp.frustum.intersectsSphere(sphere);
    }

    box3SizeOnScreen(box3, matrixWorld) {
        const pts = projectBox3PointsInCameraSpace(this, box3, matrixWorld);

        // All points are in front of the near plane -> box3 is invisible
        if (!pts) {
            return tmp.box3.makeEmpty();
        }

        // Project points on screen
        for (let i = 0; i < 8; i++) {
            pts[i].applyMatrix4(this.camera3D.projectionMatrix);
        }

        return tmp.box3.setFromPoints(pts);
    }

    obbSizeOnScreen(obb, matrixWorld) {
        const pts = projectObbPointsInCameraSpace(this, obb, matrixWorld);

        // All points are in front of the near plane -> box3 is invisible
        if (!pts) {
            tmp.obb.halfSize = _vector3;
            return tmp.obb;
        }

        // Project points on screen
        for (let i = 0; i < 8; i++) {
            pts[i].applyMatrix4(this.camera3D.projectionMatrix);
        }

        return tmp.obb.fromBox3(tmp.box3.setFromPoints(pts));
    }

    /**
     * Test for collision between camera and a geometry layer (DTM/DSM) to adjust camera position.
     * It could be modified later to handle an array of geometry layers.
     * TODO Improve Coordinates class to handle altitude for any coordinate system (even projected one)
     *
     * @param   {View}              view                    The view where we test the collision between geometry layers
     * and the camera
     * @param   {ElevationLayer}    elevationLayer          The elevation layer (DTM/DSM) used to test the collision
     * with the camera. Could be another geometry layer.
     * @param   {number}            minDistanceCollision    The minimum distance allowed between the camera and the
     * surface.
     */
    adjustAltitudeToAvoidCollisionWithLayer(view, elevationLayer, minDistanceCollision) {
        // We put the camera location in geographic by default to easily handle altitude.
        // (Should be improved in Coordinates class for all ref)
        const camLocation = view.camera.position().as('EPSG:4326');
        if (elevationLayer !== undefined) {
            const elevationUnderCamera = DEMUtils.getElevationValueAt(elevationLayer, camLocation);
            if (elevationUnderCamera !== undefined) {
                const difElevation = camLocation.altitude - (elevationUnderCamera + minDistanceCollision);
                // We move the camera to avoid collision if too close to terrain
                if (difElevation < 0) {
                    camLocation.altitude = elevationUnderCamera + minDistanceCollision;
                    view.camera3D.position.copy(camLocation.as(view.referenceCrs));
                    view.notifyChange(this.camera3D);
                }
            }
        }
    }
}


const points = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
];

function projectBox3PointsInCameraSpace(camera, box3, matrixWorld) {
    // Projects points in camera space
    // We don't project directly on screen to avoid artifacts when projecting
    // points behind the near plane.
    let m = camera.camera3D.matrixWorldInverse;
    if (matrixWorld) {
        m = tmp.matrix.multiplyMatrices(camera.camera3D.matrixWorldInverse, matrixWorld);
    }
    points[0].set(box3.min.x, box3.min.y, box3.min.z).applyMatrix4(m);
    points[1].set(box3.min.x, box3.min.y, box3.max.z).applyMatrix4(m);
    points[2].set(box3.min.x, box3.max.y, box3.min.z).applyMatrix4(m);
    points[3].set(box3.min.x, box3.max.y, box3.max.z).applyMatrix4(m);
    points[4].set(box3.max.x, box3.min.y, box3.min.z).applyMatrix4(m);
    points[5].set(box3.max.x, box3.min.y, box3.max.z).applyMatrix4(m);
    points[6].set(box3.max.x, box3.max.y, box3.min.z).applyMatrix4(m);
    points[7].set(box3.max.x, box3.max.y, box3.max.z).applyMatrix4(m);

    // In camera space objects are along the -Z axis
    // So if min.z is > -near, the object is invisible
    let atLeastOneInFrontOfNearPlane = false;
    for (let i = 0; i < 8; i++) {
        if (points[i].z <= -camera.camera3D.near) {
            atLeastOneInFrontOfNearPlane = true;
        } else {
            // Clamp to near plane
            points[i].z = -camera.camera3D.near;
        }
    }

    return atLeastOneInFrontOfNearPlane ? points : undefined;
}

function projectObbPointsInCameraSpace(camera, obb, matrixWorld) {
    // Projects points in camera space
    // We don't project directly on screen to avoid artifacts when projecting
    // points behind the near plane.
    let m = camera.camera3D.matrixWorldInverse;
    if (matrixWorld) {
        m = tmp.matrix.multiplyMatrices(camera.camera3D.matrixWorldInverse, matrixWorld);
    }
    points[0].set(obb.center.x + obb.halfSize.x, obb.center.y + obb.halfSize.y, obb.center.z + obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[1].set(obb.center.x + obb.halfSize.x, obb.center.y + obb.halfSize.y, obb.center.z - obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[2].set(obb.center.x + obb.halfSize.x, obb.center.y - obb.halfSize.y, obb.center.z + obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[3].set(obb.center.x + obb.halfSize.x, obb.center.y - obb.halfSize.y, obb.center.z - obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[4].set(obb.center.x - obb.halfSize.x, obb.center.y + obb.halfSize.y, obb.center.z + obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[5].set(obb.center.x - obb.halfSize.x, obb.center.y + obb.halfSize.y, obb.center.z - obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[6].set(obb.center.x - obb.halfSize.x, obb.center.y - obb.halfSize.y, obb.center.z + obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);
    points[7].set(obb.center.x - obb.halfSize.x, obb.center.y - obb.halfSize.y, obb.center.z - obb.halfSize.z)
        .applyMatrix3(obb.rotation)
        .add(obb.position)
        .applyMatrix4(m);

    // In camera space objects are along the -Z axis
    // So if min.z is > -near, the object is invisible
    let atLeastOneInFrontOfNearPlane = false;
    for (let i = 0; i < 8; i++) {
        if (points[i].z <= -camera.camera3D.near) {
            atLeastOneInFrontOfNearPlane = true;
        } else {
            // Clamp to near plane
            points[i].z = -camera.camera3D.near;
        }
    }

    return atLeastOneInFrontOfNearPlane ? points : undefined;
}


export default Camera;
