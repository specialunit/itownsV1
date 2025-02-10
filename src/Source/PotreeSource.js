import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import PotreeBinParser from 'Parser/PotreeBinParser';
import PotreeCinParser from 'Parser/PotreeCinParser';

/**
 * PotreeSource are object containing informations on how to fetch points cloud resources.
 */

class PotreeSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * PotreeSource
     * @param {string} source.url - folder url.
     * @param {string} source.file - cloud file name.
     *
     * This `cloud` file stores information about the potree cloud in JSON format. the structure is :
     *
     * * __`version`__ - The cloud.js format may change over time. The version number is
     * necessary so that parsers know how to interpret the data.
     * * __`octreeDir`__ - Directory or URL where node data is stored. Usually points to
     * "data".
     * * __`boundingBox`__ - Contains the minimum and maximum of the axis aligned bounding box. This bounding box is cubic and aligned to fit to the octree root.
     * * __`tightBoundingBox`__ - This bounding box thightly fits the point data.
     * * __`pointAttributes`__ - Declares the point data format. May be 'LAS', 'LAZ' or in case if the BINARY format an array of attributes like
     * `['POSITION_CARTESIAN', 'COLOR_PACKED', 'INTENSITY']`
     * * __`POSITION_CARTESIAN`__ - 3 x 32bit signed integers for x/y/z coordinates
     * * __`COLOR_PACKED`__ - 4 x unsigned byte for r,g,b,a colors.
     * * __`spacing`__ - The minimum distance between points at root level.
     * ```
     * {
     *     version: '1.6',
     *     octreeDir: 'data',
     *     boundingBox: {
     *         lx: -4.9854,
     *         ly: 1.0366,
     *         lz: -3.4494,
     *         ux: 0.702300000000001,
     *         uy: 6.7243,
     *         uz: 2.2383
     *     },
     *     tightBoundingBox: {
     *         lx: -4.9854,
     *         ly: 1.0375,
     *         lz: -3.4494,
     *         ux: -0.7889,
     *         uy: 6.7243,
     *         uz: 1.1245
     *     },
     *     pointAttributes: [
     *         'POSITION_CARTESIAN',
     *         'COLOR_PACKED'
     *     ],
     *     spacing: 0.03,
     *     scale: 0.001,
     *     hierarchyStepSize: 5
     * }
     * ```
     *
     * @extends Source
     */
    constructor(source) {
        if (!source.file) {
            throw new Error('New PotreeSource: file is required');
        }
        if (!source.crs) {
            // with better data and the spec this might be removed
            throw new Error('New PotreeSource: crs is required');
        }

        super(source);
        this.file = source.file;
        this.fetcher = Fetcher.arrayBuffer;
        this.extensionOctree = 'hrc';

        // For cloud specification visit:
        // https://github.com/PropellerAero/potree-propeller-private/blob/master/docs/file_format.md#cloudjs
        this.whenReady = (source.cloud ? Promise.resolve(source.cloud) : Fetcher.json(`${this.url}/${this.file}`, this.networkOptions))
            .then((cloud) => {
                this.pointAttributes = cloud.pointAttributes;
                this.baseurl = `${this.url}/${cloud.octreeDir}/r`;
                this.extension = cloud.pointAttributes === 'CIN' ? 'cin' : 'bin';
                this.parse = this.extension === 'cin' ? PotreeCinParser.parse : PotreeBinParser.parse;

                return cloud;
            });
    }
}

export default PotreeSource;
