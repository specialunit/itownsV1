import * as THREE from 'three';
import proj4 from 'proj4';
import Ellipsoid from './Ellipsoid';
import * as CRS from './Crs';

import type { ProjectionLike } from './Crs';

const ellipsoid = new Ellipsoid();
const projectionCache: Record<string, Record<string, proj4.Converter>> = {};

const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();

let coord0: Coordinates;
let coord1: Coordinates;

export interface CoordinatesLike {
    readonly crs: string;
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

function proj4cache(crsIn: string, crsOut: string): proj4.Converter {
    if (!projectionCache[crsIn]) {
        projectionCache[crsIn] = {};
    }

    if (!projectionCache[crsIn][crsOut]) {
        projectionCache[crsIn][crsOut] = proj4(crsIn, crsOut);
    }

    return projectionCache[crsIn][crsOut];
}

/**
 * A class representing a geographic or geocentric coordinate.
 *
 * A coordinate is defined by a [CRS](http://inspire.ec.europa.eu/theme/rs)
 * (Coordinate Reference System) and a 3-dimensional vector `(x, y, z)`.
 * For geocentric projections, it is recommended to use the `latitude`,
 * `longitude` and `altitude` aliases to refer to vector components.
 *
 * To change a value, prefer the use of the `set*` methods.
 *
 * By default, the `EPSG:4978` and `EPSG:4326` projections are supported. To use
 * a different projection, it must have been declared previously with `proj4`.
 * A comprehensive list of projections and their corresponding proj4 string can
 * be found at [epsg.io](https://epsg.io/).
 *
 * @example Geocentric coordinates
 * ```js
 * new Coordinates('EPSG:4978', 20885167, 849862, 23385912);
 * ```
 *
 * @example Geographic coordinates
 * ```js
 * new Coordinates('EPSG:4326', 2.33, 48.24, 24999549);
 * ```
 *
 * @example Defining the EPSG:2154 projection with proj4
 * ```js
 * proj4.defs('EPSG:2154', `+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44
 * +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m
 * +no_defs +type=crs`);
 * ```
 */
class Coordinates {
    /**
     * Read-only flag to check if a given object is of type `Coordinates`.
     */
    readonly isCoordinates: boolean;
    /**
     * A default or user-defined CRS (see {@link ProjectionLike}).
     */
    crs: ProjectionLike;

    /** The x value (or longitude) of this coordinate. */
    x: number;
    /** The y value (or latitude) of this coordinate. */
    y: number;
    /** The z value (or altitude) of this coordinate. */
    z: number;

    private _normal: THREE.Vector3;
    private _normalNeedsUpdate: boolean;

    /**
     * @param crs - A default or user-defined CRS (see {@link ProjectionLike}).
     * @param x - x or longitude value.
     * @param y - y or latitude value.
     * @param z - z or altitude value.
     */
    constructor(crs: ProjectionLike, x: number = 0, y: number = 0, z: number = 0) {
        this.isCoordinates = true;

        CRS.isValid(crs);
        this.crs = crs;

        // Storing the coordinates as is, not in arrays, as it is
        // slower (see https://jsbench.me/40jumfag6g/1)
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Normal
        this._normal = new THREE.Vector3();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((x as any).length > 0) { // deepscan-disable-line
            console.warn(
                'Deprecated Coordinates#constructor(string, number[]),',
                'use `new Coordinates(string).setFromArray(number[])` instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromArray(x as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((x as any).isVector3 || (x as any).isCoordinates) {
            console.warn(
                'Deprecated Coordinates#constructor(string, Vector3),',
                'use `new Coordinates(string).setFromVector3(Vector3)` instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromVector3(x as any);
        } else {
            this.setFromValues(x, y, z);
        }

        this._normalNeedsUpdate = true;
    }

    /**
     * Sets the Coordinate Reference System.
     * @param crs - Coordinate Reference System (e.g. 'EPSG:4978')
     */
    setCrs(crs: ProjectionLike): this {
        CRS.isValid(crs);
        this.crs = crs;
        return this;
    }

    /**
     * Sets the x, y and z components of this coordinate.
     *
     * @param x - x or longitude value.
     * @param y - y or latitude value.
     * @param z - z or altitude value.
     */
    setFromValues(x: number = 0, y: number = 0, z: number = 0): this {
        this.x = x;
        this.y = y;
        this.z = z;

        this._normalNeedsUpdate = true;
        return this;
    }

    /**
     * Sets the coordinates's {@link Coordinates#x | x} component to
     * `array[offset + 0]`, {@link Coordinates#y | y} component to
     * `array[offset + 1]` and {@link Coordinates#z | z} component to
     * `array[offset + 2]`.
     *
     * @param array - The source array.
     * @param offset - Optional offset into the array. Default is 0.
     */
    setFromArray(array: number[], offset: number = 0): this {
        return this.setFromValues(
            array[offset],
            array[offset + 1],
            array[offset + 2],
        );
    }

    /**
     * Sets the `(x, y, z)` vector of this coordinate from a 3-dimensional
     * vector-like object. This object shall have both `x`, `y` and `z`
     * properties.
     *
     * @param v - The source object.
     */
    setFromVector3(v: THREE.Vector3Like): this {
        return this.setFromValues(v.x, v.y, v.z);
    }

    /**
     * Returns a new coordinate with the same `(x, y, z)` vector and crs as this
     * one.
     */
    clone(): Coordinates {
        return new Coordinates(this.crs, this.x, this.y, this.z);
    }

    /**
     * Copies the `(x, y, z)` vector components and crs of the passed coordinate
     * to this coordinate.
     *
     * @param src - The source coordinate to copy from.
     */
    copy(src: CoordinatesLike): this {
        this.crs = src.crs;
        return this.setFromVector3(src);
    }

    get longitude() {
        return this.x;
    }

    get latitude() {
        return this.y;
    }

    get altitude() {
        return this.z;
    }

    set altitude(value) {
        this.z = value;
    }

    /**
     * The geodesic normal of the coordinate.
     */
    get geodesicNormal() {
        if (this._normalNeedsUpdate) {
            this._normalNeedsUpdate = false;

            if (CRS.is4326(this.crs)) {
                ellipsoid.geodeticSurfaceNormalCartographic(this, this._normal);
            } else if (this.crs == 'EPSG:4978') {
                ellipsoid.geodeticSurfaceNormal(this, this._normal);
            } else {
                this._normal.set(0, 0, 1);
            }
        }

        return this._normal;
    }

    /**
     * Copies the `x`, `y` and `z` components into the provided `THREE.Vector3`.
     *
     * @param target - An object to store this vector to. If this is not
     * specified, a new vector will be created.
     *
     * @returns A vector `(x, y, z)`, or copies x, y and z into the provided
     * vector.
     */
    toVector3(target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
        return target.copy(this);
    }

    /**
     * Copies the `x`, `y` and `z` components into the provided array.
     *
     * @param array - An array to store this vector to. If this is not
     * provided a new array will be created.
     * @param offset - An optional offset into the array.
     *
     * @returns An array [x, y, z], or copies x, y and z into the provided
     * array.
     */
    toArray(array: number[] = [], offset: number = 0): ArrayLike<number> {
        return THREE.Vector3.prototype.toArray.call(this, array, offset);
    }

    /**
     * Computes the planar distance from this coordinates to `coord`.
     * **Planar distance** is the straight-line euclidean distance calculated in
     * a 2D cartesian coordinate system.
     */
    planarDistanceTo(coord: Coordinates): number {
        this.toVector3(v0).setZ(0);
        coord.toVector3(v1).setZ(0);
        return v0.distanceTo(v1);
    }

    /**
     * Computes the geodetic distance from this coordinates to `coord`.
     * **Geodetic distance** is calculated in an ellipsoid space as the shortest
     * distance across the curved surface of the ellipsoid.
     */
    geodeticDistanceTo(coord: Coordinates): number {
        this.as('EPSG:4326', coord0);
        coord.as('EPSG:4326', coord1);
        return ellipsoid.geodesicDistance(coord0, coord1);
    }

    /**
     * Computes the euclidean distance from this coordinates to `coord` in a
     * WGS84 projection.
     *
     * @param coord - The coordinate
     * @returns earth euclidean distance
     */
    spatialEuclideanDistanceTo(coord: Coordinates): number {
        this.as('EPSG:4978', coord0).toVector3(v0);
        coord.as('EPSG:4978', coord1).toVector3(v1);
        return v0.distanceTo(v1);
    }

    /**
     * Multiplies this coordinate (with an implicit 1 in the 4th dimension)
     * by `mat`, and divides by perspective.
     *
     * @param mat - The matrix.
     */
    applyMatrix4(mat: THREE.Matrix4): this {
        THREE.Vector3.prototype.applyMatrix4.call(this, mat);
        return this;
    }

    /**
     * Projects this coordinate to the specified
     * [CRS](http://inspire.ec.europa.eu/theme/rs).
     *
     * @param crs - The target CRS to which the coordinate will be converted.
     * @param target - The target to store the projected coordinate. If this not
     * provided a new coordinate will be created.
     *
     * @returns The coordinate projected into the specified CRS.
     *
     * @example Conversion from a geographic to a geocentric reference system
     * ```js
     * const geographicCoords = new Coordinates('EPSG:4326',
     *     2.33,        // longitude
     *     48.24,       // latitude
     *     24999549,    // altitude
     * );
     * const geocentricCoords = geographicCoords.as('EPSG:4978');
     * ```
     *
     * @example Conversion from a geocentric to a geographic reference system
     * ```js
     * const geocentricCoords = new Coordinates('EPSG:4978',
     *     20885167,    // x
     *     849862,      // y
     *     23385912,    // z
     * );
     * const geographicCoords = geocentricCoords.as('EPSG:4326');
     * ```
     */
    as(crs: ProjectionLike, target = new Coordinates(crs)): Coordinates {
        if (this.crs == crs) {
            target.copy(this);
        } else {
            if (CRS.is4326(this.crs) && crs == 'EPSG:3857') {
                this.y = THREE.MathUtils.clamp(this.y, -89.999999, 89.999999);
            }

            target.setFromArray(proj4cache(this.crs, crs)
                .forward([this.x, this.y, this.z]));
        }

        target.crs = crs;

        return target;
    }
}

coord0 = new Coordinates('EPSG:4326', 0, 0, 0);
coord1 = new Coordinates('EPSG:4326', 0, 0, 0);

export default Coordinates;
