import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import { InfoTiledGeometryLayer } from 'Layer/InfoLayer';
import Picking from 'Core/Picking';
import convertToTile from 'Converter/convertToTile';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import { ImageryLayers } from 'Layer/Layer';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

const subdivisionVector = new THREE.Vector3();
const boundingSphereCenter = new THREE.Vector3();

/**
 * @property {InfoTiledGeometryLayer} info - Status information of layer
 * @property {boolean} isTiledGeometryLayer - Used to checkout whether this
 * layer is a TiledGeometryLayer. Default is true. You should not change this,
 * as it is used internally for optimisation.
 * @property {boolean} hideSkirt (default false) - Used to hide the skirt (tile borders).
 * Useful when the layer opacity < 1
 *
 * @extends GeometryLayer
 */
class TiledGeometryLayer extends GeometryLayer {
    /**
     * A layer extending the {@link GeometryLayer}, but with a tiling notion.
     *
     * `TiledGeometryLayer` is the ground where `ColorLayer` and `ElevationLayer` are attached.
     * `TiledGeometryLayer` is a quadtree data structure. At zoom 0,
     * there is a single tile for the whole earth. At zoom level 1,
     * the single tile splits into 4 tiles (2x2 tile square).
     * Each zoom level quadtree divides the geometry tiles of the one before it.
     * The camera distance determines how the tiles are subdivided for optimal data display.
     *
     * Some `GeometryLayer` can also be attached to the `TiledGeometryLayer` if they want to take advantage of the quadtree.
     *
     * ![tiled geometry](/docs/static/images/tiledGeometry.jpeg)
     * _In `GlobeView`, **red lines** represents the **WGS84 grid** and **orange lines** the **Pseudo-mercator grid**._
     * _In this picture, there are tiles with 3 different zoom/levels._
     *
     * The zoom/level is based on [tiled web map](https://en.wikipedia.org/wiki/Tiled_web_map).
     * It corresponds at meters by pixel. If the projection tile exceeds a certain pixel size (on screen)
     * then it is subdivided into 4 tiles with a zoom greater than 1.
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3D} object3d - The object3d used to contain the
     * geometry of the TiledGeometryLayer. It is usually a `THREE.Group`, but it
     * can be anything inheriting from a `THREE.Object3d`.
     * @param {Array} schemeTile - extents Array of root tiles
     * @param {Object} builder - builder geometry object
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {Source} [config.source] - Description and options of the source.
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
     */
    constructor(id, object3d, schemeTile, builder, config) {
        const {
            sseSubdivisionThreshold = 1.0,
            minSubdivisionLevel,
            maxSubdivisionLevel,
            maxDeltaElevationLevel,
            tileMatrixSets,
            diffuse,
            showOutline = false,
            segments,
            disableSkirt = false,
            materialOptions,
            ...configGeometryLayer
        } = config;

        super(id, object3d, {
            ...configGeometryLayer,
            // cacheLifeTime = CACHE_POLICIES.INFINITE because the cache is handled by the builder
            cacheLifeTime: CACHE_POLICIES.INFINITE,
            source: false,
        });

        /**
         * @type {boolean}
         * @readonly
         */
        this.isTiledGeometryLayer = true;

        this.protocol = 'tile';

        // TODO : this should be add in a preprocess method specific to GeoidLayer.
        this.object3d.geoidHeight = 0;

        /**
         * @type {boolean}
         */
        this.disableSkirt = disableSkirt;

        this._hideSkirt = !!config.hideSkirt;

        /**
         * @type {number}
         */
        this.sseSubdivisionThreshold = sseSubdivisionThreshold;

        /**
         * @type {number}
         */
        this.minSubdivisionLevel = minSubdivisionLevel;

        /**
         * @type {number}
         */
        this.maxSubdivisionLevel = maxSubdivisionLevel;

        /**
         * @type {number}
         * @deprecated
         */
        this.maxDeltaElevationLevel = maxDeltaElevationLevel;

        this.segments = segments;
        this.schemeTile = schemeTile;
        this.builder = builder;
        this.info = new InfoTiledGeometryLayer(this);

        if (!this.schemeTile) {
            throw new Error(`Cannot init tiled layer without schemeTile for layer ${this.id}`);
        }

        if (!this.builder) {
            throw new Error(`Cannot init tiled layer without builder for layer ${this.id}`);
        }

        this.maxScreenSizeNode = this.sseSubdivisionThreshold * (this.sizeDiagonalTexture * 2);

        this.tileMatrixSets = tileMatrixSets;

        this.materialOptions = materialOptions;

        /*
         * @type {boolean}
         */
        this.showOutline = showOutline;

        /**
         * @type {THREE.Vector3 | undefined}
         */
        this.diffuse = diffuse;

        this.level0Nodes = [];
        const promises = [];

        for (const root of this.schemeTile) {
            promises.push(this.convert(undefined, root));
        }

        this._promises.push(Promise.all(promises).then((level0s) => {
            this.level0Nodes = level0s;
            this.object3d.add(...level0s);
            this.object3d.updateMatrixWorld();
        }));
    }

    get hideSkirt() {
        return this._hideSkirt;
    }

    set hideSkirt(value) {
        if (!this.level0Nodes) {
            return;
        }
        this._hideSkirt = value;
        for (const node of this.level0Nodes) {
            node.traverse((obj) => {
                if (obj.isTileMesh) {
                    obj.geometry.hideSkirt = value;
                }
            });
        }
    }
    /**
     * Picking method for this layer. It uses the {@link Picking#pickTilesAt}
     * method.
     *
     * @param {View} view - The view instance.
     * @param {Object} coordinates - The coordinates to pick in the view. It
     * should have at least `x` and `y` properties.
     * @param {number} radius - Radius of the picking circle.
     * @param {Array} target - Array to push picking result.
     *
     * @return {Array} An array containing all targets picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coordinates, radius = this.options.defaultPickingRadius, target = []) {
        return Picking.pickTilesAt(view, coordinates, radius, this, target);
    }

    /**
     * Does pre-update work on the context:
     * <ul>
     *  <li>update the `colorLayers` and `elevationLayers`</li>
     *  <li>update the `maxElevationLevel`</li>
     * </ul>
     *
     * Once this work is done, it returns a list of nodes to update. Depending
     * on the origin of `sources`, it can return a few things:
     * <ul>
     *  <li>if `sources` is empty, it returns the first node of the layer
     *  (stored as `level0Nodes`), which will trigger the update of the whole
     *  tree</li>
     *  <li>if the update is triggered by a camera move, the whole tree is
     *  returned too</li>
     *  <li>if `source.layer` is this layer, it means that `source` is a node; a
     *  common ancestor will be found if there are multiple sources, with the
     *  default common ancestor being the first source itself</li>
     *  <li>else it returns the whole tree</li>
     * </ul>
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {Set<GeometryLayer|TileMesh>} sources - A list of sources to
     * generate a list of nodes to update.
     *
     * @return {TileMesh[]} The array of nodes to update.
     */
    preUpdate(context, sources) {
        if (sources.has(undefined) || sources.size == 0) {
            return this.level0Nodes;
        }

        if (__DEBUG__) {
            this._latestUpdateStartingLevel = 0;
        }

        context.colorLayers = context.view.getLayers(
            (l, a) => a && a.id == this.id && l.isColorLayer);
        context.elevationLayers = context.view.getLayers(
            (l, a) => a && a.id == this.id && l.isElevationLayer);

        context.maxElevationLevel = -1;
        for (const e of context.elevationLayers) {
            context.maxElevationLevel = Math.max(e.source.zoom.max, context.maxElevationLevel);
        }
        if (context.maxElevationLevel == -1) {
            context.maxElevationLevel = Infinity;
        }

        // Prepare ColorLayer sequence order
        // In this moment, there is only one color layers sequence, because they are attached to tileLayer.
        // In future, the sequence must be returned by parent geometry layer.
        this.colorLayersOrder = ImageryLayers.getColorLayersIdOrderedBySequence(context.colorLayers);

        let commonAncestor;
        for (const source of sources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return this.level0Nodes;
            }
            if (source.layer === this) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);
                    if (!commonAncestor) {
                        return this.level0Nodes;
                    }
                }
                if (commonAncestor.material == null) {
                    commonAncestor = undefined;
                }
            }
        }
        if (commonAncestor) {
            if (__DEBUG__) {
                this._latestUpdateStartingLevel = commonAncestor.level;
            }
            return [commonAncestor];
        } else {
            return this.level0Nodes;
        }
    }

    /**
     * Update a node of this layer. The node will not be updated if:
     * <ul>
     *  <li>it does not have a parent, then it is removed</li>
     *  <li>its parent is being subdivided</li>
     *  <li>is not visible in the camera</li>
     * </ul>
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {Layer} layer - Parameter to be removed once all update methods
     * have been aligned.
     * @param {TileMesh} node - The node to update.
     *
     * @returns {Object}
     */
    update(context, layer, node) {
        if (!node.parent) {
            return ObjectRemovalHelper.removeChildrenAndCleanup(this, node);
        }
        // early exit if parent' subdivision is in progress
        if (node.parent.pendingSubdivision) {
            node.visible = false;
            node.material.visible = false;
            this.info.update(node);
            return undefined;
        }

        // do proper culling
        node.visible = !this.culling(node, context.camera);

        if (node.visible) {
            let requestChildrenUpdate = false;

            node.material.visible = true;
            this.info.update(node);

            if (node.pendingSubdivision || (TiledGeometryLayer.hasEnoughTexturesToSubdivide(context, node) && this.subdivision(context, this, node))) {
                this.subdivideNode(context, node);
                // display iff children aren't ready
                node.material.visible = node.pendingSubdivision;
                this.info.update(node);
                requestChildrenUpdate = true;
            }

            if (node.material.visible) {
                if (!requestChildrenUpdate) {
                    return ObjectRemovalHelper.removeChildren(this, node);
                }
            }

            return requestChildrenUpdate ? node.children.filter(n => n.layer == this) : undefined;
        }

        node.material.visible = false;
        this.info.update(node);
        return ObjectRemovalHelper.removeChildren(this, node);
    }

    convert(requester, extent) {
        return convertToTile.convert(requester, extent, this);
    }

    countColorLayersTextures(...layers) {
        return layers.length;
    }

    // eslint-disable-next-line
    culling(node, camera) {
        return !camera.isBox3Visible(node.obb.box3D, node.matrixWorld);
    }

    /**
     * Tell if a node has enough elevation or color textures to subdivide.
     * Subdivision is prevented if:
     * <ul>
     *  <li>the node is covered by at least one elevation layer and if the node
     *  doesn't have an elevation texture yet</li>
     *  <li>a color texture is missing</li>
     * </ul>
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {TileMesh} node - The node to subdivide.
     *
     * @returns {boolean} False if the node can not be subdivided, true
     * otherwise.
     */
    static hasEnoughTexturesToSubdivide(context, node) {
        const layerUpdateState = node.layerUpdateState || {};
        let nodeLayer = node.material.getElevationTile();

        for (const e of context.elevationLayers) {
            const extents = node.getExtentsByProjection(e.crs);
            const zoom = extents[0].zoom;
            if (zoom > e.zoom.max || zoom < e.zoom.min) {
                continue;
            }
            if (!e.frozen && e.ready && e.source.extentInsideLimit(node.extent, zoom) && (!nodeLayer || nodeLayer.level < 0)) {
                // no stop subdivision in the case of a loading error
                if (layerUpdateState[e.id] && layerUpdateState[e.id].inError()) {
                    continue;
                }
                return false;
            }
        }

        for (const c of context.colorLayers) {
            if (c.frozen || !c.visible || !c.ready) {
                continue;
            }
            const extents = node.getExtentsByProjection(c.crs);
            const zoom = extents[0].zoom;
            if (zoom > c.zoom.max || zoom < c.zoom.min) {
                continue;
            }
            // no stop subdivision in the case of a loading error
            if (layerUpdateState[c.id] && layerUpdateState[c.id].inError()) {
                continue;
            }
            nodeLayer = node.material.getColorTile(c.id);
            if (c.source.extentInsideLimit(node.extent, zoom) && (!nodeLayer || nodeLayer.level < 0)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Subdivides a node of this layer. If the node is currently in the process
     * of subdivision, it will not do anything here. The subdivision of a node
     * will occur in four part, to create a quadtree. The extent of the node
     * will be divided in four parts: north-west, north-east, south-west and
     * south-east. Once all four nodes are created, they will be added to the
     * current node and the view of the context will be notified of this change.
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {TileMesh} node - The node to subdivide.
     * @return {Promise}  { description_of_the_return_value }
     */
    subdivideNode(context, node) {
        if (!node.pendingSubdivision && !node.children.some(n => n.layer == this)) {
            const extents = node.extent.subdivision();
            // TODO: pendingSubdivision mechanism is fragile, get rid of it
            node.pendingSubdivision = true;

            const command = {
                /* mandatory */
                view: context.view,
                requester: node,
                layer: this,
                priority: 10000,
                /* specific params */
                extentsSource: extents,
                redraw: false,
            };

            return context.scheduler.execute(command).then((children) => {
                for (const child of children) {
                    node.add(child);
                    child.updateMatrixWorld(true);
                }

                node.pendingSubdivision = false;
                context.view.notifyChange(node, false);
            }, (err) => {
                node.pendingSubdivision = false;
                if (!err.isCancelledCommandException) {
                    throw new Error(err);
                }
            });
        }
    }

    /**
     * Test the subdvision of a node, compared to this layer.
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {PlanarLayer} layer - This layer, parameter to be removed.
     * @param {TileMesh} node - The node to test.
     *
     * @return {boolean} - True if the node is subdivisable, otherwise false.
     */
    subdivision(context, layer, node) {
        if (node.level < this.minSubdivisionLevel) {
            return true;
        }

        if (this.maxSubdivisionLevel <= node.level) {
            return false;
        }
        subdivisionVector.setFromMatrixScale(node.matrixWorld);
        boundingSphereCenter.copy(node.boundingSphere.center).applyMatrix4(node.matrixWorld);
        const distance = Math.max(
            0.0,
            context.camera.camera3D.position.distanceTo(boundingSphereCenter) - node.boundingSphere.radius * subdivisionVector.x);

        // Size projection on pixel of bounding
        if (context.camera.camera3D.isOrthographicCamera) {
            const camera3D = context.camera.camera3D;
            const preSSE = context.camera._preSSE * 2 * camera3D.zoom / (camera3D.top - camera3D.bottom);
            node.screenSize = preSSE * node.boundingSphere.radius * subdivisionVector.x;
        } else {
            node.screenSize = context.camera._preSSE * (2 * node.boundingSphere.radius * subdivisionVector.x) / distance;
        }

        // The screen space error is calculated to have a correct texture display.
        // For the projection of a texture's texel to be less than or equal to one pixel
        const sse = node.screenSize / (this.sizeDiagonalTexture * 2);

        return this.sseSubdivisionThreshold < sse;
    }
}

export default TiledGeometryLayer;
