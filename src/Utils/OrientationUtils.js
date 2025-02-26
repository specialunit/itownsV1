import * as THREE from 'three';
import proj4 from 'proj4';
import Coordinates from '../Core/Geographic/Coordinates';

const DEG2RAD = THREE.MathUtils.DEG2RAD;
const matrix = new THREE.Matrix4();
const north = new THREE.Vector3();
const east = new THREE.Vector3();
const axis = new THREE.Vector3().set(0, 0, 1);
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const euler = new THREE.Euler();
const quat = new THREE.Quaternion();

function quaternionIdentity(coordinates, target = new THREE.Quaternion()) {
    return coordinates ? target.set(0, 0, 0, 1) : quaternionIdentity;
}

/**
 * The OrientationUtils module provides methods to compute the quaternion that
 * models a rotation defined with various conventions, including between different
 * CRS.
 * The local <a href="https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates#Local_east,_north,_up_(ENU)_coordinates">
 * East/North/Up frame (ENU)</a> is used as a pivot frame when computing the rotation between two distinct CRS.
 * If the origin of the frame is undefined, CRS-related methods precompute and return a function
 * that can be applied efficiently to many points of origin.
 * Otherwise, the target quaternion is returned at the provided origin coordinates.
 *
 * @example
 * // Compute the rotation around the point of origin from a frame aligned with Lambert93 axes (epsg:2154),
 * // to the geocentric frame (epsg:4978)
 * quat_crs2crs = OrientationUtils.quaternionFromCRSToCRS("EPSG:2154", "EPSG:4978")(origin);
 * // Compute the rotation of a sensor platform defined by its attitude
 * quat_attitude = OrientationUtils.quaternionFromAttitude(attitude);
 * // Compute the rotation from the sensor platform frame to the geocentric frame
 * quat = quat_crs2crs.multiply(quat_attitude);
 *
 * @module OrientationUtils
 */
export default {
    /**
     * @typedef {Object} Attitude
     * Properties are either defined as (omega, phi, kappa) or as (roll, pitch,
     * heading) or all `undefined`.
     *
     * @property {number} omega - angle in degrees
     * @property {number} phi - angle in degrees
     * @property {number} kappa - angle in degrees
     * @property {number} roll - angle in degrees
     * @property {number} pitch - angle in degrees
     * @property {number} heading - angle in degrees
     */

    /**
     * The transform from the platform frame to the local East, North, Up (ENU)
     * frame is `RotationZ(heading).RotationX(pitch).RotationY(roll)`
     *
     * @param {number} [roll=0] - angle in degrees
     * @param {number} [pitch=0] - angle in degrees
     * @param {number} [heading=0] - angle in degrees
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] - output Quaternion
     *
     * @return {THREE.Quaternion} target quaternion
     */
    quaternionFromRollPitchHeading(roll = 0, pitch = 0, heading = 0, target = new THREE.Quaternion()) {
        roll *= DEG2RAD;
        pitch *= DEG2RAD;
        heading *= DEG2RAD;
        // return this.setFromEuler(euler.set(pitch, roll, heading , 'ZXY')).conjugate();
        return target.setFromEuler(euler.set(-pitch, -roll, -heading, 'YXZ')); // optimized version of above
    },

    /**
     * From
     * [DocMicMac](https://github.com/micmacIGN/Documentation/raw/master/DocMicMac.pdf),
     * the transform from the platform frame to the local East, North, Up (ENU)
     * frame is:
     *
     * ```
     * RotationX(omega).RotationY(phi).RotationZ(kappa).RotationX(PI)
     * RotationX(PI) <=> Quaternion(1,0,0,0) : converts between the 2 conventions for the camera local frame:
     * X right, Y bottom, Z front : convention in photogrammetry and computer vision
     * X right, Y top,    Z back  : convention in webGL, threejs
     * ```
     *
     * @param {number} [omega=0] - angle in degrees
     * @param {number} [phi=0] - angle in degrees
     * @param {number} [kappa=0] - angle in degrees
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     *
     * @return {THREE.Quaternion} target quaternion
     */
    quaternionFromOmegaPhiKappa(omega = 0, phi = 0, kappa = 0, target = new THREE.Quaternion()) {
        omega *= DEG2RAD;
        phi *= DEG2RAD;
        kappa *= DEG2RAD;
        target.setFromEuler(euler.set(omega, phi, kappa, 'XYZ'));
        target.set(target.w, target.z, -target.y, -target.x); // <=> target.multiply(new THREE.Quaternion(1, 0, 0, 0));
        return target;
    },

    /**
     * Set the quaternion according to the rotation from the platform frame to
     * the local frame.
     *
     * @param {Attitude} attitude - Attitude
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     *
     * @return {THREE.Quaternion} target quaternion
     */
    quaternionFromAttitude(attitude, target = new THREE.Quaternion()) {
        if ((attitude.roll !== undefined) || (attitude.pitch !== undefined) || (attitude.heading !== undefined)) {
            return this.quaternionFromRollPitchHeading(attitude.roll, attitude.pitch, attitude.heading, target);
        }
        if ((attitude.omega !== undefined) || (attitude.phi !== undefined) || (attitude.kappa !== undefined)) {
            return this.quaternionFromOmegaPhiKappa(attitude.omega, attitude.phi, attitude.kappa, target);
        }
        return target.set(0, 0, 0, 1);
    },

    /**
     * @typedef {Function|THREE.Quaternion} FunctionOrQuaternion - Either a
     * THREE.Quaternion or a function that accepts arguments `(coordinates,
     * target)` and returns the quaternion that models a rotation around the
     * point of origin. If target is not provided, a new quaternion is created
     * and returned instead.
     *
     * @property {Coordinates} coordinates the origin of the local East North Up
     * (ENU) frame
     * @property {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion.
     */

    /**
     * A Projection object models a Coordinate Reference System (CRS).
     * Such an object is usually created with proj4 using `proj4.defs(crs);`
     *
     * @typedef {Object} Projection
     *
     * @property {string} projName
     */

    /**
     * Set the quaternion according to the rotation from the local East North Up (ENU)
     * frame to the geocentric frame. The up direction of the ENU frame is
     * provided by the normalized geodetic normal of the provided coordinates
     * (geodeticNormal property).
     *
     * @param {Coordinates} [coordinates] the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromEnuToGeocent(coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromEnuToGeocent()(coordinates, target); }
        return (coordinates, target = new THREE.Quaternion()) => {
            const up = coordinates.geodesicNormal;
            if (up.x == 0 && up.y == 0) {
                return target.set(0, 0, 0, 1);
            }
            // this is an optimized version of matrix.lookAt(up, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
            east.set(-up.y, up.x, 0).normalize();
            north.crossVectors(up, east);
            matrix.makeBasis(east, north, up);
            return target.setFromRotationMatrix(matrix);
        };
    },

    /**
     * Set the quaternion according to the rotation from a geocentric frame
     * to the local East North Up (ENU) frame. The up direction of the ENU frame is
     * provided by the normalized geodetic normal of the provided coordinates
     * (geodeticNormal property).
     *
     * @param {Coordinates} [coordinates] the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromGeocentToEnu(coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromGeocentToEnu()(coordinates, target); }
        const toGeocent = this.quaternionFromEnuToGeocent();
        return (coordinates, target = new THREE.Quaternion()) => toGeocent(coordinates, target).conjugate();
    },


    /**
     * Computes the rotation from a Lambert Conformal Conic (LCC) frame to the local East North Up (ENU) frame.
     * The quaternion accounts for the
     * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0060.pdf">meridian convergence</a>
     * between the ENU and LCC frames.
     * This is a generally small rotation around Z.
     *
     * @param {Object} proj the lcc projection (may be parsed using proj4)
     * @param {number} proj.lat0 - the latitude of origin
     * @param {number} proj.long0 - the longitude of the central meridian
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
    */
    quaternionFromLCCToEnu(proj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromLCCToEnu(proj)(coordinates, target); }
        const sinlat0 = Math.sin(proj.lat0);
        return (coordinates, target = new THREE.Quaternion()) => {
            const long = coordinates.as(coord.crs, coord).longitude * DEG2RAD;
            return target.setFromAxisAngle(axis, sinlat0 * (proj.long0 - long));
        };
    },

    /**
     * Computes the rotation from the local East North Up (ENU) frame to a Lambert Conformal Conic (LCC) frame.
     * The quaternion accounts for the
     * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0060.pdf">meridian convergence</a>
     * between the ENU and LCC frames.
     * This is a generally small rotation around Z.
     *
     * @param {Object} proj the lcc projection (may be parsed using proj4)
     * @param {number} proj.lat0 - the latitude of origin
     * @param {number} proj.long0 - the longitude of the central meridian
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
    */
    quaternionFromEnuToLCC(proj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromEnuToLCC(proj)(coordinates, target); }
        const fromLCC = this.quaternionFromLCCToEnu(proj);
        return (coordinates, target = new THREE.Quaternion()) => fromLCC(coordinates, target).conjugate();
    },

    /**
     * Computes the rotation from a Transverse Mercator frame (TMerc) to the local East North Up (ENU) frame.
     * The quaternion accounts for the
     * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0061.pdf">meridian convergence</a>
     * between the ENU and TMerc frames.
     * This is a generally small rotation around Z.
     *
     * @param {Object} proj the tmerc projection (may be parsed using proj4)
     * @param {number} proj.e - the excentricity of the ellipsoid (supersedes {proj.a} and {proj.b})
     * @param {number} proj.a - the semimajor radius of the ellipsoid axis
     * @param {number} proj.b - the semiminor radius of the ellipsoid axis
     * @param {number} proj.long0 - the longitude of the central meridian
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
    */
    quaternionFromTMercToEnu(proj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromTMercToEnu(proj)(coordinates, target); }
        const a2 = proj.a * proj.a;
        const b2 = proj.b * proj.b;
        const e2 = proj.e * proj.e;
        const eta0 = proj.e ? (e2 / (1 - e2)) : (a2 / b2 - 1);
        return (coordinates, target = new THREE.Quaternion()) => {
            coordinates.as(coord.crs, coord);
            const long = coord.longitude * DEG2RAD;
            const lat = coord.latitude * DEG2RAD;
            const dlong = proj.long0 - long;
            const coslat = Math.cos(lat);
            const sinlat = Math.sin(lat);
            const tanlat = sinlat / coslat;
            const coslat2 = coslat * coslat;
            const dl2 = dlong * dlong * coslat2;
            const eta2 = eta0 * coslat2;
            const gamma = dlong * sinlat * (1 + dl2 / 3 * (1 + 3 * eta2 + 2 * eta2 * eta2) + dl2 * dl2 * (2 - tanlat) / 15);
            return target.setFromAxisAngle(axis, gamma);
        };
    },

    /**
     * Computes the rotation from the local East North Up (ENU) to a Transverse Mercator frame.
     * The quaternion accounts for the
     * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0061.pdf">meridian convergence</a>
     * between the ENU and TMerc frames.
     * This is a generally small rotation around Z.
     *
     * @param {Object} proj the tmerc projection (may be parsed using proj4)
     * @param {number} proj.e - the excentricity of the ellipsoid (supersedes
     * {proj.a} and {proj.b})
     * @param {number} proj.a - the semimajor radius of the ellipsoid axis
     * @param {number} proj.b - the semiminor radius of the ellipsoid axis
     * @param {number} proj.long0 - the longitude of the central meridian
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
    */
    quaternionFromEnuToTMerc(proj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromEnuToTMerc(proj)(coordinates, target); }
        const fromTMerc = this.quaternionFromTMercToEnu(proj);
        return (coordinates, target = new THREE.Quaternion()) => fromTMerc(coordinates, target).conjugate();
    },

    /**
     * Computes the rotation from a LongLat frame to the local East North Up (ENU) frame.
     * The identity quaternion (0,0,0,1) is returned, as longlat and ENU frame are assumed to be aligned.
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromLongLatToEnu(coordinates, target = new THREE.Quaternion()) {
        return quaternionIdentity(coordinates, target);
    },

    /**
    * Computes the rotation from the local East North Up (ENU) frame to a LongLat frame.
    * The identity quaternion (0,0,0,1) is returned, as longlat and ENU frame are assumed to be aligned.
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromEnuToLongLat(coordinates, target = new THREE.Quaternion()) {
        return quaternionIdentity(coordinates, target);
    },


    /**
     * Warns for an unimplemented projection, sets the quaternion to the
     * identity (0,0,0,1).
     *
     * @param {Projection} proj - the unimplemented projection (may be parsed
     * using proj4)
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionUnimplemented(proj, coordinates, target = new THREE.Quaternion()) {
        console.warn('This quaternion function is not implemented for projections of type', proj.projName);
        return quaternionIdentity(coordinates, target);
    },

    /**
     * Compute the quaternion that models the rotation from the local East North
     * Up (ENU) frame to the frame of the given crs.
     *
     * @param {string|Projection} crsOrProj - the CRS of the target frame or its
     * proj4-compatible object.
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromEnuToCRS(crsOrProj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromEnuToCRS(crsOrProj)(coordinates, target); }
        const proj = crsOrProj.projName ? crsOrProj : proj4.defs(crsOrProj);
        switch (proj.projName) {
            case 'geocent': return this.quaternionFromEnuToGeocent();
            case 'lcc': return this.quaternionFromEnuToLCC(proj);
            case 'tmerc': return this.quaternionFromEnuToTMerc(proj);
            case 'longlat': return this.quaternionFromEnuToLongLat();
            default: return this.quaternionUnimplemented(proj);
        }
    },

    /**
     * Compute the quaternion that models the rotation from the frame of the
     * given crs to the local East North Up (ENU) frame.
     *
     * @param {string|Projection} crsOrProj - the CRS of the source frame or its
     * proj4-compatible object.
     *
     * @param {Coordinates} [coordinates]  coordinates the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
     */
    quaternionFromCRSToEnu(crsOrProj, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromCRSToEnu(crsOrProj)(coordinates, target); }
        const proj = crsOrProj.projName ? crsOrProj : proj4.defs(crsOrProj);
        switch (proj.projName) {
            case 'geocent': return this.quaternionFromGeocentToEnu();
            case 'lcc': return this.quaternionFromLCCToEnu(proj);
            case 'tmerc': return this.quaternionFromTMercToEnu(proj);
            case 'longlat': return this.quaternionFromLongLatToEnu();
            default: return this.quaternionUnimplemented(proj);
        }
    },

    /**
     * Return the function that computes the quaternion that represents a
     * rotation of coordinates between two CRS frames.
     *
     * @param {string} crsIn - the CRS of the input frame.
     * @param {string} crsOut - the CRS of the output frame.
     * @param {Coordinates} [coordinates]  coordinates - the origin of the local East North Up
     * (ENU) frame
     * @param {THREE.Quaternion} [target=new THREE.Quaternion()] output Quaternion
     * @return {FunctionOrQuaternion} The target quaternion if coordinates is defined, otherwise, a function to compute it from coordinates.
    */
    quaternionFromCRSToCRS(crsIn, crsOut, coordinates, target = new THREE.Quaternion()) {
        if (coordinates) { return this.quaternionFromCRSToCRS(crsIn, crsOut)(coordinates, target); }
        if (crsIn == crsOut) {
            return (origin, target = new THREE.Quaternion()) => target.set(0, 0, 0, 1);
        }

        // get rotations from the local East/North/Up (ENU) frame to both CRS.
        const fromCrs = this.quaternionFromCRSToEnu(crsIn);
        const toCrs = this.quaternionFromEnuToCRS(crsOut);
        return (origin, target = new THREE.Quaternion()) => {
            if (!origin.isCoordinates) {
                origin = new Coordinates(crsIn, ...origin);
            }
            return toCrs(origin, target).multiply(fromCrs(origin, quat));
        };
    },
};
