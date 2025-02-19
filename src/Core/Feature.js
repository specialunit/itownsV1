import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';
import OrientationUtils from 'Utils/OrientationUtils';
import Coordinates from 'Core/Geographic/Coordinates';
import StyleOptions from 'Core/StyleOptions';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

function _extendBuffer(feature, size) {
    feature.vertices.length += size * feature.size;
    if (feature.normals) {
        feature.normals.length = feature.vertices.length;
    }
}
function _setGeometryValues(feature, coord) {
    if (feature.normals) {
        coord.geodesicNormal.toArray(feature.normals, feature._pos);
    }

    feature._pushValues(coord.x, coord.y, coord.z);
}

const coordOut = new Coordinates('EPSG:4326', 0, 0, 0);

export const FEATURE_TYPES = {
    POINT: 0,
    LINE: 1,
    POLYGON: 2,
};

/**
 * @typedef {Object} FeatureBuildingOptions
 * @property {string} crs - The CRS to convert the input coordinates to.
 * @property {string} [structure='2d'] - data structure type : 2d or 3d.
 * If the structure is 3d, the feature have 3 dimensions by vertices positions and
 * a normal for each vertices.
 * @property {Extent|boolean} [filteringExtent=undefined] - Optional filter to reject
 * features outside of extent. Extent filtering is file extent if filteringExtent is true.
 * @property {boolean} [buildExtent] - If true the geometry will
 * have an extent property containing the area covered by the geometry.
 * Default value is false if `structure` parameter is set to '3d', and true otherwise.
 * True if the layer does not inherit from {@link GeometryLayer}.
 * @property {string} forcedExtentCrs - force feature extent crs if buildExtent is true.
 * @property {function} [filter] - Filter function to remove features
 * @property {boolean} [mergeFeatures=true] - If true all geometries are merged by type and multi-type.
 * @property {Style} style - The style to inherit when creating
 * style for all new features.
 *
 */

/**
 * @property {Extent} extent - The 2D extent containing all the points
 * composing the geometry.
 * @property {Object[]} indices - Contains the indices that define the geometry.
 * Objects stored in this array have two properties, an `offset` and a `count`.
 * The offset is related to the overall number of vertices in the Feature.
 *
 * @property {Object} properties - Properties of the geometry. It can be
 * anything specified in the GeoJSON under the `properties` property.
 */
export class FeatureGeometry {
    #currentExtent;
    /**
     * @param {Feature} feature geometry
     */
    constructor(feature) {
        this.indices = [];
        this.properties = {};
        this.size = feature.size;
        if (feature.extent) {
            this.extent = defaultExtent(feature.extent.crs);
            this.#currentExtent = defaultExtent(feature.extent.crs);
        }
    }
    /**
     * Add a new marker to indicate the starting of sub geometry and extends the vertices buffer.
     * Then you have to push new the coordinates of sub geometry.
     * The sub geometry stored in indices, see constructor for more information.
     * @param {number} count - count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    startSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const extent = this.extent ? defaultExtent(this.extent.crs) : undefined;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size;
        this.indices.push({ offset, count, extent });
        this.#currentExtent = extent;
        _extendBuffer(feature, count);
    }

    /**
     * After you have pushed new the coordinates of sub geometry without
     * `startSubGeometry`, this function close sub geometry. The sub geometry
     * stored in indices, see constructor for more information.
     * @param {number} count count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    closeSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size - count;
        this.indices.push({ offset, count, extent: this.#currentExtent });
        if (this.extent) {
            this.extent.union(this.#currentExtent);
            this.#currentExtent = defaultExtent(this.extent.crs);
        }
    }

    getLastSubGeometry() {
        const last = this.indices.length - 1;
        return this.indices[last];
    }

    /**
     * Push new coordinates in vertices buffer.
     * @param {Feature} feature - the feature containing the geometry
     * @param {Coordinates} coordIn The coordinates to push.
     */
    pushCoordinates(feature, coordIn) {
        if (feature.isCoordinates) {
            console.warn('Deprecated: change in arguments order, use pushCoordinates(feature, coordIn) instead');
            this.pushCoordinates(coordIn, feature);
            return;
        }

        coordIn.as(feature.crs, coordOut);
        feature.transformToLocalSystem(coordOut);

        _setGeometryValues(feature, coordOut);

        // expand extent if present
        if (this.#currentExtent) {
            this.#currentExtent.expandByCoordinates(feature.useCrsOut ? coordOut : coordIn);
        }
    }

    /**
     * Push new values coordinates in vertices buffer without any transformation.
     * No geographical conversion is made or the normal doesn't stored.
     *
     * @param {Feature} feature - the feature containing the geometry
     * @param {Object} coordIn An object containing the coordinates values to push.
     * @param {number} coordIn.x the x coordinate (in a local system).
     * @param {number} coordIn.y the y coordinate (in a local system).
     * @param {THREE.Vector3} [coordIn.normal] the normal on coordinates (only for `EPSG:4978` projection).
     * @param {Coordinates} [coordProj] An optional argument containing the geodesic coordinates in EPSG:4326
     * It allows the user to get access to the feature coordinates to set style.base_altitude.
    */
    pushCoordinatesValues(feature, coordIn, coordProj, ...args) {
        if (args.length > 0) {
            console.warn('Deprecated: change in arguments, use pushCoordinatesValues(feature, {x: long, y: lat, normal}, coordProj) instead');
            this.pushCoordinatesValues(feature, { x: coordIn, y: coordProj, normal: args[0] }, args[1]);
            return;
        }

        _setGeometryValues(feature, coordIn);

        // expand extent if present
        if (this.#currentExtent) {
            this.#currentExtent.expandByValuesCoordinates(coordIn.x, coordIn.y);
        }
    }

    /**
     * update geometry extent with the last sub geometry extent.
     */
    updateExtent() {
        if (this.extent) {
            const last = this.indices[this.indices.length - 1];
            if (last) {
                this.extent.union(last.extent);
            }
        }
    }
}

function push2DValues(value0, value1) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
}

function push3DValues(value0, value1, value2 = 0) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
    this.vertices[this._pos++] = value2;
}

/**
 *
 * This class improves and simplifies the construction and conversion of geographic data structures.
 * It's an intermediary structure between geomatic formats and THREE objects.
 *
 * **Warning**, the data (`extent` or `Coordinates`) can be stored in a local system.
 * To use vertices or extent in `Feature.crs` projection,
 * it's necessary to transform `Coordinates` or `Extent` by `FeatureCollection.matrixWorld`.
 *
 * ```js
 * // To have feature extent in featureCollection.crs projection:
 * feature.extent.applyMatrix4(featureCollection.matrixWorld);
 *
 * // To have feature vertex in feature.crs projection:
 * coord.crs = feature.crs;
 * coord.setFromArray(feature.vertices)
 * coord.applyMatrix4(featureCollection.matrixWorld);
 *```
 *
 * @property {string} type - Geometry type, can be `point`, `line`, or
 * `polygon`.
 * @property {number[]} vertices - All the vertices of the Feature.
 * @property {number[]} normals - All the normals of the Feature.
 * @property {number} size - the number of values of the array that should be associated with a coordinates.
 * The size is 3 with altitude and 2 without altitude.
 * @property {boolean} hasRawElevationData - indicates if the geographic coordinates, from original source, has an elevation,
 * the coordinates has a third coordinate.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {FeatureGeometry[]} geometries - An array containing all {@link
 * FeatureGeometry}.
 * @property {Extent?} extent - The extent containing all the geometries
 * composing the feature.
 */
class Feature {
    /**
     *
     * @param {string} type type of Feature. It can be 'point', 'line' or 'polygon'.
     * @param {FeatureCollection} collection Parent feature collection.
     */
    constructor(type, collection) {
        if (Object.keys(FEATURE_TYPES).find(t => FEATURE_TYPES[t] === type)) {
            this.type = type;
        } else {
            throw new Error(`Unsupported Feature type: ${type}`);
        }
        this.geometries = [];
        this.vertices = [];
        this.crs = collection.crs;
        this.size = collection.size;
        this.normals = collection.crs == 'EPSG:4978' ? [] : undefined;
        this.hasRawElevationData = false;

        this.transformToLocalSystem = collection.transformToLocalSystem.bind(collection);
        if (collection.extent) {
            // this.crs is final crs projection, is out projection.
            // If the extent crs is the same then we use output coordinate (coordOut) to expand it.
            this.extent = defaultExtent(collection.extent.crs);
            this.useCrsOut = this.extent.crs == this.crs;
        }
        this._pos = 0;
        this._pushValues = (this.size === 3 ? push3DValues : push2DValues).bind(this);
        this.style = StyleOptions.setFromProperties;
    }
    /**
     * Instance a new {@link FeatureGeometry}  and push in {@link Feature}.
     * @returns {FeatureGeometry} the instancied geometry.
     */
    bindNewGeometry() {
        const geometry = new FeatureGeometry(this);
        this.geometries.push(geometry);
        return geometry;
    }
    /**
     * Update {@link Extent} feature with {@link Extent} geometry
     * @param {FeatureGeometry} geometry used to update Feature {@link Extent}
     */
    updateExtent(geometry) {
        if (this.extent) {
            this.extent.union(geometry.extent);
        }
    }

    /**
     * @returns {number} the count of geometry.
     */
    get geometryCount() {
        return this.geometries.length;
    }
}

export default Feature;

const doNothing = () => {};

const transformToLocalSystem3D = (coord, collection) => {
    coord.geodesicNormal.applyNormalMatrix(collection.normalMatrixInverse);
    return coord.applyMatrix4(collection.matrixWorldInverse);
};

const transformToLocalSystem2D = (coord, collection) => coord.applyMatrix4(collection.matrixWorldInverse);
const axisZ = new THREE.Vector3(0, 0, 1);
const alignYtoEast = new THREE.Quaternion();
/**
 * An object regrouping a list of [features]{@link Feature} and the extent of this collection.
 * **Warning**, the data (`extent` or `Coordinates`) can be stored in a local system.
 * The local system center is the `center` property.
 * To use `Feature` vertices or `FeatureCollection/Feature` extent in FeatureCollection.crs projection,
 * it's necessary to transform `Coordinates` or `Extent` by `FeatureCollection.matrixWorld`.
 *
 * ```js
 * // To have featureCollection extent in featureCollection.crs projection:
 * featureCollection.extent.applyMatrix4(featureCollection.matrixWorld);
 *
 * // To have feature vertex in featureCollection.crs projection:
 * const vertices = featureCollection.features[0].vertices;
 * coord.crs = featureCollection.crs;
 * coord.setFromArray(vertices)
 * coord.applyMatrix4(featureCollection.matrixWorld);
 *```
 *
 * @extends THREE.Object3D
 *
 * @property {Feature[]} features - The array of features composing the
 * collection.
 * @property {Extent?} extent - The 2D extent containing all the features
 * composing the collection. The extent projection is the same local projection `FeatureCollection`.
 * To transform `FeatureCollection.extent` to `FeatureCollection.crs` projection, the transformation matrix must be applied.
 *
 * **WARNING** if crs is `EPSG:4978` because the 3d geocentric system doesn't work with 2D `Extent`,
 * The FeatureCollection.extent projection is the original projection.
 * In this case, there isn't need to transform the extent.
 *
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {boolean} isFeatureCollection - Used to check whether this is FeatureCollection.
 * @property {number} size - The size structure, it's 3 for 3d and 2 for 2d.
 * @property {Style} style - The collection style used to display the feature collection.
 * @property {boolean} isInverted - This option is to be set to the
 * correct value, true or false (default being false), if the computation of
 * the coordinates needs to be inverted to same scheme as OSM, Google Maps
 * or other system. See [this link](
 * https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates)
 * for more informations.
 * @property {THREE.Matrix4} matrixWorldInverse - The matrix world inverse.
 * @property {Coordinates} center - The local center coordinates in `EPSG:4326`.
 * The local system is centred in this center.
 *
 */

export class FeatureCollection extends THREE.Object3D {
    #transformToLocalSystem = transformToLocalSystem2D;
    #setLocalSystem = doNothing;
    /**
     * @param      {FeatureBuildingOptions|Layer}  options  The building options .
     */
    constructor(options) {
        super();
        this.isFeatureCollection = true;
        this.crs = options.accurate || !options.source?.crs ? options.crs : options.source.crs;
        this.features = [];
        this.mergeFeatures = options.mergeFeatures === undefined ? true : options.mergeFeatures;
        this.size = options.structure == '3d' ? 3 : 2;
        this.filterExtent = options.filterExtent;
        this.style = options.style;
        this.isInverted = false;
        this.matrixWorldInverse = new THREE.Matrix4();
        this.center = new Coordinates('EPSG:4326', 0, 0);

        if (this.size == 2) {
            this.extent = options.buildExtent === false ? undefined : defaultExtent(options.forcedExtentCrs || this.crs);
            this.#setLocalSystem = (center) => {
                // set local system center
                center.as(this.crs, this.center);

                // set position to local system center
                this.position.copy(center);
                this.updateMatrixWorld();
                this.#setLocalSystem = doNothing;
            };
        } else {
            this.extent = options.buildExtent ? defaultExtent(options.forcedExtentCrs || this.crs) : undefined;
            this.#setLocalSystem = (center) => {
                // set local system center
                this.center = center.as('EPSG:4326');
                console.log(this.center, center);
                // this.center => 'EPSG:4326'
                // center => 'EPSG:4978'

                if (this.crs == 'EPSG:4978') {
                    // align Z axe to geodesic normal.
                    this.quaternion.setFromUnitVectors(axisZ, center.geodesicNormal);
                    // align Y axe to East
                    alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + this.center.longitude));
                    // this.quaternion.multiply(alignYtoEast);

                    console.log(this.quaternion);
                    console.log('this.center', this.center);
                    console.log('center', center);
                    console.log(OrientationUtils.quaternionFromCRSToCRS('EPSG:4326', 'EPSG:4978')(center));
                    console.log(OrientationUtils.quaternionFromCRSToCRS('EPSG:4978', 'EPSG:4326')(this.center));

                    console.log(center.toVector3().applyQuaternion(this.quaternion.invert()));
                }

                // set position to local system center
                this.position.copy(center);
                this.updateMatrixWorld();
                this.normalMatrix.getNormalMatrix(this.matrix);
                this.normalMatrixInverse = new THREE.Matrix3().copy(this.normalMatrix).invert();

                this.#setLocalSystem = doNothing;
            };
            this.#transformToLocalSystem = transformToLocalSystem3D;
        }
    }

    /**
     * Apply the matrix World inverse on the coordinates.
     * This method is used when the coordinates is pushed
     * to transform it in local system.
     *
     * @param   {Coordinates}  coordinates  The coordinates
     * @returns {Coordinates} The coordinates in local system
     */
    transformToLocalSystem(coordinates) {
        this.#setLocalSystem(coordinates);
        return this.#transformToLocalSystem(coordinates, this);
        // return this.transformToLocalSystem3D(coordinates, this);
        // const transformToLocalSystem3D = (coord, collection) => {
        //     coord.geodesicNormal.applyNormalMatrix(collection.normalMatrixInverse);
        //     return coord.applyMatrix4(collection.matrixWorldInverse);
        // };
    }

    transformToLocalSystem_ForPt(coordinates) {
        this.#setLocalSystem(coordinates);
        // return this.transformToLocalSystem3D(coordinates, this);
        coordinates.geodesicNormal.applyNormalMatrix(this.normalMatrixInverse);
        return coordinates.applyMatrix4(this.matrixWorldInverse);
    }

    /**
     * Update FeatureCollection extent with `extent` or all features extent if
     * `extent` is `undefined`.
     * @param {Extent} extent
     */
    updateExtent(extent) {
        if (this.extent) {
            const extents = extent ? [extent] : this.features.map(feature => feature.extent);
            for (const ext of extents) {
                this.extent.union(ext);
            }
        }
    }

    /**
     * Updates the global transform of the object and its descendants.
     *
     * @param {boolean}  force   The force
     */
    updateMatrixWorld(force) {
        super.updateMatrixWorld(force);
        this.matrixWorldInverse.copy(this.matrixWorld).invert();
    }

    /**
     * Remove features that don't have {@link FeatureGeometry}.
     */
    removeEmptyFeature() {
        this.features = this.features.filter(feature => feature.geometries.length);
    }

    /**
     * Push the `feature` in FeatureCollection.
     * @param {Feature} feature
     */
    pushFeature(feature) {
        this.features.push(feature);
        this.updateExtent(feature.extent);
    }

    requestFeature(type, callback) {
        const feature = this.features.find(callback);
        if (feature && this.mergeFeatures) {
            return feature;
        } else {
            const newFeature = new Feature(type, this);
            this.features.push(newFeature);
            return newFeature;
        }
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureByType(type) {
        return this.requestFeature(type, feature => feature.type === type);
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} id the id requested
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureById(id, type) {
        return this.requestFeature(type, feature => feature.id === id);
    }
    /**
     * Add a new feature with references to all properties.
     * It allows to have features with different styles
     * without having to duplicate the geometry.
     * @param      {Feature}   feature  The feature to reference.
     * @return     {Feature}  The new referenced feature
     */
    newFeatureByReference(feature) {
        const ref = new Feature(feature.type, this);
        ref.extent = feature.extent;
        ref.geometries = feature.geometries;
        ref.normals = feature.normals;
        ref.size = feature.size;
        ref.vertices = feature.vertices;
        ref._pos = feature._pos;
        this.features.push(ref);
        return ref;
    }
}
