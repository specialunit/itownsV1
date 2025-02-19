import { LazPerf } from 'laz-perf';
import { Las } from 'copc';
import proj4 from 'proj4';
import OrientationUtils from 'Utils/OrientationUtils';
import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';

function applyQuaternion(a, q) {
    // console.log('>applyQuaternion');
    // quaternion q is assumed to have unit length
    const vx = a[0];
    const vy = a[1];
    const vz = a[2];
    const qx = q.x;
    const qy = q.y;
    const qz = q.z;
    const qw = q.w;

    // console.log(a, q);

    // t = 2 * cross( q.xyz, v );
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    // console.log(tx, ty, tz);

    // v + q.w * t + cross( q.xyz, t );
    const x = vx + qw * tx + qy * tz - qz * ty;
    const y = vy + qw * ty + qz * tx - qx * tz;
    const z = vz + qw * tz + qx * ty - qy * tx;

    return [x, y, z];
}

/**
 * @typedef {Object} Header - Partial LAS header.
 * @property {number} header.pointDataRecordFormat - Type of point data
 * records contained by the buffer.
 * @property {number} header.pointDataRecordLength - Size (in bytes) of the
 * point data records. If the specified size is larger than implied by the
 * point data record format (see above) the remaining bytes are user-specfic
 * "extra bytes". Those are described by an Extra Bytes VLR.
 * @property {number[]} header.scale - Scale factors (an array `[xScale,
 * yScale, zScale]`) multiplied to the X, Y, Z point record values.
 * @property {number[]} header.offset - Offsets (an array `[xOffset,
 * xOffset, zOffset]`) added to the scaled X, Y, Z point record values.
 */

function defaultColorEncoding(header) {
    return (header.majorVersion === 1 && header.minorVersion <= 2) ? 8 : 16;
}

/**
 * @classdesc
 * Loader for LAS and LAZ (LASZip) point clouds. It uses the copc.js library and
 * the laz-perf decoder under the hood.
 *
 * The laz-perf web assembly module is lazily fetched at runtime when a parsing
 * request is initiated. Location of laz-perf wasm defaults to the unpkg
 * repository.
 */
class LASLoader {
    constructor() {
        this._wasmPath = 'https://cdn.jsdelivr.net/npm/laz-perf@0.0.6/lib';
        this._wasmPromise = null;
    }

    _initDecoder() {
        if (this._wasmPromise) {
            return this._wasmPromise;
        }

        this._wasmPromise = LazPerf.create({
            locateFile: file => `${this._wasmPath}/${file}`,
        });

        return this._wasmPromise;
    }

    _parseView(view, options) {
        const colorDepth = options.colorDepth ?? defaultColorEncoding(options.header);

        const forward = (options.in.crs !== options.out.crs) ?
            proj4(options.in.projDefs, options.out.projDefs).forward :
            (x => x);

        const getPosition = ['X', 'Y', 'Z'].map(view.getter);
        const getIntensity = view.getter('Intensity');
        const getReturnNumber = view.getter('ReturnNumber');
        const getNumberOfReturns = view.getter('NumberOfReturns');
        const getClassification = view.getter('Classification');
        const getPointSourceID = view.getter('PointSourceId');
        const getColor = view.dimensions.Red ?
            ['Red', 'Green', 'Blue'].map(view.getter) : undefined;
        const getScanAngle = view.getter('ScanAngle');

        const positions = new Float32Array(view.pointCount * 3);
        const positions2 = new Float32Array(view.pointCount * 3);
        const positions3 = new Float32Array(view.pointCount * 3);

        const intensities = new Uint16Array(view.pointCount);
        const returnNumbers = new Uint8Array(view.pointCount);
        const numberOfReturns = new Uint8Array(view.pointCount);
        const classifications = new Uint8Array(view.pointCount);
        const pointSourceIDs = new Uint16Array(view.pointCount);
        const colors = getColor ? new Uint8Array(view.pointCount * 4) : undefined;
        /*
        As described by the LAS spec, Scan Angle is encoded:
        - as signed char in a valid range from -90 to +90 (degrees) prior to the LAS 1.4 Point Data Record Formats (PDRF) 6
        - as a signed short in a valid range from -30 000 to +30 000. Those values represents scan angles from -180 to +180
          degrees with an increment of 0.006 for PDRF >= 6.
        The copc.js library does the degree convertion and stores it as a `Float32`.
        */
        const scanAngles = new Float32Array(view.pointCount);

        // For precision we use the first point to define the origin for a local referentiel.
        // After projection transformation and only the integer part for simplification.
        const origin = forward(getPosition.map(f => f(0))).map(val => Math.floor(val));
        console.log('ORIGIN trunc', origin);

        // const origin2154 = getPosition.map(f => f(0));
        const origin4978 = proj4(options.in.projDefs, options.out.projDefs).forward(getPosition.map(f => f(0)));

        console.log('ORIGIN CrsIN', options.in.crs, getPosition.map(f => f(0)), 'ORIGIN CrsOUT', options.out.crs, origin4978);
        // console.log('elevation', view.getter('Z')(0));

        const origin4326 = proj4(options.in.projDefs, 'EPSG:4326').forward(getPosition.map(f => f(0)));
        const origin4326z0 = [...origin4326];
        origin4326z0[2] = 0;
        console.log('ORIGIN 4326', origin4326, 'z0', origin4326z0);

        const originz0 = proj4('EPSG:4326', options.out.projDefs).forward(origin4326z0);
        console.log('ORIGIN 4978', origin4978, originz0);


        // const rotaGege = OrientationUtils.quaternionFromCRSToCRS2(options.in, options.out)(origin2154);
        // console.log('GEG', rotaGege, applyQuaternion(origin4978, rotaGege));

        // const isGeocentric = options.out.projDefs.projName === 'geocent';
        // if (isGeocentric) {
        //     console.log('geocentric');
        //     // const rotation = OrientationUtils.quaternionFromCRSToCRS2(options.out, 'EPSG:')(origin);
        // }
        const rotation = OrientationUtils.quaternionFromCRSToCRS2(options.out, { crs: 'EPSG:4326', projDefs: proj4.defs('EPSG:4326') })(origin);
        // const rotation = OrientationUtils.quaternionFromCRSToCRS2({ crs: 'EPSG:4326', projDefs: proj4.defs('EPSG:4326') }, options.out)(origin0);

        console.log('rotation', rotation);
        console.log('res', applyQuaternion(origin, rotation));
        // console.log('res 0', applyQuaternion([1, 1, 1], rotation));


        // try feature
        const rot2 = new THREE.Quaternion();
        const alignYtoEast = new THREE.Quaternion();
        const axisZ = new THREE.Vector3(0, 0, 1);
        const center = new Coordinates('EPSG:4978', ...origin);
        const center4326 = center.as('EPSG:4326');
        rot2.setFromUnitVectors(axisZ, center.geodesicNormal);
        // align Y axe to East
        alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + center4326.longitude));
        rot2.multiply(alignYtoEast);

        console.log('rot2', rot2);
        console.log('res2', applyQuaternion(origin, rot2.invert()));


        // try precision
        // origin         EPSG:4978 [4138305, 75526, 4836717]
        // originz0       EPSG:4978 [4138196.7584222443, 75524.83528783957, 4836589.7925684145]
        // origin4326     EPSG:4326 [1.0455698964307378, 49.6349318657391, 167.65]
        // origin4326z0   EPSG:4326 [1.0455698964307378, 49.6349318657391, 0]

        // const origin2 = [origin[0] - originz0[0], origin[1] - originz0[1], origin[2] - originz0[2]];
        // const origin2 = [origin[0], origin[1], origin[2]];
        // console.log(origin2);

        // const res3 = applyQuaternion(origin2, rotation);
        // console.log('res3', res3);
        // console.log('res3b', applyQuaternion(origin2, rot2.invert()));
        // console.log('res3c', applyQuaternion([0, 0, 0], rot2.invert()));

        for (let i = 0; i < view.pointCount; i++) {
            // `getPosition` apply scale and offset transform to the X, Y, Z
            // values. See https://github.com/connormanning/copc.js/blob/master/src/las/extractor.ts.
            // we thus apply the projection to get values in the Crs of the view.
            const point = getPosition.map(f => f(i));
            const [x, y, z] = forward(point);
            positions[i * 3] = x - origin[0];
            positions[i * 3 + 1] = y - origin[1];
            positions[i * 3 + 2] = z - origin[2];


            const pos2 = applyQuaternion([x - originz0[0], y - originz0[1], z - originz0[2]], rotation);
            const pos3 = applyQuaternion([x - origin4978[0], y - origin4978[1], z - origin4978[2]], rotation);
            if (i === 0) {
                console.log('i=0', [x, y, z], originz0, pos2, pos3);
            }
            // console.log([x - originz0[0], y - originz0[1], z - originz0[2]], pos2);

            positions2[i * 3] = pos2[0];
            positions2[i * 3 + 1] = pos2[1];
            positions2[i * 3 + 2] = pos2[2];

            positions3[i * 3] = pos3[0];
            positions3[i * 3 + 1] = pos3[1];
            positions3[i * 3 + 2] = pos3[2];

            intensities[i] = getIntensity(i);
            returnNumbers[i] = getReturnNumber(i);
            numberOfReturns[i] = getNumberOfReturns(i);

            if (getColor) {
                // Note that we do not infer color depth as it is expensive
                // (i.e. traverse the whole view to check if there exists a red,
                // green or blue value > 255).
                let [r, g, b] = getColor.map(f => f(i));

                if (colorDepth === 16) {
                    r /= 256;
                    g /= 256;
                    b /= 256;
                }

                colors[i * 4] = r;
                colors[i * 4 + 1] = g;
                colors[i * 4 + 2] = b;
                colors[i * 4 + 3] = 255;
            }

            classifications[i] = getClassification(i);
            pointSourceIDs[i] = getPointSourceID(i);
            scanAngles[i] = getScanAngle(i);
        }

        return {
            position: positions,
            position2: positions2,
            position3: positions3,
            intensity: intensities,
            returnNumber: returnNumbers,
            numberOfReturns,
            classification: classifications,
            pointSourceID: pointSourceIDs,
            color: colors,
            scanAngle: scanAngles,
            origin,
            originz0,
            origin4978,
            rotation: [
                rotation.x,
                rotation.y,
                rotation.z,
                rotation.w,
            ],
        };
    }

    /**
     * Set LazPerf decoder path.
     * @param {string} path - path to `laz-perf.wasm` folder.
     */
    set lazPerf(path) {
        this._wasmPath = path;
        this._wasmPromise = null;
    }

    /**
     * Parses a LAS or LAZ (LASZip) chunk. Note that this function is
     * **CPU-bound** and shall be parallelised in a dedicated worker.
     * @param {Uint8Array} data - File chunk data.
     * @param {Object} options - Parsing options.
     * @param {Header} options.header - Partial LAS header.
     * @param {number} options.pointCount - Number of points encoded in this
     * data chunk.
     * @param {Las.ExtraBytes[]} [options.eb] - Extra bytes LAS VLRs
     * headers.
     * @param {8 | 16} [options.colorDepth] - Color depth encoding (in bits).
     * Either 8 or 16 bits. Defaults to 8 bits for LAS 1.2 and 16 bits for later
     * versions (as mandatory by the specification).
     */
    async parseChunk(data, options) {
        const { header, eb, pointCount } = options;
        const { pointDataRecordFormat, pointDataRecordLength } = header;

        const bytes = new Uint8Array(data);
        const pointData = await Las.PointData.decompressChunk(bytes, {
            pointCount,
            pointDataRecordFormat,
            pointDataRecordLength,
        }, this._initDecoder());

        const view = Las.View.create(pointData, header, eb);
        const attributes = this._parseView(view, options);
        return { attributes };
    }

    /**
     * Parses a LAS or LAZ (LASZip) file. Note that this function is
     * **CPU-bound** and shall be parallelised in a dedicated worker.
     * @param {ArrayBuffer} data - Binary data to parse.
     * @param {Object} [options] - Parsing options.
     * @param {8 | 16} [options.colorDepth] - Color depth encoding (in bits).
     * Either 8 or 16 bits. Defaults to 8 bits for LAS 1.2 and 16 bits for later
     * versions (as mandatory by the specification)
     */
    async parseFile(data, options = {}) {
        const bytes = new Uint8Array(data);

        const pointData = await Las.PointData.decompressFile(bytes, this._initDecoder());

        const header = Las.Header.parse(bytes);
        options.header = header;

        const getter = async (begin, end) => bytes.slice(begin, end);
        const vlrs = await Las.Vlr.walk(getter, header);
        const ebVlr = Las.Vlr.find(vlrs, 'LASF_Spec', 4);
        const eb = ebVlr && Las.ExtraBytes.parse(await Las.Vlr.fetch(getter, ebVlr));

        const view = Las.View.create(pointData, header, eb);
        const attributes = this._parseView(view, options);
        return {
            header,
            attributes,
        };
    }
}

export default LASLoader;
