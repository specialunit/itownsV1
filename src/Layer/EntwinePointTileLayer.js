import * as THREE from 'three';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import proj4 from 'proj4';

/**
 * @property {boolean} isEntwinePointTileLayer - Used to checkout whether this
 * layer is a EntwinePointTileLayer. Default is `true`. You should not change
 * this, as it is used internally for optimisation.
 */
class EntwinePointTileLayer extends PointCloudLayer {
    /**
     * Constructs a new instance of Entwine Point Tile layer.
     *
     * @constructor
     * @extends PointCloudLayer
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
     * @param {string} [config.crs=ESPG:4326] - The CRS of the {@link View} this
     * layer will be attached to. This is used to determine the extent of this
     * layer. Default to `EPSG:4326`.
     * @param {number} [config.skip=1] - Read one point from every `skip` points
     * - see {@link LASParser}.
     */
    constructor(id, config) {
        super(id, config);
        this.isEntwinePointTileLayer = true;
        this.scale = new THREE.Vector3(1, 1, 1);

        const resolve = this.addInitializationStep();

        const promises = [];
        this.root = [];
        this.whenReady = this.source.whenReady
            .then((sources) => {
                if (sources.isSource) { sources = [sources]; }
                sources.forEach((source) => {
                    promises.push(source.whenReady
                        .then((source) => {
                            if (this.crs !== config.crs) { console.warn('layer.crs is different from View.crs'); }
                            const root = new EntwinePointTileNode(0, 0, 0, 0, this, source, -1);

                            let forward = (x => x);
                            if (source.crs !== this.crs) {
                                try {
                                    forward = proj4(source.crs, this.crs).forward;
                                } catch (err) {
                                    throw new Error(`${err} is not defined in proj4`);
                                }
                            }

                            // for BBOX
                            const boundsConforming = [
                                ...forward(source.boundsConforming.slice(0, 3)),
                                ...forward(source.boundsConforming.slice(3, 6)),
                            ];
                            this.clamp = {
                                zmin: boundsConforming[2],
                                zmax: boundsConforming[5],
                            };

                            this.minElevationRange = source.boundsConforming[2];
                            this.maxElevationRange = source.boundsConforming[5];

                            const bounds = [
                                ...forward(source.bounds.slice(0, 3)),
                                ...forward(source.bounds.slice(3, 6)),
                            ];

                            root.bbox.setFromArray(bounds);

                            // Get the transformation between the data coordinate syteme and the view's.
                            const centerZ0 = source.boundsConforming
                                .slice(0, 2)
                                .map((val, i) =>  Math.floor((val + source.boundsConforming[i + 3]) * 0.5));
                            centerZ0.push(0);

                            const geometry = new THREE.BufferGeometry();
                            const points = new THREE.Points(geometry);

                            const matrixWorld = new THREE.Matrix4();
                            const matrixWorldInverse = new THREE.Matrix4();

                            let origin = new Coordinates(this.crs);
                            if (this.crs === 'EPSG:4978') {
                                const axisZ = new THREE.Vector3(0, 0, 1);
                                const alignYtoEast = new THREE.Quaternion();
                                const center = new Coordinates(source.crs, centerZ0);
                                origin = center.as('EPSG:4978');
                                const center4326 = origin.as('EPSG:4326');

                                // align Z axe to geodesic normal.
                                points.quaternion.setFromUnitVectors(axisZ, origin.geodesicNormal);
                                // align Y axe to East
                                alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + center4326.longitude));
                                points.quaternion.multiply(alignYtoEast);
                            }
                            points.updateMatrixWorld();

                            matrixWorld.copy(points.matrixWorld);
                            matrixWorldInverse.copy(matrixWorld).invert();

                            // proj in repere local (apply rotation) to get obb from bbox
                            const boundsLocal = [];
                            for (let i = 0; i < bounds.length; i += 3) {
                                const coord = new THREE.Vector3(...bounds.slice(i, i + 3)).sub(origin.toVector3());
                                const coordlocal = coord.applyMatrix4(matrixWorldInverse);
                                boundsLocal.push(...coordlocal);
                            }

                            const positionsArray = new Float32Array(boundsLocal);
                            const positionBuffer = new THREE.BufferAttribute(positionsArray, 3);
                            geometry.setAttribute('position', positionBuffer);

                            geometry.computeBoundingBox();

                            root.obb.fromBox3(geometry.boundingBox);
                            root.obb.applyMatrix4(matrixWorld);
                            root.obb.position = origin.toVector3();

                            this.root.push(root);

                            // NOTE: this spacing is kinda arbitrary here, we take the width and
                            // length (height can be ignored), and we divide by the specified
                            // span in ept.json. This needs improvements.
                            this.spacing = (Math.abs(source.bounds[3] - source.bounds[0])
                                + Math.abs(source.bounds[4] - source.bounds[1])) / (2 * source.span);

                            return root.loadOctree().then(resolve);
                        }));
                });
                this.whenReady = Promise.all(promises);
            });
    }
}

export default EntwinePointTileLayer;
