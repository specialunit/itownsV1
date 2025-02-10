import { LazPerf } from 'laz-perf';
import { Las } from 'copc';
import proj4 from 'proj4';

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
        const isGeocentric = options.out.projDefs.projName === 'geocent';

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
        const elevations = new Float32Array(view.pointCount);
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

        for (let i = 0; i < view.pointCount; i++) {
            // `getPosition` apply scale and offset transform to the X, Y, Z
            // values. See https://github.com/connormanning/copc.js/blob/master/src/las/extractor.ts.
            // we thus apply the projection to get values in the Crs of the view.
            const point = getPosition.map(f => f(i));
            const [x, y, z] = forward(point);
            positions[i * 3] = x - origin[0];
            positions[i * 3 + 1] = y - origin[1];
            positions[i * 3 + 2] = z - origin[2];

            elevations[i] = z;
            // geocentric height to elevation
            if (isGeocentric) { elevations[i] = point[2]; }
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
            elevation: elevations,
            intensity: intensities,
            returnNumber: returnNumbers,
            numberOfReturns,
            classification: classifications,
            pointSourceID: pointSourceIDs,
            color: colors,
            scanAngle: scanAngles,
            origin,
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
