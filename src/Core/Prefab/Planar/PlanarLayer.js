import * as THREE from 'three';

import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import PlanarTileBuilder from './PlanarTileBuilder';

/**
 * @property {boolean} isPlanarLayer - Used to checkout whether this layer is a
 * PlanarLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class PlanarLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link PlanarView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @constructor
     * @extends TiledGeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Extent} extent - The extent to define the layer within.
     * @param {THREE.Object3d} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {number} [config.maxSubdivisionLevel=5] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, extent, object3d, config = {}) {
        super(id, object3d || new THREE.Group(), [extent], new PlanarTileBuilder(), config);
        this.isPlanarLayer = true;
        this.extent = extent;
        this.minSubdivisionLevel = this.minSubdivisionLevel || 0;
        this.maxSubdivisionLevel = this.maxSubdivisionLevel || 5.0;
        this.maxDeltaElevation = this.maxDeltaElevation || 4.0;
    }

    preUpdate(context, changeSources) {
        const fov = THREE.Math.degToRad(context.camera.camera3D.fov * 0.5);
        const ratioHorizon = 0.1;
        const distanceToGround = context.camera.camera3D.position.z;
        context.horizon = distanceToGround / Math.sin(Math.atan(ratioHorizon * Math.tan(fov)));

        return super.preUpdate(context, changeSources);
    }
}

export default PlanarLayer;
