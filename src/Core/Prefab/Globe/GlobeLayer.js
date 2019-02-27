import * as THREE from 'three';
import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { ellipsoidSizes } from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import BuilderEllipsoidTile from 'Core/Prefab/Globe/BuilderEllipsoidTile';
import { SIZE_DIAGONAL_TEXTURE } from 'Provider/OGCWebServiceHelper';

// matrix to convert sphere to ellipsoid
const worldToScaledEllipsoid = new THREE.Matrix4();
// camera's position in worldToScaledEllipsoid system
const cameraPosition = new THREE.Vector3();
let magnitudeSquared = 0.0;

// vectors for operation purpose
const scaledHorizonCullingPoint = new THREE.Vector3();
const scaledToSphere = new THREE.Vector3(1.0, 1.0, ellipsoidSizes.x / ellipsoidSizes.z);

/**
 * @property {boolean} isGlobeLayer - Used to checkout whether this layer is a
 * GlobeLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class GlobeLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link GlobeView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @constructor
     * @extends TiledGeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3d} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {number} [config.minSubdivisionLevel=2] - Minimum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxSubdivisionLevel=18] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.sseSubdivisionThreshold=1] - Threshold level for
     * the SSE.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, object3d, config = {}) {
        // Configure tiles
        const schemeTile = [
            new Extent('EPSG:4326', -180, 0, -90, 90),
            new Extent('EPSG:4326', 0, 180, -90, 90)];
        const builder = new BuilderEllipsoidTile();

        super(id, object3d || new THREE.Group(), schemeTile, builder, config);

        this.isGlobeLayer = true;
        this.options.defaultPickingRadius = 5;
        this.minSubdivisionLevel = this.minSubdivisionLevel || 2.0;
        this.maxSubdivisionLevel = this.maxSubdivisionLevel || 18.0;
        this.maxDeltaElevation = this.maxDeltaElevation || 4.0;

        this.extent = this.schemeTile[0].clone();

        for (let i = 1; i < this.schemeTile.length; i++) {
            this.extent.union(this.schemeTile[i]);
        }

        // We're going to use the method described here:
        //    https://cesiumjs.org/2013/04/25/Horizon-culling/
        // This method assumes that the globe is a unit sphere at 0,0,0 so
        // we setup a world-to-scaled-ellipsoid matrix4
        worldToScaledEllipsoid.getInverse(this.object3d.matrixWorld);
        worldToScaledEllipsoid.premultiply(
            new THREE.Matrix4().makeScale(
                1 / ellipsoidSizes.x,
                1 / ellipsoidSizes.y,
                1 / ellipsoidSizes.z));
    }

    preUpdate(context, changeSources) {
        // pre-horizon culling
        cameraPosition.copy(context.camera.camera3D.position).applyMatrix4(worldToScaledEllipsoid);
        magnitudeSquared = cameraPosition.lengthSq() - 1.0;

        // pre-horizon subdivision
        scaledHorizonCullingPoint.copy(context.camera.camera3D.position).multiply(scaledToSphere);

        const distanceToCenter = scaledHorizonCullingPoint.length();
        const distanceToHorizon = (distanceToCenter ** 2 - ellipsoidSizes.x ** 2) ** 0.5;
        const distanceToGround = Math.max(distanceToCenter - ellipsoidSizes.x, 0);
        const factor = Math.min(distanceToGround / ellipsoidSizes.x, 1.0) ** 0.25;
        // context.horizon = distanceToHorizon - (distanceToHorizon - distanceToGround) * 0.75 * (1 - factor);
        context.horizon = distanceToHorizon - (distanceToHorizon - distanceToGround) * 0.2 * (1 - factor);

        return super.preUpdate(context, changeSources);
    }

    // eslint-disable-next-line class-methods-use-this
    countColorLayersTextures(...layers) {
        let occupancy = 0;
        for (const layer of layers) {
            const projection = layer.projection || layer.source.projection;
            // 'EPSG:3857' occupies the maximum 3 textures on tiles
            // 'EPSG:4326' occupies 1 textures on tile
            occupancy += projection == 'EPSG:3857' ? 3 : 1;
        }
        return occupancy;
    }

    // eslint-disable-next-line
    culling(node, camera) {
        if (super.culling(node, camera)) {
            return true;
        }

        if (node.level < this.minSubdivisionLevel) {
            return false;
        }

        // see https://cesiumjs.org/2013/04/25/Horizon-culling/
        scaledHorizonCullingPoint.copy(node.horizonCullingPoint).applyMatrix4(worldToScaledEllipsoid);
        scaledHorizonCullingPoint.sub(cameraPosition);

        const vtMagnitudeSquared = scaledHorizonCullingPoint.lengthSq();
        const dot = -scaledHorizonCullingPoint.dot(cameraPosition);
        const isOccluded = magnitudeSquared < 0 ? dot > 0 : magnitudeSquared < dot && magnitudeSquared < ((dot * dot) / vtMagnitudeSquared);

        return isOccluded;
    }

    computeTileZoomFromDistanceCamera(distance, camera) {
        const preSinus =
            SIZE_DIAGONAL_TEXTURE * (this.sseSubdivisionThreshold * 0.5) / camera._preSSE / ellipsoidSizes.x;

        let sinus = distance * preSinus;
        let zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        const delta = Math.PI / 2 ** zoom;
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;

        // adjust with bounding sphere rayon
        sinus = (distance - radius) * preSinus;
        zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        return isNaN(zoom) ? 0 : Math.round(zoom);
    }

    computeDistanceCameraFromTileZoom(zoom, camera) {
        const delta = Math.PI / 2 ** zoom;
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;
        const error = radius / SIZE_DIAGONAL_TEXTURE;

        return camera._preSSE * error / (this.sseSubdivisionThreshold * 0.5) + radius;
    }
}

export default GlobeLayer;
