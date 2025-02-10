import * as THREE from 'three';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import proj4 from 'proj4';

/**
 * @property {boolean} isEntwinePointTileLayer - Used to checkout whether this
 * layer is a EntwinePointTileLayer. Default is `true`. You should not change
 * this, as it is used internally for optimisation.
 *
 * @extends PointCloudLayer
 */
class EntwinePointTileLayer extends PointCloudLayer {
    /**
     * Constructs a new instance of Entwine Point Tile layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new EntwinePointTileLayer('EPT',
     *  {
     *      source: new EntwinePointTileSource({
     *          url: 'https://server.geo/ept-dataset',
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
        this.isEntwinePointTileLayer = true;

        /**
         * @type {THREE.Vector3}
         */
        this.scale = new THREE.Vector3(1, 1, 1);
        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then(() => {
            // NOTE: this spacing is kinda arbitrary here, we take the width and
            // length (height can be ignored), and we divide by the specified
            // span in ept.json. This needs improvements.
            this.spacing = (Math.abs(this.source.bounds[3] - this.source.bounds[0])
                + Math.abs(this.source.bounds[4] - this.source.bounds[1])) / (2 * this.source.span);

            this.root = new EntwinePointTileNode(0, 0, 0, 0, this, -1);

            let forward = (x => x);
            if (this.source.crs !== this.crs) {
                try {
                    forward = proj4(this.source.crs, this.crs).forward;
                } catch (err) {
                    throw new Error(`${err} is not defined in proj4`);
                }
            }

            this.minElevationRange = this.minElevationRange ?? this.source.boundsConforming[2];
            this.maxElevationRange = this.maxElevationRange ?? this.source.boundsConforming[5];

            // for BBOX
            const tightBounds = [
                ...forward(this.source.boundsConforming.slice(0, 3)),
                ...forward(this.source.boundsConforming.slice(3, 6)),
            ];
            this.clamp = {
                zmin: tightBounds[2],
                zmax: tightBounds[5],
            };

            const bounds = [
                ...forward(this.source.bounds.slice(0, 3)),
                ...forward(this.source.bounds.slice(3, 6)),
            ];

            this.root.bbox.setFromArray(bounds);

            // for OBB
            // Get the transformation between the data coordinate syteme and the view's.
            const centerZ0 = this.source.boundsConforming
                .slice(0, 2)
                .map((val, i) =>  Math.floor((val + this.source.boundsConforming[i + 3]) * 0.5));
            centerZ0.push(0);

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

export default EntwinePointTileLayer;
