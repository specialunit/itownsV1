import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import {
    GLTFStructuralMetadataExtension,
    GLTFMeshFeaturesExtension,
    GLTFCesiumRTCExtension,
    CesiumIonAuthPlugin,
    GoogleCloudAuthPlugin,
    ImplicitTilingPlugin,
// eslint-disable-next-line import/no-unresolved
} from '3d-tiles-renderer/plugins';

import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import PointsMaterial, {
    PNTS_MODE,
    PNTS_SHAPE,
    PNTS_SIZE_MODE,
    ClassificationScheme,
} from 'Renderer/PointsMaterial';
import { VIEW_EVENTS } from 'Core/View';

const _raycaster = new THREE.Raycaster();

// Stores lruCache, downloadQueue and parseQueue for each id of view {@link View}
// every time a tileset has been added
// https://github.com/iTowns/itowns/issues/2426
const viewers = {};

// Internal instance of GLTFLoader, passed to 3d-tiles-renderer-js to support GLTF 1.0 and 2.0
// Temporary exported to be used in deprecated B3dmParser
export const itownsGLTFLoader = new iGLTFLoader();
itownsGLTFLoader.register(() => new GLTFMeshFeaturesExtension());
itownsGLTFLoader.register(() => new GLTFStructuralMetadataExtension());
itownsGLTFLoader.register(() => new GLTFCesiumRTCExtension());

export const OGC3DTILES_LAYER_EVENTS = {
    /**
     * Fired when a new root or child tile set is loaded
     * @event OGC3DTilesLayer#load-tile-set
     * @type {Object}
     * @property {Object} tileset - the tileset json parsed in an Object
     * @property {String} url - tileset url
     */
    LOAD_TILE_SET: 'load-tile-set',
    /**
     * Fired when a tile model is loaded
     * @event OGC3DTilesLayer#load-model
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) parsed in a THREE.GROUP
     * @property {Object} tile - the tile metadata from the tileset
     */
    LOAD_MODEL: 'load-model',
    /**
     * Fired when a tile model is disposed
     * @event OGC3DTilesLayer#dispose-model
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) that is disposed
     * @property {Object} tile - the tile metadata from the tileset
     */
    DISPOSE_MODEL: 'dispose-model',
    /**
     * Fired when a tiles visibility changes
     * @event OGC3DTilesLayer#tile-visibility-change
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) parsed in a THREE.GROUP
     * @property {Object} tile - the tile metadata from the tileset
     * @property {boolean} visible - the tile visible state
     */
    TILE_VISIBILITY_CHANGE: 'tile-visibility-change',
    /**
     * Fired when a new batch of tiles start loading (can be fired multiple times, e.g. when the camera moves and new tiles
     * start loading)
     * @event OGC3DTilesLayer#tiles-load-start
     */
    TILES_LOAD_START: 'tiles-load-start',
    /**
     * Fired when all visible tiles are loaded (can be fired multiple times, e.g. when the camera moves and new tiles
     * are loaded)
     * @event OGC3DTilesLayer#tiles-load-end
     */
    TILES_LOAD_END: 'tiles-load-end',
};

/**
 * Enable loading 3D Tiles with [Draco](https://google.github.io/draco/) geometry extension.
 *
 * @param {String} path path to draco library folder containing the JS and WASM decoder libraries. They can be found in
 * [itowns examples](https://github.com/iTowns/itowns/tree/master/examples/libs/draco).
 * @param {Object} [config] optional configuration for Draco decoder (see threejs'
 * [setDecoderConfig](https://threejs.org/docs/index.html?q=draco#examples/en/loaders/DRACOLoader.setDecoderConfig) that
 * is called under the hood with this configuration for details.
 */
export function enableDracoLoader(path, config) {
    if (!path) {
        throw new Error('Path to draco folder is mandatory');
    }
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(path);
    if (config) {
        dracoLoader.setDecoderConfig(config);
    }
    itownsGLTFLoader.setDRACOLoader(dracoLoader);
}

/**
 * Enable loading 3D Tiles with [KTX2](https://www.khronos.org/ktx/) texture extension.
 *
 * @param {String} path path to ktx2 library folder containing the JS and WASM decoder libraries. They can be found in
 * [itowns examples](https://github.com/iTowns/itowns/tree/master/examples/libs/basis).
 * @param {THREE.WebGLRenderer} renderer the threejs renderer
 */
export function enableKtx2Loader(path, renderer) {
    if (!path || !renderer) {
        throw new Error('Path to ktx2 folder and renderer are mandatory');
    }
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(path);
    ktx2Loader.detectSupport(renderer);
    itownsGLTFLoader.setKTX2Loader(ktx2Loader);
}

/**
 * Enable loading 3D Tiles and GLTF with
 * [meshopt](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md) compression extension.
 *
 * @param {MeshOptDecoder.constructor} MeshOptDecoder - The Meshopt decoder
 * module.
 *
 * @example
 * import * as itowns from 'itowns';
 * import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
 *
 * // Enable support of EXT_meshopt_compression
 * itowns.enableMeshoptDecoder(MeshoptDecoder);
 */
export function enableMeshoptDecoder(MeshOptDecoder) {
    if (!MeshOptDecoder) {
        throw new Error('MeshOptDecoder module is mandatory');
    }
    itownsGLTFLoader.setMeshoptDecoder(MeshOptDecoder);
}

async function getMeshFeatures(meshFeatures, options) {
    const { faceIndex, barycoord } = options;

    const features = await meshFeatures.getFeaturesAsync(faceIndex, barycoord);
    return {
        features,
        featureIds: meshFeatures.getFeatureInfo(),
    };
}

function getStructuralMetadata(structuralMetadata, options) {
    const { index, faceIndex, barycoord, tableIndices, features } = options;

    const tableData = [];
    if (tableIndices !== undefined && features !== undefined) {
        structuralMetadata.getPropertyTableData(
            tableIndices,
            features,
            tableData,
        );
    }

    const attributeData = [];
    if (index !== undefined) {
        structuralMetadata.getPropertyAttributeData(index, attributeData);
    }

    const textureData = [];
    if (faceIndex !== undefined) {
        structuralMetadata.getPropertyTextureData(
            faceIndex,
            barycoord,
            textureData,
        );
    }

    const metadata = [
        ...tableData,
        ...textureData,
        ...attributeData,
    ];

    return metadata;
}

async function getMetadataFromIntersection(intersection) {
    const { point, object, face, faceIndex } = intersection;
    const { meshFeatures, structuralMetadata } = object.userData;

    const barycoord = new THREE.Vector3();
    if (face) {
        const position = object.geometry.getAttribute('position');
        const triangle = new THREE.Triangle().setFromAttributeAndIndices(
            position,
            face.a,
            face.b,
            face.c,
        );
        triangle.a.applyMatrix4(object.matrixWorld);
        triangle.b.applyMatrix4(object.matrixWorld);
        triangle.c.applyMatrix4(object.matrixWorld);
        triangle.getBarycoord(point, barycoord);
    } else {
        barycoord.set(0, 0, 0);
    }

    // EXT_mesh_features
    const { features, featureIds } = meshFeatures ? await getMeshFeatures(meshFeatures, {
        faceIndex,
        barycoord,
    }) : {};
    const tableIndices = featureIds?.map(p => p.propertyTable);

    // EXT_structural_metadata
    const metadata = structuralMetadata ? getStructuralMetadata(structuralMetadata, {
        ...intersection,
        barycoord,
        tableIndices,
        features,
    }) : [];

    return metadata;
}

class OGC3DTilesLayer extends GeometryLayer {
    /**
     * Layer for [3D Tiles](https://www.ogc.org/standard/3dtiles/) datasets.
     *
     * Advanced configuration note: 3D Tiles rendering is delegated to 3DTilesRendererJS that exposes several
     * configuration options accessible through the tilesRenderer property of this class. see the
     * [3DTilesRendererJS doc](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/README.md). Also note that
     * the cache is shared amongst 3D tiles layers and can be configured through tilesRenderer.lruCache (see the
     * [following documentation](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/README.md#lrucache-1).
     *
     * @extends Layer
     *
     * @param {String} id - unique layer id.
     * @param {Object} config - layer specific configuration
     * @param {OGC3DTilesSource} config.source - data source configuration
     * @param {String} [config.pntsMode = PNTS_MODE.COLOR] Point cloud coloring mode (passed to {@link PointsMaterial}).
     *      Only 'COLOR' or 'CLASSIFICATION' are possible. COLOR uses RGB colors of the points,
     *      CLASSIFICATION uses a classification property of the batch table to color points.
     * @param {ClassificationScheme}  [config.classificationScheme = ClassificationScheme.DEFAULT]  {@link PointsMaterial} classification scheme
     * @param {String} [config.pntsShape = PNTS_SHAPE.CIRCLE] Point cloud point shape. Only 'CIRCLE' or 'SQUARE' are possible.
     * (passed to {@link PointsMaterial}).
     * @param {String} [config.pntsSizeMode = PNTS_SIZE_MODE.VALUE] {@link PointsMaterial} Point cloud size mode (passed to {@link PointsMaterial}).
     * Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance
     * from point to camera.
     * @param {Number} [config.pntsMinAttenuatedSize = 3] Minimum scale used by 'ATTENUATED' size mode.
     * @param {Number} [config.pntsMaxAttenuatedSize = 10] Maximum scale used by 'ATTENUATED' size mode.
     */
    constructor(id, config) {
        const {
            pntsMode = PNTS_MODE.COLOR,
            pntsShape = PNTS_SHAPE.CIRCLE,
            classification = ClassificationScheme.DEFAULT,
            pntsSizeMode = PNTS_SIZE_MODE.VALUE,
            pntsMinAttenuatedSize = 3,
            pntsMaxAttenuatedSize = 10,
            ...geometryLayerConfig
        } = config;
        super(id, new THREE.Group(), geometryLayerConfig);

        this.isOGC3DTilesLayer = true;
        // Store points material config so they can be used later to substitute points tiles material
        // by our own PointsMaterial. These properties should eventually be managed through the Style API
        // (see https://github.com/iTowns/itowns/issues/2336)
        this.pntsMode = pntsMode;
        this.pntsShape = pntsShape;
        this.classification = classification;
        this.pntsSizeMode = pntsSizeMode;
        this.pntsMinAttenuatedSize = pntsMinAttenuatedSize;
        this.pntsMaxAttenuatedSize = pntsMaxAttenuatedSize;
        this.initXR = true;
        this.tasks = [];
        this.tilesRenderer = new TilesRenderer(this.source.url);
        if (config.source.isOGC3DTilesIonSource) {
            this.tilesRenderer.registerPlugin(new CesiumIonAuthPlugin({
                apiToken: config.source.accessToken,
                assetId: config.source.assetId,
                autoRefreshToken: true,
            }));
        } else if (config.source.isOGC3DTilesGoogleSource) {
            this.tilesRenderer.registerPlugin(new GoogleCloudAuthPlugin({
                apiToken: config.source.key,
                autoRefreshToken: true,
            }));
        }
        this.tilesRenderer.registerPlugin(new ImplicitTilingPlugin());

        this.tilesRenderer.manager.addHandler(/\.gltf$/, itownsGLTFLoader);

        this.object3d.add(this.tilesRenderer.group);

        // Add an initialization step that is resolved when the root tileset is loaded (see this._setup below), meaning
        // that the layer will be marked ready when the tileset has been loaded.
        this._res = this.addInitializationStep();

        /**
         * @type {number}
         */
        this.sseThreshold = this.tilesRenderer.errorTarget;
        Object.defineProperty(this, 'sseThreshold', {
            get() { return this.tilesRenderer.errorTarget; },
            set(value) { this.tilesRenderer.errorTarget = value; },
        });

        if (config.sseThreshold) {
            this.sseThreshold = config.sseThreshold;
        }

        const tilesSchedulingCB = (func) => {
            this.tasks.push(func);
        };

        // We set our scheduling callback for tiles downloading and parsing / important for VR
        this.tilesRenderer.downloadQueue.schedulingCallback = tilesSchedulingCB;
        this.tilesRenderer.parseQueue.schedulingCallback = tilesSchedulingCB;

        this.tilesRenderer.lruCache.maxSize = 1200000;
        this.tilesRenderer.lruCache.minSize = 90000;
    }

    /**
     * Sets the lruCache and download and parse queues so they are shared amongst
     * all tilesets from a same {@link View} view.
     * @param {View} view - view associated to this layer.
     * @private
     */
    _setupCacheAndQueues(view) {
        const id = view.id;
        if (viewers[id]) {
            this.tilesRenderer.lruCache = viewers[id].lruCache;
            this.tilesRenderer.downloadQueue = viewers[id].downloadQueue;
            this.tilesRenderer.parseQueue = viewers[id].parseQueue;
        } else {
            viewers[id] = {
                lruCache: this.tilesRenderer.lruCache,
                downloadQueue: this.tilesRenderer.downloadQueue,
                parseQueue: this.tilesRenderer.parseQueue,
            };
            view.addEventListener(VIEW_EVENTS.DISPOSED, (evt) => {
                delete viewers[evt.target.id];
            });
        }
    }

    /**
     * Binds 3d-tiles-renderer events to this layer.
     * @private
     */
    _setupEvents() {
        for (const ev of Object.values(OGC3DTILES_LAYER_EVENTS)) {
            this.tilesRenderer.addEventListener(ev, (e) => {
                this.dispatchEvent(e);
            });
        }
    }

    /**
     * Setup 3D tiles renderer js TilesRenderer with the camera, binds events and start updating. Executed when the
     * layer has been added to the view.
     * @param {View} view - the view the layer has been added to.
     * @private
     */
    _setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // Setup whenReady to be fullfiled when the root tileset has been loaded
        let rootTilesetLoaded = false;
        this.tilesRenderer.addEventListener('load-tile-set', () => {
            view.notifyChange(this);
            if (!rootTilesetLoaded) {
                rootTilesetLoaded = true;
                this._res();
            }
        });
        this.tilesRenderer.addEventListener('load-model', (e) => {
            const { scene } = e;
            scene.traverse((obj) => {
                this._assignFinalMaterial(obj);
                this._assignFinalAttributes(obj);
            });
            view.notifyChange(this);
        });


        this._setupCacheAndQueues(view);
        this._setupEvents();


        // Start loading tileset and tiles
        this.tilesRenderer.update();
    }

    /**
     * Replace materials from GLTFLoader by our own custom materials. Note that
     * the replaced materials are not compiled yet and will be disposed by the
     * GC.
     * @param {Object3D} model
     * @private
     */
    _assignFinalMaterial(model) {
        let material = model.material;

        if (model.isPoints) {
            const pointsMaterial = new PointsMaterial({
                mode: this.pntsMode,
                shape: this.pntsShape,
                classificationScheme: this.classification,
                sizeMode: this.pntsSizeMode,
                minAttenuatedSize: this.pntsMinAttenuatedSize,
                maxAttenuatedSize: this.pntsMaxAttenuatedSize,
            });
            pointsMaterial.copy(material);

            material = pointsMaterial;
        }

        if (material) {
            ReferLayerProperties(material, this);
        }

        model.material = material;
    }

    /**
     * @param {Object3D} model
     * @private
     */
    _assignFinalAttributes(model) {
        const geometry = model.geometry;
        const batchTable = model.batchTable;

        // Setup classification bufferAttribute
        if (model.isPoints) {
            const classificationData = batchTable?.getPropertyArray('Classification');
            if (classificationData) {
                geometry.setAttribute('classification',
                    new THREE.BufferAttribute(classificationData, 1),
                );
            }
        }
    }
    handleTasks() {
        for (let t = 0, l = this.tasks.length; t < l; t++) {
            this.tasks[t]();
        }
        this.tasks.length = 0;
    }
    preUpdate(context) {
        this.scale = 1119.6152422706632;    // context.camera._preSSE;
        // console.log(this.scale);

        if (this.initXR && context.view.renderer.xr && context.view.renderer.xr.getCamera() && context.view.renderer.xr.getCamera().cameras.length > 0) {
        //     const leftCam = context.view.renderer.xr.getCamera().cameras[0];
        //     this.tilesRenderer.cameras.forEach(c => this.tilesRenderer.deleteCamera(c));
        //     this.tilesRenderer.setCamera(context.view.renderer.xr.getCamera());
        //
        //     // this.tilesRenderer.setResolutionFromRenderer(leftCam, context.view.renderer);
        //     this.tilesRenderer.deleteCamera(context.view.camera3D);
        //     if (leftCam) {
        //         this.tilesRenderer.setResolution(context.view.renderer.xr.getCamera(), leftCam.viewport.z, leftCam.viewport.w);
        //     }

            // We define a custom scheduling callback to handle also active WebXR sessions
            // const tilesSchedulingCB = (func) => {
            //     this.tasks.push(func);
            // };
            //
            // // We set our scheduling callback for tiles downloading and parsing
            // this.tilesRenderer.downloadQueue.schedulingCallback = tilesSchedulingCB;
            // this.tilesRenderer.parseQueue.schedulingCallback = tilesSchedulingCB;
            //
            // this.tilesRenderer.lruCache.maxSize = 1200000;
            // this.tilesRenderer.lruCache.minSize = 90000;
            this.initXR = false;
        }
        this.handleTasks();

        this.tilesRenderer.update();
        return null; // don't return any element because 3d-tiles-renderer already updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    /**
     * Deletes the layer and frees associated memory
     */
    delete() {
        this.tilesRenderer.dispose();
    }

    /**
     * Get the [metadata](https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata)
     * of the closest intersected object from a list of intersections.
     *
     * This method retrieves structured metadata stored in GLTF 2.0 assets using
     * the [`EXT_structural_metadata`](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata)
     * extension.
     *
     * Internally, it uses the closest intersected point to index metadata
     * stored in property attributes and textures.
     *
     * If present in GLTF 2.0 assets, this method leverages the
     * [`EXT_mesh_features`](`https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features)
     * extension and the returned featured to index metadata stored in property tables.
     *
     * @param {Array<THREE.Intersection>} intersections
     * @returns {Promise<Object | null>} - the intersected object's metadata
     */
    async getMetadataFromIntersections(intersections) {
        if (!intersections.length) { return null; }

        const metadata = await getMetadataFromIntersection(intersections[0]);
        return metadata;
    }

    /**
     * Get the attributes for the closest intersection from a list of
     * intersects.
     * @param {Array<THREE.Intersection>} intersects -  An array containing all
     * objects picked under mouse coordinates computed with view.pickObjectsAt(..).
     * @returns {Object | null} - An object containing
     */
    getC3DTileFeatureFromIntersectsArray(intersects) {
        if (!intersects.length) { return null; }

        const { face, index, object, instanceId } = intersects[0];

        /** @type{number|null} */
        let batchId;
        if (object.isPoints && index) {
            batchId = object.geometry.getAttribute('_BATCHID')?.getX(index) ?? index;
        } else if (object.isMesh && face) {
            batchId = object.geometry.getAttribute('_BATCHID')?.getX(face.a) ?? instanceId;
        }

        if (batchId === undefined) {
            return null;
        }

        let tileObject = object;
        while (!tileObject.batchTable) {
            tileObject = tileObject.parent;
        }

        return tileObject.batchTable.getDataFromId(batchId);
    }

    /**
     * Get all 3D objects (mesh and points primitives) as intersects at the
     * given non-normalized screen coordinates.
     * @param {View} view - The view instance.
     * @param {THREE.Vector2} coords - The coordinates to pick in the view. It
     * should have at least `x` and `y` properties.
     * @param {number} radius - Radius of the picking circle.
     * @param {Array} [target=[]] - Target array to push results too
     * @returns {Array} Array containing all target objects picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coords, radius, target = []) {
        const camera = view.camera.camera3D;
        _raycaster.setFromCamera(view.viewToNormalizedCoords(coords), camera);
        _raycaster.near = camera.near;
        _raycaster.far = camera.far;

        _raycaster.firstHitOnly = true;
        const picked = _raycaster.intersectObject(this.tilesRenderer.group, true);
        // Store the layer of the picked object to conform to the interface of what's returned by Picking.js (used for
        // other GeometryLayers
        picked.forEach((p) => { p.layer = this; });
        target.push(...picked);

        return target;
    }

    // eslint-disable-next-line no-unused-vars
    attach(layer) {
        console.warn('[OGC3DTilesLayer]: Attaching / detaching layers is not yet implemented for OGC3DTilesLayer.');
    }

    // eslint-disable-next-line no-unused-vars
    detach(layer) {
        console.warn('[OGC3DTilesLayer]: Attaching / detaching layers is not yet implemented for OGC3DTilesLayer.');
        return true;
    }

    // eslint-disable-next-line no-unused-vars
    getObjectToUpdateForAttachedLayers(obj) {
        return null;
    }

    /**
     * Executes a callback for each tile of this layer tileset.
     *
     * @param {Function} callback The callback to execute for each tile. Has the following two parameters:
     *  1. tile (Object) - the JSON tile
     *  2. scene (THREE.Object3D | null) - The tile content. Contains a `batchTable` property. Can be null if the tile
     *  has not yet been loaded.
    */
    forEachTile(callback) {
        this.tilesRenderer.traverse((tile) => {
            callback(tile, tile.cached.scene);
        });
    }
}

export default OGC3DTilesLayer;
