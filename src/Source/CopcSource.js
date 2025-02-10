import proj4 from 'proj4';
import { Binary, Info, Las } from 'copc';
import Fetcher from 'Provider/Fetcher';
import LASParser from 'Parser/LASParser';
import Source from 'Source/Source';

/**
 * @param {function(number, number):Promise<Uint8Array>} fetcher
 */
async function getHeaders(fetcher) {
    const header =
        Las.Header.parse(await fetcher(0, Las.Constants.minHeaderLength));
    const vlrs = await Las.Vlr.walk(fetcher, header);

    // info VLR: required by COPC
    const infoVlr = Las.Vlr.find(vlrs, 'copc', 1);
    if (!infoVlr) { return Promise.reject('COPC info VLR is required'); }
    const info = Info.parse(await Las.Vlr.fetch(fetcher, infoVlr));

    // OGC Coordinate System WKT: required by LAS1.4
    const wktVlr = Las.Vlr.find(vlrs, 'LASF_Projection', 2112);
    if (!wktVlr) { return Promise.reject('LAS1.4 WKT VLR is required'); }
    const wkt = Binary.toCString(await Las.Vlr.fetch(fetcher, wktVlr));

    // Extra bytes: optional by LAS1.4
    const ebVlr = Las.Vlr.find(vlrs, 'LASF_Spec', 4);
    const eb = ebVlr ?
        Las.ExtraBytes.parse(await Las.Vlr.fetch(fetcher, ebVlr)) :
        [];

    return { header, info, wkt, eb };
}

/**
 * A source for [Cloud Optimised Point Cloud](https://copc.io/) (COPC) data.
 * Such data consists of a [LAZ 1.4](https://www.ogc.org/standard/las/) file
 * that stores compressed points data organized in a clustered octree.
 *
 * A freshly created source fetches and parses portions of the file
 * corresponding to the LAS 1.4 header, all the Variable Length Record (VLR)
 * headers as well the following VLRs:
 * - COPC [`info`](https://copc.io/#info-vlr) record (mandatory)
 * - LAS 1.4 `OGC Coordinate System WKT` record (mandatory, see [Las 1.4
 *   spec](https://portal.ogc.org/files/?artifact_id=74523))
 * - LAS 1.4 `Extra Bytes` record (optional, see [Las 1.4
 *   spec](https://portal.ogc.org/files/?artifact_id=74523))
 *
 * @extends {Source}
 *
 * @property {boolean} isCopcSource - Read-only flag to check that a given
 * object is of type CopcSource.
 * @property {Object} header - LAS header of the source.
 * @property {Object[]} eb - List of headers of each Variable Length Records
 * (VLRs).
 * @property {Object} info - COPC `info` VLR.
 * @property {number[]} info.cube - Bounding box of the octree as a 6-elements.
 * tuple `[minX, minY, minZ, maxX, maxY, maxZ]`. Computed from `center_x`,
 * `center_y`, `center_z` and `halfSize` properties.
 * @property {Object} info.rootHierarchyPage - Hierarchy page of the root node.
 * @property {number} info.rootHierarchyPage.pageOffset - Absolute Offset to the
 * root node data chunk.
 * @property {number} info.rootHierarchyPage.pageOffset - Size (in bytes) of the
 * root node data chunk.
 * @property {number[]} gpsTimeRange - A 2-element tuple denoting the minimum
 * and maximum values of attribute `gpsTime`.
 */
class CopcSource extends Source {
    /**
     * @param {Object} config - Source configuration
     * @param {string} config.url - URL of the COPC resource.
     * @param {8 | 16} [config.colorDepth=16] - Encoding of the `color`
     * attribute. Either `8` or `16` bits.
     * @param {string} [config._lazPerfBaseUrl] - (experimental) Overrides base
     * url of the `las-zip.wasm` file of the `laz-perf` library.
     * @param {string} [config.crs='EPSG:4326'] - Native CRS of the COPC
     * ressource. Note that this is not for now inferred from the COPC header.
     * @param {RequestInit} [config.networkOptions] - Fetch options (passed
     * directly to `fetch()`), see [the syntax for more information](
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
     * @param {Object} [config.attribution] - Attribution of the data.
     */
    constructor(config) {
        super(config);

        this.isCopcSource = true;

        this.parser = LASParser.parseChunk;
        this.fetcher = Fetcher.arrayBuffer;

        this.colorDepth = config.colorDepth ?? 16;

        const get = (/** @type {number} */ begin, /** @type {number} */ end) =>
            this.fetcher(this.url, {
                ...this.networkOptions,
                headers: {
                    ...this.networkOptions.headers,
                    range: `bytes=${begin}-${end - 1}`,
                },
            }).then(buffer => new Uint8Array(buffer));
        this.whenReady = getHeaders(get).then((metadata) => {
            this.header = metadata.header;
            this.info = metadata.info;
            this.eb = metadata.eb;

            proj4.defs('unknown', metadata.wkt);
            let projCS;

            if (proj4.defs('unknown').type === 'COMPD_CS') {
                console.warn('CopcSource: compound coordinate system is not yet supported.');
                projCS = proj4.defs('unknown').PROJCS;
            } else {
                projCS = proj4.defs('unknown');
            }

            this.crs = projCS.title || projCS.name || 'EPSG:4326';
            if (!(this.crs in proj4.defs)) {
                proj4.defs(this.crs, projCS);
            }

            return this;
        });
    }
}

export default CopcSource;
