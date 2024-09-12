import * as THREE from 'three';
import CopcNode from 'Core/CopcNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import proj4 from 'proj4';

/**
 * @classdesc
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
        this.isCopcLayer = true;

        const resolve = () => this;

        const promises = [];
        this.root = [];

        this.source.whenReady
            .then((sources) => {
                if (sources.isSource) { sources = [sources]; }
                sources.forEach((source) => {
                    promises.push(source.whenReady
                        .then((/** @type {CopcSource} */ source) => {
                            const { cube, rootHierarchyPage } = source.info;
                            const { pageOffset, pageLength } = rootHierarchyPage;

                            if (this.crs !== config.crs) { console.warn('layer.crs is different from View.crs'); }

                            const root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this, source, -1);

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
                                ...forward(source.header.min),
                                ...forward(source.header.max),
                            ];

                            this.clamp = {
                                zmin: boundsConforming[2],
                                zmax: boundsConforming[5],
                            };

                            this.minElevationRange = source.header.min[2];
                            this.maxElevationRange = source.header.max[2];

                            this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
                            this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

                            const bounds = [
                                ...forward(cube.slice(0, 3)),
                                ...forward(cube.slice(3, 6)),
                            ];

                            root.bbox.setFromArray(bounds);

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

                            return root.loadOctree().then(resolve);
                        }));
                });
                this.whenReady = Promise.all(promises);
            });
    }

    get spacing() {
        if (this.source.isMultiple) {
            const spacings = new Set(this.source.sources.map(source => source.info.spacing)).size;
            if (spacings > 1) {
                console.warn("Warning, multiSpacing isn't not handled yet");
            }
            return this.source.sources[0].info.spacing;
        } else {
            return this.source.info.spacing;
        }
    }
}

export default CopcLayer;
