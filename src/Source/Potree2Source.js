import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import Potree2BinParser from 'Parser/Potree2BinParser';

/**
 * Potree2Source are object containing informations on how to fetch potree 2.0 points cloud resources.
 */

class Potree2Source extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * Potree2Source
     * @param {string} source.url - folder url.
     * @param {string} source.file - metadata file name.
     *
     * This `metadata` file stores information about the potree cloud 2.0 in JSON format. the structure is :
     *
     * * __`version`__ - The metadata.json format may change over time. The version number is
     * necessary so that parsers know how to interpret the data.
     * * __`name`__ - Point cloud name.
     * * __`description`__ - Point cloud description.
     * * __`points`__ - Total number of points.
     * * __`projection`__ - Point cloud geographic projection system.
     * * __`hierarchy`__ - Information about point cloud hierarchy (first chunk size, step size, octree depth).
     * * __`offset`__ - Position offset used to determine the global point position.
     * * __`scale`__ - Point cloud scale.
     * * __`spacing`__ - The minimum distance between points at root level.
     * * __`boundingBox`__ - Contains the minimum and maximum of the axis aligned bounding box. This bounding box is cubic and aligned to fit to the octree root.
     * * __`encoding`__ - Encoding type: BROTLI or DEFAULT (uncompressed).
     * * __`attributes`__ - Array of attributes (position,  intensity, return number, number of returns, classification, scan angle rank, user data, point source id, gps-time, rgb).
     * ```
     * {
     *     version: '2.0',
     *     name: "sample",
     *     description: "",
     *     points: 534909153,
     *     projection: "",
     *     hierarchy: {
     *         firstChunkSize: 1276,
     *         stepSize: 4,
     *         depth: 16
     *     },
     *     offset: [1339072.07, 7238866.339, 85.281],
     *     scale: [0.001, 0.001, 0.002],
     *     spacing: 24.476062500005355,
     *     boundingBox: {
     *         min: [1339072.07, 7238866.339, 85.281],
     *         max: [1342205.0060000008, 7241999.275, 3218.2170000006854]
     *     },
     *     encoding: "BROTLI",
     *     attributes: [
     *          {
     *              name: "position",
     *              description: "",
     *              size: 12,
     *              numElements: 3,
     *              elementSize: 4,
     *              type: "int32",
     *              min: [-0.74821299314498901, -2.7804059982299805, 2.5478212833404541],
     *              max: [2.4514148223438199, 1.4893437627414672, 7.1957106576508663]
     *          },
     *          {
     *              name: "intensity",
     *              description: "",
     *              size: 2,
     *              numElements: 1,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "return number",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "number of returns",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "classification",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "scan angle rank",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "user data",
     *              description: "",
     *              size: 1,
     *              numElements: 1,
     *              elementSize: 1,
     *              type: "uint8",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "point source id",
     *              description: "",
     *              size: 2,
     *              numElements: 1,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "gps-time",
     *              description: "",
     *              size: 8,
     *              numElements: 1,
     *              elementSize: 8,
     *              type: "double",
     *              min: [0],
     *              max: [0]
     *          },{
     *              name: "rgb",
     *              description: "",
     *              size: 6,
     *              numElements: 3,
     *              elementSize: 2,
     *              type: "uint16",
     *              min: [5632, 5376, 4864],
     *              max: [65280, 65280, 65280]
     *          }
     *     ]
     * }
     * ```
     *
     * @extends Source
     */
    constructor(source) {
        if (!source.file) {
            throw new Error('New Potree2Source: file is required');
        }
        if (!source.crs) {
            // with better data and the spec this might be removed
            throw new Error('New PotreeSource: crs is required');
        }

        super(source);
        this.file = source.file;
        this.fetcher = Fetcher.arrayBuffer;

        this.whenReady = (source.metadata ? Promise.resolve(source.metadata) : Fetcher.json(`${this.url}/${this.file}`, this.networkOptions))
            .then((metadata) => {
                this.metadata = metadata;
                this.pointAttributes = metadata.attributes;
                this.baseurl = `${this.url}`;
                this.extension = 'bin';
                this.parser = Potree2BinParser.parse;

                return metadata;
            });
    }
}

export default Potree2Source;
