import * as THREE from 'three';
import CopcNode from 'Core/CopcNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import proj4 from 'proj4';

/**
 * A layer for [Cloud Optimised Point Cloud](https://copc.io) (COPC) datasets.
 * See {@link PointCloudLayer} class for documentation on base properties.
 *
 * @extends {PointCloudLayer}
 *
 * @example
 * // Create a new COPC layer
 * const copcSource = new CopcSource({
 *     url: 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz',
 *     crs: 'EPSG:4978',
 *     colorDepth: 16, // bit-depth of 'color' attribute (either 8 or 16 bits)
 * });
 *
 * const copcLayer = new CopcLayer('COPC', {
 *     source: copcSource,
 * });
 *
 * View.prototype.addLayer.call(view, copcLayer);
 */
class CopcLayer extends PointCloudLayer {
    /**
     * @param {string} id - Unique id of the layer.
     * @param {Object} config - See {@link PointCloudLayer} for base pointcloud
     * options.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isCopcLayer = true;

        const resolve = () => this;
        this.whenReady = this.source.whenReady.then((/** @type {CopcSource} */ source) => {
            const { cube } = source.info;
            const { pageOffset, pageLength } = source.info.rootHierarchyPage;

            this.spacing = source.info.spacing;

            if (this.crs !== config.crs) { console.warn('layer.crs is different from View.crs'); }

            this.root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this, -1);

            let forward = (x => x);
            if (this.source.crs !== this.crs) {
                try {
                    forward = proj4(this.source.crs, this.crs).forward;
                } catch (err) {
                    throw new Error(`${err} is not defined in proj4`);
                }
            }

            // for BBOX
            const boundsConforming = [
                ...forward(source.header.min),
                ...forward(source.header.max),
            ];

            this.clamp = {
                zmin: boundsConforming[2],
                zmax: boundsConforming[5],
            };

            this.minElevationRange = this.minElevationRange ?? source.header.min[2];
            this.maxElevationRange = this.maxElevationRange ?? source.header.max[2];

            this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
            this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

            const bounds = [
                ...forward(cube.slice(0, 3)),
                ...forward(cube.slice(3, 6)),
            ];

            this.root.bbox.setFromArray(bounds);

            const centerZ0 = source.header.min.slice(0, 2)
                .map((val, i) =>  Math.floor((val + source.header.max[i]) * 0.5));
            centerZ0.push(0);

            const geometry = new THREE.BufferGeometry();
            const points = new THREE.Points(geometry);

            const matrixWorld = new THREE.Matrix4();
            const matrixWorldInverse = new THREE.Matrix4();

            let origin = new Coordinates(this.crs);
            if (this.crs === 'EPSG:4978') {
                const axisZ = new THREE.Vector3(0, 0, 1);
                const alignYtoEast = new THREE.Quaternion();
                const center = new Coordinates(this.source.crs, ...centerZ0);
                origin = center.as('EPSG:4978');
                const origin4326 = origin.as('EPSG:4326');

                // align Z axe to geodesic normal.
                points.quaternion.setFromUnitVectors(axisZ, origin.geodesicNormal);
                // align Y axe to East
                alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + origin4326.longitude));
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

            this.root.obb.fromBox3(geometry.boundingBox);
            this.root.obb.applyMatrix4(matrixWorld);
            this.root.obb.position = origin.toVector3();

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default CopcLayer;
