import * as THREE from 'three';
import { spawn, Thread, Transfer } from 'threads';
import proj4 from 'proj4';
import OrientationUtils from 'Utils/OrientationUtils';
import Coordinates from 'Core/Geographic/Coordinates';

let _lazPerf;
let _thread;

function workerInstance() {
    return new Worker(
        /* webpackChunkName: "itowns_lasparser" */
        new URL('../Worker/LASLoaderWorker.js', import.meta.url),
        { type: 'module' },
    );
}

async function loader() {
    if (_thread) { return _thread; }
    _thread = await spawn(workerInstance());
    if (_lazPerf) { _thread.lazPerf(_lazPerf); }
    return _thread;
}

function buildBufferGeometry(attributes) {
    const geometry = new THREE.BufferGeometry();

    const positionBuffer = new THREE.BufferAttribute(attributes.position, 3);
    geometry.setAttribute('position', positionBuffer);

    const intensityBuffer = new THREE.BufferAttribute(attributes.intensity, 1);
    geometry.setAttribute('intensity', intensityBuffer);

    const returnNumber = new THREE.BufferAttribute(attributes.returnNumber, 1);
    geometry.setAttribute('returnNumber', returnNumber);

    const numberOfReturns = new THREE.BufferAttribute(attributes.numberOfReturns, 1);
    geometry.setAttribute('numberOfReturns', numberOfReturns);

    const classBuffer = new THREE.BufferAttribute(attributes.classification, 1);
    geometry.setAttribute('classification', classBuffer);

    const pointSourceID = new THREE.BufferAttribute(attributes.pointSourceID, 1);
    geometry.setAttribute('pointSourceID', pointSourceID);

    if (attributes.color) {
        const colorBuffer = new THREE.BufferAttribute(attributes.color, 4, true);
        geometry.setAttribute('color', colorBuffer);
    }
    const scanAngle = new THREE.BufferAttribute(attributes.scanAngle, 1);
    geometry.setAttribute('scanAngle', scanAngle);

    geometry.userData.origin = new THREE.Vector3().fromArray(attributes.origin);
    const rotation = new THREE.Quaternion().fromArray(attributes.rotation);
    geometry.applyQuaternion(rotation);
    geometry.userData.rotation = rotation;

    return geometry;
}

function buildBufferGeometry2(position) {
    const geometry = new THREE.BufferGeometry();

    const positionBuffer = new THREE.BufferAttribute(position, 3);
    geometry.setAttribute('position', positionBuffer);

    // geometry.userData.origin = new THREE.Vector3().fromArray(attributes.originz0);

    return geometry;
}

/** The LASParser module provides a [parse]{@link
 * module:LASParser.parse} method that takes a LAS or LAZ (LASZip) file in, and
 * gives a `THREE.BufferGeometry` containing all the necessary attributes to be
 * displayed in iTowns. It uses the
 * [copc.js](https://github.com/connormanning/copc.js/) library.
 *
 * @module LASParser
 */
export default {
    /*
     * Set the laz-perf decoder path.
     * @param {string} path - path to `laz-perf.wasm` folder.
     */
    enableLazPerf(path) {
        if (!path) {
            throw new Error('Path to laz-perf is mandatory');
        }
        _lazPerf = path;
    },

    /**
     * Terminate all worker instances.
     * @returns {Promise<void>}
     */
    terminate() {
        const currentThread = _thread;
        _thread = undefined;
        return Thread.terminate(currentThread);
    },

    /**
     * Parses a chunk of a LAS or LAZ (LASZip) and returns the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} options
     * @param {Object} options.in - Options to give to the parser.
     * @param {number} options.in.pointCount - Number of points encoded in this
     * data chunk.
     * @param {Object} options.in.header - Partial LAS file header.
     * @param {number} options.in.header.pointDataRecordFormat - Type of Point
     * Data Record contained in the LAS file.
     * @param {number} options.in.header.pointDataRecordLength - Size (in bytes)
     * of the Point Data Record.
     * @param {Object} [options.eb] - Extra bytes LAS VLRs headers.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)
     *
     * @return {Promise<THREE.BufferGeometry>} A promise resolving with a
     * `THREE.BufferGeometry`.
     */
    async parseChunk(data, options = {}) {
        const lasLoader = await loader();
        const parsedData = await lasLoader.parseChunk(Transfer(data), {
            pointCount: options.in.pointCount,
            header: options.in.header,
            eb: options.in.eb,
            colorDepth: options.in.colorDepth,
            in: {
                crs: options.in.crs,
                projDefs: proj4.defs(options.in.crs),
            },
            out: {
                crs: options.out.crs,
                projDefs: proj4.defs(options.out.crs),
            },
        });

        const origin = new Coordinates(options.out.crs, ...parsedData.attributes.origin);
        console.log('parse', parsedData.attributes.origin, origin);

        const rotation = OrientationUtils.quaternionFromCRSToCRS(options.out.crs, options.in.crs)(origin);
        console.log('quaternionFromCRSToCRS', rotation);

        const geometry = buildBufferGeometry(parsedData.attributes);
        geometry.userData.rotation = rotation;
        geometry.computeBoundingBox();
        return geometry;
    },

    /**
     * Parses a LAS file or a LAZ (LASZip) file and return the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} [options]
     * @param {Object} [options.in] - Options to give to the parser.
     * @param {String} options.in.crs - Crs of the source.
     * @param {String} options.out.crs - Crs of the view.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)

     *
     * @return {Promise} A promise resolving with a `THREE.BufferGeometry`. The
     * header of the file is contained in `userData`.
     */
    async parse(data, options = {}) {
        if (options.out?.skip) {
            console.warn("Warning: options 'skip' not supported anymore");
        }

        const lasLoader = await loader();
        const parsedData = await lasLoader.parseFile(Transfer(data), {
            colorDepth: options.in.colorDepth,
            in: {
                crs: options.in.crs,
                projDefs: proj4.defs(options.in.crs),
            },
            out: {
                crs: options.out.crs,
                projDefs: proj4.defs(options.out.crs),
            },
        });
        // console.log(parsedData.attributes);

        // const origin = new Coordinates(options.out.crs, ...parsedData.attributes.origin);
        // console.log('parse', parsedData.attributes.origin, origin);

        // const rotation = OrientationUtils.quaternionFromCRSToCRS2(options.in.crs, options.out.crs)(origin);
        // console.log('quaternionFromCRSToCRS', rotation);
        const geometry = buildBufferGeometry(parsedData.attributes);
        geometry.computeBoundingBox();
        geometry.userData.header = parsedData.header;

        console.log('#################');
        // const test = new THREE.Quaternion().copy(parsedData.attributes.rotation);
        console.log(parsedData.attributes.rotation, geometry.userData.rotation);
        console.log('^^^^^');

        const geometry2 = buildBufferGeometry2(parsedData.attributes.position2);
        geometry2.computeBoundingBox();
        geometry2.userData.header = parsedData.header;
        geometry2.userData.origin = new THREE.Vector3().fromArray(parsedData.attributes.originz0);
        geometry2.userData.rotation = parsedData.attributes.rotation;

        const geometry3 = buildBufferGeometry2(parsedData.attributes.position3);
        geometry3.computeBoundingBox();
        geometry3.userData.header = parsedData.header;
        geometry3.userData.origin = new THREE.Vector3().fromArray(parsedData.attributes.origin4978);
        geometry3.userData.rotation = parsedData.attributes.rotation;

        console.log(geometry.boundingBox);
        console.log(geometry2.boundingBox);
        console.log(geometry3.boundingBox);
        return geometry;
    },
};
