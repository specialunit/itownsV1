import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import { InfoTiledGeometryLayer } from 'Layer/InfoLayer';
import Picking from 'Core/Picking';
import convertToTile from 'Converter/convertToTile';
import CancelledCommandException from 'Core/Scheduler/CancelledCommandException';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import { SIZE_DIAGONAL_TEXTURE } from 'Provider/OGCWebServiceHelper';

const subdivisionVector = new THREE.Vector3();
const boundingSphereCenter = new THREE.Vector3();

/**
 * @property {InfoTiledGeometryLayer} info - Status information of layer
 * @property {boolean} isTiledGeometryLayer - Used to checkout whether this
 * layer is a TiledGeometryLayer. Default is true. You should not change this,
 * as it is used internally for optimisation.
 */
class TiledGeometryLayer extends GeometryLayer {
    /**
     * A layer extending the {@link GeometryLayer}, but with a tiling notion.
     *
     * @constructor
     * @extends GeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3d} object3d - The object3d used to contain the
     * geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Array} schemeTile - extents Array of root tiles
     * @param {Object} builder - builder geometry object
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {WMTSSource|WMSSource|WFSSource|TMSSource|FileSource} [config.source] -
     * Description and options of the source.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, object3d, schemeTile, builder, config) {
        super(id, object3d, config);

        this.isTiledGeometryLayer = true;

        this.protocol = 'tile';
        this.lighting = {
            enable: false,
            position: { x: -0.5, y: 0.0, z: 1.0 },
        };

        this.sseSubdivisionThreshold = this.sseSubdivisionThreshold || 1.0;

        this.schemeTile = schemeTile;
        this.builder = builder;
        this.info = new InfoTiledGeometryLayer(this);

        if (!this.schemeTile) {
            throw new Error(`Cannot init tiled layer without schemeTile for layer ${this.id}`);
        }

        if (!this.builder) {
            throw new Error(`Cannot init tiled layer without builder for layer ${this.id}`);
        }

        this.level0Nodes = [];
        const promises = [];

        for (const root of this.schemeTile) {
            promises.push(this.convert(undefined, root));
        }
        Promise.all(promises).then((level0s) => {
            this.level0Nodes = level0s;
            for (const level0 of level0s) {
                this.object3d.add(level0);
                level0.updateMatrixWorld();
            }
        });
    }

    /**
     * Picking method for this layer. It uses the {@link Picking#pickTilesAt}
     * method.
     *
     * @param {View} view - The view instance.
     * @param {Object} coordinates - The coordinates to pick in the view. It
     * should have at least <code>x</code> and <code>y</code> properties.
     * @param {number} radius - Radius of the picking circle.
     *
     * @return {Array} An array containing all targets picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coordinates, radius = this.options.defaultPickingRadius) {
        return Picking.pickTilesAt(view, coordinates, radius, this);
    }

    /**
     * Does pre-update work on the context:
     * <ul>
     *  <li>update the <code>colorLayers</code> and
     *  <code>elevationLayers</code></li>
     *  <li>update the <code>maxElevationLevel</code></li>
     * </ul>
     *
     * Once this work is done, it returns a list of nodes to update. Depending
     * on the origin of <code>sources</code>, it can return a few things:
     * <ul>
     *  <li>if <code>sources</code> is empty, it returns the first node of the
     *  layer (stored as <code>level0Nodes</code>), which will trigger the
     *  update of the whole tree</li>
     *  <li>if the update is triggered by a camera move, the whole tree is
     *  returned too</li>
     *  <li>if <code>source.layer</code> is this layer, it means that
     *  <code>source</code> is a node; a common ancestor will be found if there
     *  are multiple sources, with the default common ancestor being the first
     *  source itself</li>
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
                // update uniforms
                if (context.view.fogDistance != undefined) {
                    node.material.fogDistance = context.view.fogDistance;
                }

                if (context.horizon != undefined) {
                    node.material.horizonDistance = context.horizon;
                }

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

    // eslint-disable-next-line class-methods-use-this
    countColorLayersTextures(...layers) {
        return layers.length;
    }

    // eslint-disable-next-line
    culling(node, camera) {
        return !camera.isBox3Visible(node.obb.box3D, node.obb.matrixWorld);
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
        let nodeLayer = node.material.getElevationLayer();

        for (const e of context.elevationLayers) {
            const extents = node.getCoordsForSource(e.source);
            if (!e.frozen && e.ready && e.source.extentsInsideLimit(extents) && (!nodeLayer || nodeLayer.level < 0)) {
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
            // no stop subdivision in the case of a loading error
            if (layerUpdateState[c.id] && layerUpdateState[c.id].inError()) {
                continue;
            }
            const extents = node.getCoordsForSource(c.source);
            nodeLayer = node.material.getLayer(c.id);
            if (c.source.extentsInsideLimit(extents) && (!nodeLayer || nodeLayer.level < 0)) {
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

            context.scheduler.execute(command).then((children) => {
                for (const child of children) {
                    node.add(child);
                    child.updateMatrixWorld(true);
                }

                node.pendingSubdivision = false;
                context.view.notifyChange(node, false);
            }, (err) => {
                node.pendingSubdivision = false;
                if (!(err instanceof CancelledCommandException)) {
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

        // Prevent to subdivise the node if the current elevation level
        // we must avoid a tile, with level 20, inherits a level 3 elevation texture.
        // The induced geometric error is much too large and distorts the SSE
        const nodeLayer = node.material.getElevationLayer();
        if (nodeLayer) {
            const currentTexture = nodeLayer.textures[0];
            if (currentTexture && currentTexture.extent) {
                const offsetScale = nodeLayer.offsetScales[0];
                const ratio = offsetScale.z;
                // ratio is node size / texture size
                if (ratio < 1 / Math.pow(2, this.maxDeltaElevationLevel)) {
                    return false;
                }
            }
        }

        subdivisionVector.setFromMatrixScale(node.matrixWorld);
        boundingSphereCenter.copy(node.boundingSphere.center).applyMatrix4(node.matrixWorld);
        const distance = Math.max(
            0.0,
            context.camera.camera3D.position.distanceTo(boundingSphereCenter) - node.boundingSphere.radius * subdivisionVector.x);

        let o = 0.0;
        if (context.horizon) {
            const a = context.horizon / (800.0 * 6378137.0);
            o += 10.0 / (1.0 + Math.exp(-a * (distance - context.horizon)));
            // return false;
        }

        // Size projection on pixel of bounding
        node.screenSize = context.camera._preSSE * (2 * node.boundingSphere.radius * subdivisionVector.x) / distance;

        // The screen space error is calculated to have a correct texture display.
        // For the projection of a texture's texel to be less than or equal to one pixel
        const sse = node.screenSize / (SIZE_DIAGONAL_TEXTURE * 2);

        return this.sseSubdivisionThreshold * (1 + o) < sse;
    }
}

export default TiledGeometryLayer;
