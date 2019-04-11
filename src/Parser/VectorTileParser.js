import * as THREE from 'three';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import Coordinates from 'Core/Geographic/Coordinates';
import { FeatureCollection } from 'Core/Feature';

const VectorTileFeature = { types: ['Unknown', 'Point', 'LineString', 'Polygon'] };
// EPSG:3857
// WGS84 bounds [-180.0, -85.06, 180.0, 85.06] (https://epsg.io/3857)
const coord = new Coordinates('EPSG:4326', 180, 85.06);
coord.as('EPSG:3857', coord);
// Get bound dimension in 'EPSG:3857'
const globalExtent = new THREE.Vector3(coord.x() * 2, coord.y() * 2, 1);

function vtFeatureToFeatureGeometry(vtFeature, geometry) {
    geometry.properties = vtFeature.properties;
    const pbf = vtFeature._pbf;
    pbf.pos = vtFeature._geometry;

    const end = pbf.readVarint() + pbf.pos;
    let cmd = 1;
    let length = 0;
    let x = 0;
    let y = 0;
    let count = 0;
    let firstPoint;
    while (pbf.pos < end) {
        if (length <= 0) {
            const cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) { // moveTo
                if (count) {
                    geometry.closeSubGeometry(count);
                }
                count = 0;
                firstPoint = undefined;
            }
            count++;
            geometry.pushCoordinatesValues(x, y);
            if (count == 1) {
                firstPoint = [x, y];
            }
        } else if (cmd === 7) {
            if (count && firstPoint) {
                count++;
                geometry.pushCoordinatesValues(firstPoint[0], firstPoint[1]);
                firstPoint = undefined;
            }
        } else {
            throw new Error(`unknown command ${cmd}`);
        }
    }

    if (count) {
        geometry.closeSubGeometry(count);
    }
}

function vtFeatureToFeature(vtFeature, features) {
    const feature = features.getFeatureByType(vtFeature.type - 1);
    const geometry = feature.bindNewGeometry();
    vtFeatureToFeatureGeometry(vtFeature, geometry);
    feature.updateExtent(geometry);
}
const defaultFilter = () => true;
function readPBF(file, options) {
    const vectorTile = new VectorTile(new Protobuf(file));
    const extentSource = options.extentSource || file.coords;
    const layers = Object.keys(vectorTile.layers);

    if (layers.length < 1) {
        return;
    }

    // x,y,z tile coordinates
    const x = extentSource.col;
    const z = extentSource.zoom;
    // We need to move from TMS to Google/Bing/OSM coordinates
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    // Only if the layer.origin is top
    const y = options.isInverted ? extentSource.row : (1 << z) - extentSource.row - 1;

    options.buildExtent = true;
    options.mergeFeatures = true;

    const features = new FeatureCollection('EPSG:3857', options);
    features.filter = options.filter || defaultFilter;

    const vFeature = vectorTile.layers[layers[0]];
    const size = vFeature.extent * 2 ** z;
    const center = -0.5 * size;
    features.scale.set(size, -size, 1).divide(globalExtent);
    features.translation.set(-(vFeature.extent * x + center), -(vFeature.extent * y + center), 0).divide(features.scale);

    layers.forEach((layer_id) => {
        const layer = vectorTile.layers[layer_id];
        for (let i = 0; i < layer.length; i++) {
            const vtFeature = layer.feature(i);
            const type = VectorTileFeature.types[vtFeature.type];
            vtFeature.properties.vt_layer = layer.name;
            if (features.filter(vtFeature.properties, { type })) {
                vtFeatureToFeature(vtFeature, features);
            }
        }
    });

    features.removeEmptyFeature();
    features.updateExtent();

    features.extent.zoom = extentSource.zoom;
    return Promise.resolve(features);
}

/**
 * @module VectorTileParser
 */
export default {
    /**
     * Parse a vector tile file and return a [Feature]{@link module:GeoJsonParser.Feature}
     * or an array of Features. While multiple formats of vector tile are
     * available, the only one supported for the moment is the
     * [Mapbox Vector Tile]{@link https://www.mapbox.com/vector-tiles/specification/}.
     *
     * @param {ArrayBuffer} file - The vector tile file to parse.
     * @param {Object} options - Options controlling the parsing.
     * @param {Extent} options.extent - The Extent to convert the input coordinates to.
     * @param {Extent} options.coords - Coordinates of the layer.
     * @param {Extent=} options.filteringExtent - Optional filter to reject features
     * outside of this extent.
     * @param {boolean} [options.mergeFeatures=true] - If true all geometries are merged by type and multi-type
     * @param {boolean} [options.withNormal=true] - If true each coordinate normal is computed
     * @param {boolean} [options.withAltitude=true] - If true each coordinate altitude is kept
     * @param {function=} options.filter - Filter function to remove features.
     * @param {string=} options.isInverted - This option is to be set to the
     * correct value, true or false (default being false), if the computation of
     * the coordinates needs to be inverted to same scheme as OSM, Google Maps
     * or other system. See [this link]{@link
     * https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates}
     * for more informations.
     *
     * @return {Promise} A Promise resolving with a Feature or an array a
     * Features.
     */
    parse(file, options) {
        return Promise.resolve(readPBF(file, options));
    },
};
