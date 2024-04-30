import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PotreeNode from 'Core/PotreeNode';
import proj4 from 'proj4';
import Extent from 'Core/Geographic/Extent';

/**
 * @property {boolean} isPotreeLayer - Used to checkout whether this layer
 * is a PotreeLayer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 *
 * @extends PointCloudLayer
 */
class PotreeLayer extends PointCloudLayer {
    /**
     * Constructs a new instance of Potree layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new PotreeLayer('points',
     *  {
     *      source: new PotreeLayer({
     *          url: 'https://pointsClouds/',
     *          file: 'points.js',
     *      }
     *  });
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} config - Configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isPotreeLayer = true;

        const resolve = this.addInitializationStep();

        this.source.whenReady.then((cloud) => {
            this.scale = new THREE.Vector3().addScalar(cloud.scale);
            this.spacing = cloud.spacing;
            this.hierarchyStepSize = cloud.hierarchyStepSize;

            const normal = Array.isArray(cloud.pointAttributes) &&
                cloud.pointAttributes.find(elem => elem.startsWith('NORMAL'));
            if (normal) {
                this.material.defines[normal] = 1;
            }

            this.supportsProgressiveDisplay = (this.source.extension === 'cin');

            this.root = new PotreeNode(0, 0, this);

            let forward = (x => x);
            if (this.source.crs !== this.crs) {
                try {
                    forward = proj4(this.source.crs, this.crs).forward;
                } catch (err) {
                    throw new Error(`${err} is not defined in proj4`);
                }
            }

            this.minElevationRange = cloud.tightBoundingBox.lz;
            this.maxElevationRange = cloud.tightBoundingBox.uz;

            const bounds = [
                ...forward([cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz]),
                ...forward([cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz]),
            ];

            this.root.bbox.setFromArray(bounds);

            this.minElevationRange = this.minElevationRange ?? cloud.boundingBox.lz;
            this.maxElevationRange = this.maxElevationRange ?? cloud.boundingBox.uz;

            this.extent = Extent.fromBox3(this.source.crs || 'EPSG:4326', this.root.bbox);
            return this.root.loadOctree().then(resolve);
        });
    }
}

export default PotreeLayer;
