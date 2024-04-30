import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PotreeNode from 'Core/PotreeNode';

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
     * @param {string} [config.crs='ESPG:4326'] - The CRS of the {@link View} this
     * layer will be attached to. This is used to determine the extent of this
     * layer.  Default to `EPSG:4326`.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isPotreeLayer = true;

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then((cloud) => {
            this.scale = new THREE.Vector3().addScalar(cloud.scale);
            this.spacing = cloud.spacing;
            this.hierarchyStepSize = cloud.hierarchyStepSize;

            const normal = Array.isArray(cloud.pointAttributes) &&
                cloud.pointAttributes.find(elem => elem.startsWith('NORMAL'));
            if (normal) {
                this.material.defines[normal] = 1;
            }

            this.supportsProgressiveDisplay = (this.source.extension === 'cin');

            this.setElevationRange(cloud.tightBoundingBox.lz, cloud.tightBoundingBox.uz);

            this.root = new PotreeNode(0, 0, this);

            this.setRootBbox([cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz],
                [cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz]);

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default PotreeLayer;
