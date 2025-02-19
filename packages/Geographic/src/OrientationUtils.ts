import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import proj4 from 'proj4';
import type { ProjectionDefinition } from 'proj4';
import Coordinates from './Coordinates';

const DEG2RAD = MathUtils.DEG2RAD;
const matrix = new Matrix4();
const north = new Vector3();
const east = new Vector3();
const axis = new Vector3().set(0, 0, 1);
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const euler = new Euler();
const quat = new Quaternion();

interface EulerAngles {
    /** angle in degrees */
    roll: number;
    /** angle in degrees */
    pitch: number;
    /** angle in degrees */
    heading: number;
}

interface PhotogrammetryAngles {
    /** angle in degrees */
    omega: number;
    /** angle in degrees */
    phi: number;
    /** angle in degrees */
    kappa: number;
}

type Attitude = Partial<EulerAngles> | Partial<PhotogrammetryAngles>;

type QuaternionFunction = (coords: Coordinates, target?: Quaternion) => Quaternion;

type ProjectionLike = ProjectionDefinition | string;
type LCCProjection = { long0: number, lat0: number };
type TMercProjection = { a: number, b: number, e?: number, long0: number };

/**
 * The transform from the platform frame to the local East, North, Up (ENU)
 * frame is `RotationZ(heading).RotationX(pitch).RotationY(roll)`.
 *
 * @param roll - angle in degrees. Default is 0.
 * @param pitch - angle in degrees. Default is 0.
 * @param heading - angle in degrees. Default is 0
 * @param target - output Quaternion
 *
 * @returns The target quaternion
 */
export function quaternionFromRollPitchHeading(
    roll = 0,
    pitch = 0,
    heading = 0,
    target = new Quaternion(),
) {
    roll *= DEG2RAD;
    pitch *= DEG2RAD;
    heading *= DEG2RAD;
    // return setFromEuler(euler.set(pitch, roll, heading , 'ZXY')).conjugate();
    // Below is optimized version of above line
    return target.setFromEuler(euler.set(-pitch, -roll, -heading, 'YXZ'));
}

/**
 * From
 * [DocMicMac](https://github.com/micmacIGN/Documentation/raw/master/DocMicMac.pdf),
 * the transform from the platform frame to the local East, North, Up (ENU)
 * frame is:
 *
 * ```
 * RotationX(omega).RotationY(phi).RotationZ(kappa).RotationX(PI)
 * Converts between the 2 conventions for the camera local frame:
 * RotationX(PI) <=> Quaternion(1,0,0,0)
 * X right, Y bottom, Z front : convention in photogrammetry and computer vision
 * X right, Y top,    Z back  : convention in webGL, threejs
 * ```
 *
 * @param omega - angle in degrees. Default is 0.
 * @param phi - angle in degrees. Default is 0.
 * @param kappa - angle in degrees. Default is 0.
 * @param target - output quaternion
 *
 * @returns The target quaternion
 */
export function quaternionFromOmegaPhiKappa(
    omega = 0,
    phi = 0,
    kappa = 0,
    target = new Quaternion(),
) {
    omega *= DEG2RAD;
    phi *= DEG2RAD;
    kappa *= DEG2RAD;
    target.setFromEuler(euler.set(omega, phi, kappa, 'XYZ'));
    target.set(target.w, target.z, -target.y, -target.x);
    // <=> target.multiply(new THREE.Quaternion(1, 0, 0, 0));
    return target;
}

/**
 * Sets the quaternion according to the rotation from the platform frame to the
 * local frame.
 *
 * @param attitude - either euler angles or photogrammetry angles
 * @param target - output Quaternion
 *
 * @returns The target quaternion
 */
export function quaternionFromAttitude(attitude: Attitude, target = new Quaternion()) {
    if ('roll' in attitude || 'pitch' in attitude || 'heading' in attitude) {
        return quaternionFromRollPitchHeading(
            attitude.roll, attitude.pitch, attitude.heading,
            target,
        );
    }
    if ('omega' in attitude || 'phi' in attitude || 'kappa' in attitude) {
        return quaternionFromOmegaPhiKappa(
            attitude.omega, attitude.phi, attitude.kappa,
            target,
        );
    }
    return target.set(0, 0, 0, 1);
}

export function quaternionFromEnuToGeocent(): QuaternionFunction;
export function quaternionFromEnuToGeocent(coords: Coordinates, target?: Quaternion): Quaternion;
/**
 * Sets the quaternion according to the rotation from the local East North Up
 * (ENU) frame to the geocentric frame. The up direction of the ENU frame is
 * provided by the normalized geodetic normal of the provided coordinates
 * (geodeticNormal property).
 *
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromEnuToGeocent(coordinates?: Coordinates, target = new Quaternion()) {
    if (coordinates) { return quaternionFromEnuToGeocent()(coordinates, target); }
    return (coordinates: Coordinates, target = new Quaternion()) => {
        const up = coordinates.geodesicNormal;
        if (up.x == 0 && up.y == 0) {
            return target.set(0, 0, 0, 1);
        }
        // this is an optimized version of
        // matrix.lookAt(up, new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
        east.set(-up.y, up.x, 0).normalize();
        north.crossVectors(up, east);
        matrix.makeBasis(east, north, up);
        return target.setFromRotationMatrix(matrix);
    };
}

export function quaternionFromGeocentToEnu(): QuaternionFunction;
export function quaternionFromGeocentToEnu(coords: Coordinates, target?: Quaternion): Quaternion;
/**
 * Sets the quaternion according to the rotation from a geocentric frame
 * to the local East North Up (ENU) frame. The up direction of the ENU frame is
 * provided by the normalized geodetic normal of the provided coordinates
 * (geodeticNormal property).
 *
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromGeocentToEnu(coordinates?: Coordinates, target = new Quaternion()) {
    if (coordinates) { return quaternionFromGeocentToEnu()(coordinates, target); }
    const toGeocent = quaternionFromEnuToGeocent();
    return (coordinates: Coordinates, target = new Quaternion()) =>
        toGeocent(coordinates, target).conjugate();
}


export function quaternionFromLCCToEnu(proj: LCCProjection): QuaternionFunction;
export function quaternionFromLCCToEnu(
    proj: LCCProjection,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Computes the rotation from a Lambert Conformal Conic (LCC) frame to the local
 * East North Up (ENU) frame.
 * The quaternion accounts for the
 * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0060.pdf">meridian convergence</a>
 * between the ENU and LCC frames.
 * This is a generally small rotation around Z.
 *
 * @param proj - the lcc projection (may be parsed using proj4)
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromLCCToEnu(
    proj: LCCProjection,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromLCCToEnu(proj)(coordinates, target); }
    const sinlat0 = Math.sin(proj.lat0);
    return (coordinates: Coordinates, target = new Quaternion()) => {
        const long = coordinates.as(coord.crs, coord).longitude * DEG2RAD;
        return target.setFromAxisAngle(axis, sinlat0 * (proj.long0 - long));
    };
}

export function quaternionFromEnuToLCC(proj: LCCProjection): QuaternionFunction;
export function quaternionFromEnuToLCC(
    proj: LCCProjection,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Computes the rotation from the local East North Up (ENU) frame to a Lambert
 * Conformal Conic (LCC) frame. The quaternion accounts for the
 * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0060.pdf">meridian convergence</a>
 * between the ENU and LCC frames.
 * This is a generally small rotation around Z.
 *
 * @param proj - the lcc projection (may be parsed using proj4)
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromEnuToLCC(
    proj: LCCProjection,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromEnuToLCC(proj)(coordinates, target); }
    const fromLCC = quaternionFromLCCToEnu(proj);
    return (coordinates: Coordinates, target = new Quaternion()) =>
        fromLCC(coordinates, target).conjugate();
}

export function quaternionFromTMercToEnu(proj: TMercProjection): QuaternionFunction;
export function quaternionFromTMercToEnu(
    proj: TMercProjection,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Computes the rotation from a Transverse Mercator frame (TMerc) to the
 * local East North Up (ENU) frame. The quaternion accounts for the
 * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0061.pdf">meridian convergence</a>
 * between the ENU and TMerc frames.
 * This is a generally small rotation around Z.
 *
 * @param proj - the tmerc projection (may be parsed using proj4)
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromTMercToEnu(
    proj: TMercProjection,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromTMercToEnu(proj)(coordinates, target); }
    let eta0;
    if (!proj.e) {
        const a2 = proj.a * proj.a;
        const b2 = proj.b * proj.b;
        eta0 = (a2 / b2 - 1);
    } else {
        const e2 = proj.e * proj.e;
        eta0 = (e2 / (1 - e2));
    }
    return (coordinates: Coordinates, target = new Quaternion()) => {
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
        const gamma = dlong * sinlat * (
            1 + dl2 / 3 * (1 + 3 * eta2 + 2 * eta2 * eta2) + dl2 * dl2 * (2 - tanlat) / 15
        );
        return target.setFromAxisAngle(axis, gamma);
    };
}

export function quaternionFromEnuToTMerc(proj: TMercProjection): QuaternionFunction;
export function quaternionFromEnuToTMerc(
    proj: TMercProjection,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Computes the rotation from the local East North Up (ENU) to a Transverse
 * Mercator frame. The quaternion accounts for the
 * <a href="https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0061.pdf">meridian convergence</a>
 * between the ENU and TMerc frames.
 * This is a generally small rotation around Z.
 *
 * @param proj - the tmerc projection (may be parsed using proj4)
 * @param coordinates - origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined. Otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromEnuToTMerc(
    proj: TMercProjection,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromEnuToTMerc(proj)(coordinates, target); }
    const fromTMerc = quaternionFromTMercToEnu(proj);
    return (coordinates: Coordinates, target = new Quaternion()) =>
        fromTMerc(coordinates, target).conjugate();
}

export function quaternionFromLongLatToEnu(): QuaternionFunction;
export function quaternionFromLongLatToEnu(coords: Coordinates, target?: Quaternion): Quaternion;
/**
 * Computes the rotation from a LongLat frame to the local East North Up
 * (ENU) frame. The identity quaternion (0,0,0,1) is returned, as longlat
 * and ENU frame are assumed to be aligned.
 *
 * @param coordinates - coordinates the origin of the local East North Up
 * (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromLongLatToEnu(coordinates?: Coordinates, target = new Quaternion()) {
    return coordinates ? target.set(0, 0, 0, 1) :
        (coordinates: Coordinates, target = new Quaternion()) =>
            quaternionFromLongLatToEnu(coordinates, target);
}

export function quaternionFromEnuToLongLat(): QuaternionFunction;
export function quaternionFromEnuToLongLat(coords: Coordinates, target?: Quaternion): Quaternion;
/**
 * Computes the rotation from the local East North Up (ENU) frame to a
 * LongLat frame. The identity quaternion (0,0,0,1) is returned, as longlat
 * and ENU frame are assumed to be aligned.
 *
 * @param coordinates - the origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromEnuToLongLat(coordinates?: Coordinates, target = new Quaternion()) {
    return coordinates ? target.set(0, 0, 0, 1) :
        (coordinates: Coordinates, target = new Quaternion()) =>
            quaternionFromEnuToLongLat(coordinates, target);
}


export function quaternionUnimplemented(proj: { projName?: string }): QuaternionFunction;
export function quaternionUnimplemented(
    proj: { projName?: string },
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Warns for an unimplemented projection, sets the quaternion to the
 * identity (0,0,0,1).
 *
 * @param proj - the unimplemented projection (may be parsed using proj4)
 * @param coordinates - the origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionUnimplemented(
    proj: { projName?: string },
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    console.warn(
        'This quaternion function is not implemented for projections of type',
        proj.projName,
    );
    return coordinates ? target.set(0, 0, 0, 1) :
        (coordinates: Coordinates, target = new Quaternion()) =>
            quaternionUnimplemented(proj, coordinates, target);
}

export function quaternionFromEnuToCRS(proj: ProjectionLike): QuaternionFunction;
export function quaternionFromEnuToCRS(
    proj: ProjectionLike,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Compute the quaternion that models the rotation from the local East North
 * Up (ENU) frame to the frame of the given crs.
 *
 * @param crsOrProj - the CRS of the target frame or its proj4-compatible
 * object.
 * @param coordinates - the origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromEnuToCRS(
    crsOrProj: ProjectionLike,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromEnuToCRS(crsOrProj)(coordinates, target); }
    const proj = typeof crsOrProj === 'string' ? proj4.defs(crsOrProj) : crsOrProj;
    switch (proj.projName) {
        case 'geocent': return quaternionFromEnuToGeocent();
        case 'lcc': return quaternionFromEnuToLCC(proj as LCCProjection);
        case 'tmerc': return quaternionFromEnuToTMerc(proj as TMercProjection);
        case 'longlat': return quaternionFromEnuToLongLat();
        default: return quaternionUnimplemented(proj);
    }
}

export function quaternionFromCRSToEnu(proj: ProjectionLike): QuaternionFunction;
export function quaternionFromCRSToEnu(
    proj: ProjectionLike,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Compute the quaternion that models the rotation from the frame of the
 * given crs to the local East North Up (ENU) frame.
 *
 * @param crsOrProj - the CRS of the target frame or its proj4-compatible
 * object.
 * @param coordinates - the origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromCRSToEnu(
    crsOrProj: ProjectionLike,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromCRSToEnu(crsOrProj)(coordinates, target); }
    const proj = typeof crsOrProj === 'string' ? proj4.defs(crsOrProj) : crsOrProj;
    switch (proj.projName) {
        case 'geocent': return quaternionFromGeocentToEnu();
        case 'lcc': return quaternionFromLCCToEnu(proj as LCCProjection);
        case 'tmerc': return quaternionFromTMercToEnu(proj as TMercProjection);
        case 'longlat': return quaternionFromLongLatToEnu();
        default: return quaternionUnimplemented(proj);
    }
}

export function quaternionFromCRSToCRS(
    crsIn: ProjectionLike,
    crsOut: ProjectionLike,
): QuaternionFunction;
export function quaternionFromCRSToCRS(
    crsIn: ProjectionLike,
    crsOut: ProjectionLike,
    coords: Coordinates,
    target?: Quaternion,
): Quaternion;
/**
 * Return the function that computes the quaternion that represents a
 * rotation of coordinates between two CRS frames.
 *
 * @param crsIn - the CRS of the input frame.
 * @param crsOut - the CRS of the output frame.
 * @param coordinates - the origin of the local East North Up (ENU) frame
 * @param target - output Quaternion
 * @returns The target quaternion if coordinates is defined, otherwise, a
 * function to compute it from coordinates.
 */
export function quaternionFromCRSToCRS(
    crsIn: ProjectionLike,
    crsOut: ProjectionLike,
    coordinates?: Coordinates,
    target = new Quaternion(),
) {
    if (coordinates) { return quaternionFromCRSToCRS(crsIn, crsOut)(coordinates, target); }
    if (crsIn == crsOut) {
        return (origin: Coordinates, target = new Quaternion()) => target.set(0, 0, 0, 1);
    }

    // get rotations from the local East/North/Up (ENU) frame to both CRS.
    const fromCrs = quaternionFromCRSToEnu(crsIn);
    const toCrs = quaternionFromEnuToCRS(crsOut);
    return (origin: Coordinates, target = new Quaternion()) =>
        toCrs(origin, target).multiply(fromCrs(origin, quat));
}
