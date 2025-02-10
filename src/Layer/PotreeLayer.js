import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PotreeNode from 'Core/PotreeNode';
import Coordinates from 'Core/Geographic/Coordinates';
import proj4 from 'proj4';

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

            this.minElevationRange = this.minElevationRange ?? cloud.tightBoundingBox.lz; // cloud.boundingBox.lz;
            this.maxElevationRange = this.maxElevationRange ?? cloud.tightBoundingBox.uz;

            // for BBOX
            const tightBounds = [
                ...forward([cloud.tightBoundingBox.lx, cloud.tightBoundingBox.ly, cloud.tightBoundingBox.lz]),
                ...forward([cloud.tightBoundingBox.ux, cloud.tightBoundingBox.uy, cloud.tightBoundingBox.uz]),
            ];
            this.clamp = {
                zmin: tightBounds[2],
                zmax: tightBounds[5],
            };

            const bounds = [
                ...forward([cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz]),
                ...forward([cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz]),
            ];

            this.root.bbox.setFromArray(bounds);

            // for OBB
            const centerZ0 = [
                (cloud.tightBoundingBox.lx + cloud.tightBoundingBox.ux) * 0.5,
                (cloud.tightBoundingBox.ly + cloud.tightBoundingBox.uy) * 0.5,
                0,
            ];

            const geometry = new THREE.BufferGeometry();
            const points = new THREE.Points(geometry);

            const matrix = new THREE.Matrix4();
            const matrixInverse = new THREE.Matrix4();

            let origin = new Coordinates(this.source.crs, ...centerZ0);
            if (this.crs === 'EPSG:4978') {
                const axisZ = new THREE.Vector3(0, 0, 1);
                const alignYtoEast = new THREE.Quaternion();
                origin = origin.as('EPSG:4978');
                const origin4326 = origin.as('EPSG:4326');

                // align Z axe to geodesic normal.
                points.quaternion.setFromUnitVectors(axisZ, origin.geodesicNormal);
                // align Y axe to East
                alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + origin4326.longitude));
                points.quaternion.multiply(alignYtoEast);
            }
            points.updateMatrix();

            matrix.copy(points.matrix);
            matrixInverse.copy(matrix).invert();

            // proj in repere local (apply rotation) to get obb from bbox
            const boundsLocal = [];
            for (let i = 0; i < bounds.length; i += 3) {
                const coord = new THREE.Vector3(...bounds.slice(i, i + 3))
                    .sub(origin.toVector3());
                const coordlocal = coord.applyMatrix4(matrixInverse);
                boundsLocal.push(...coordlocal);
            }
            const positionsArray = new Float32Array(boundsLocal);
            const positionBuffer = new THREE.BufferAttribute(positionsArray, 3);
            geometry.setAttribute('position', positionBuffer);

            geometry.computeBoundingBox();

            this.root.obb.fromBox3(geometry.boundingBox);
            this.root.obb.applyMatrix4(matrix);
            this.root.obb.position = origin.toVector3();

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default PotreeLayer;
