import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import PointsMaterial, { PNTS_MODE } from 'Renderer/PointsMaterial';
import Picking from 'Core/Picking';
import proj4 from 'proj4';
import OrientationUtils from 'Utils/OrientationUtils';

const point = new THREE.Vector3();
const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

function positionFromBbox(bbox) {
    const array =  new Float32Array(8 * 3);

    const min = bbox.min;
    const max = bbox.max;

    array[0] = max.x; array[1] = max.y; array[2] = max.z;
    array[3] = min.x; array[4] = max.y; array[5] = max.z;
    array[6] = min.x; array[7] = min.y; array[8] = max.z;
    array[9] = max.x; array[10] = min.y; array[11] = max.z;
    array[12] = max.x; array[13] = max.y; array[14] = min.z;
    array[15] = min.x; array[16] = max.y; array[17] = min.z;
    array[18] = min.x; array[19] = min.y; array[20] = min.z;
    array[21] = max.x; array[22] = min.y; array[23] = min.z;
    return array;
}

function initBoundingBox(elt, layer) {
    // bbox in local ref -> cyan
    const boxHelper = elt.boxHelper;
    elt.obj.boxHelper = boxHelper;
    layer.bboxes.add(boxHelper);
    boxHelper.updateMatrixWorld(true);

    // tightbbox in local ref -> blue
    const tightboxHelper = new THREE.BoxHelper(undefined, 0x0000ff);
    tightboxHelper.geometry.attributes.position.array = positionFromBbox(elt.obj.geometry.boundingBox);
    tightboxHelper.applyMatrix4(elt.obj.matrixWorld);
    elt.obj.tightboxHelper = tightboxHelper;
    layer.bboxes.add(tightboxHelper);
    tightboxHelper.updateMatrixWorld(true);
}

function createBoxHelper(bbox, quaternion, origin) {
    const boxHelper = new THREE.BoxHelper(undefined, 0x00ffff);
    boxHelper.geometry.attributes.position.array = positionFromBbox(bbox);

    boxHelper.position.copy(origin);
    boxHelper.quaternion.copy(quaternion.clone().invert());
    boxHelper.updateMatrix();
    boxHelper.updateMatrixWorld();

    boxHelper.geometry.computeBoundingBox();

    return boxHelper;
}

function computeSSEPerspective(context, pointSize, spacing, elt, distance) {
    if (distance <= 0) {
        return Infinity;
    }
    const pointSpacing = spacing / 2 ** elt.depth;
    // Estimate the onscreen distance between 2 points
    const onScreenSpacing = context.camera.preSSE * pointSpacing / distance;
    // [  P1  ]--------------[   P2   ]
    //     <--------------------->      = pointsSpacing (in world coordinates)
    //                                  ~ onScreenSpacing (in pixels)
    // <------>                         = pointSize (in pixels)
    return Math.max(0.0, onScreenSpacing - pointSize);
}

function computeSSEOrthographic(context, pointSize, spacing, elt) {
    const pointSpacing = spacing / 2 ** elt.depth;

    // Given an identity view matrix, project pointSpacing from world space to
    // clip space. v' = vVP = vP
    const v = new THREE.Vector4(pointSpacing);
    v.applyMatrix4(context.camera.camera3D.projectionMatrix);

    // We map v' to the screen space and calculate the distance to the origin.
    const dx = v.x * 0.5 * context.camera.width;
    const dy = v.y * 0.5 * context.camera.height;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return Math.max(0.0, distance - pointSize);
}

function computeScreenSpaceError(context, pointSize, spacing, elt, distance) {
    if (context.camera.camera3D.isOrthographicCamera) {
        return computeSSEOrthographic(context, pointSize, spacing, elt);
    }

    return computeSSEPerspective(context, pointSize, spacing, elt, distance);
}

function markForDeletion(elt) {
    if (elt.obj) {
        elt.obj.visible = false;
        if (__DEBUG__) {
            if (elt.obj.boxHelper) {
                elt.obj.boxHelper.visible = false;
                elt.obj.tightboxHelper.visible = false;
            }
        }
    }

    if (!elt.notVisibleSince) {
        elt.notVisibleSince = Date.now();
        // Set .sse to an invalid value
        elt.sse = -1;
    }
    for (const child of elt.children) {
        markForDeletion(child);
    }
}

function changeIntensityRange(layer) {
    layer.material.intensityRange?.set(layer.minIntensityRange, layer.maxIntensityRange);
}

function changeElevationRange(layer) {
    layer.material.elevationRange?.set(layer.minElevationRange, layer.maxElevationRange);
}

function changeAngleRange(layer) {
    layer.material.angleRange?.set(layer.minAngleRange, layer.maxAngleRange);
}

/**
 * The basis for all point clouds related layers.
 *
 * @property {boolean} isPointCloudLayer - Used to checkout whether this layer
 * is a PointCloudLayer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 * @property {THREE.Group|THREE.Object3D} group - Contains the created
 * `THREE.Points` meshes, usually with an instance of a `THREE.Points` per node.
 * @property {THREE.Group|THREE.Object3D} bboxes - Contains the bounding boxes
 * (`THREE.Box3`) of the tree, usually one per node.
 * @property {number} octreeDepthLimit - The depth limit at which to stop
 * browsing the octree. Can be used to limit the browsing, without having to
 * edit manually the source of the point cloud. No limit by default (`-1`).
 * @property {number} [pointBudget=2000000] - Maximum number of points to
 * display at the same time. This influences the performance of rendering.
 * Default to two millions points.
 * @property {number} [sseThreshold=2] - Threshold of the **S**creen **S**pace
 * **E**rror. Default to `2`.
 * @property {number} [pointSize=4] - The size (in pixels) of the points.
 * Default to `4`.
 * @property {THREE.Material|PointsMaterial} [material=new PointsMaterial] - The
 * material to use to display the points of the cloud. Be default it is a new
 * `PointsMaterial`.
 * @property {number} [mode=PNTS_MODE.COLOR] - The displaying mode of the points.
 * Values are specified in `PointsMaterial`.
 * @property {number} [minIntensityRange=0] - The minimal intensity of the
 * layer. Changing this value will affect the material, if it has the
 * corresponding uniform. The value is normalized between 0 and 1.
 * @property {number} [maxIntensityRange=1] - The maximal intensity of the
 * layer. Changing this value will affect the material, if it has the
 * corresponding uniform. The value is normalized between 0 and 1.
 *
 * @extends GeometryLayer
 */
class PointCloudLayer extends GeometryLayer {
    /**
     * Constructs a new instance of point cloud layer.
     * Constructs a new instance of a Point Cloud Layer. This should not be used
     * directly, but rather implemented using `extends`.
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     * @param {Source} config.source - Description and options of the source See @Layer.
     * @param {number}  [options.minElevationRange] - Min value for the elevation range (default value will be taken from the source.metadata).
     * @param {number}  [options.maxElevationRange] - Max value for the elevation range (default value will be taken from the source.metadata).
     */
    constructor(id, config = {}) {
        const {
            object3d = new THREE.Group(),
            group = new THREE.Group(),
            bboxes = new THREE.Group(),
            octreeDepthLimit = -1,
            pointBudget = 2000000,
            pointSize = 2,
            sseThreshold = 2,
            minIntensityRange = 1,
            maxIntensityRange = 65536,
            minElevationRange,
            maxElevationRange,
            minAngleRange = -90,
            maxAngleRange = 90,
            material = {},
            mode = PNTS_MODE.COLOR,
            ...geometryLayerConfig
        } = config;

        super(id, object3d, geometryLayerConfig);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isPointCloudLayer = true;
        this.protocol = 'pointcloud';

        this.group = group;
        this.object3d.add(this.group);

        this.bboxes = bboxes || new THREE.Group();
        this.bboxes.name = 'bboxes';
        this.bboxes.visible = false;
        this.object3d.add(this.bboxes);

        this.group.updateMatrixWorld();

        // default config
        /**
         * @type {number}
         */
        this.octreeDepthLimit = octreeDepthLimit;

        /**
         * @type {number}
         */
        this.pointBudget = pointBudget;

        /**
         * @type {number}
         */
        this.pointSize = pointSize;

        /**
         * @type {number}
         */
        this.sseThreshold = sseThreshold;

        this.defineLayerProperty('minIntensityRange', minIntensityRange, changeIntensityRange);
        this.defineLayerProperty('maxIntensityRange', maxIntensityRange, changeIntensityRange);
        this.defineLayerProperty('minElevationRange', minElevationRange, changeElevationRange);
        this.defineLayerProperty('maxElevationRange', maxElevationRange, changeElevationRange);
        this.defineLayerProperty('minAngleRange', minAngleRange, changeAngleRange);
        this.defineLayerProperty('maxAngleRange', maxAngleRange, changeAngleRange);

        /**
         * @type {THREE.Material}
         */
        this.material = material;
        if (!this.material.isMaterial) {
            this.material.intensityRange = new THREE.Vector2(this.minIntensityRange, this.maxIntensityRange);
            this.material.elevationRange = new THREE.Vector2(this.minElevationRange, this.maxElevationRange);
            this.material.angleRange = new THREE.Vector2(this.minAngleRange, this.maxAngleRange);
            this.material = new PointsMaterial(this.material);
        }

        this.mode = mode || PNTS_MODE.COLOR;

        /**
         * @type {PointCloudNode | undefined}
         */
        this.root = undefined;
    }

    setRootBbox(min, max) {
        let forward = (x => x);
        if (this.source.crs !== this.crs) {
            try {
                forward = proj4(this.source.crs, this.crs).forward;
            } catch (err) {
                throw new Error(`${err} is not defined in proj4`);
            }
        }

        const corners = [
            ...forward([max[0], max[1], max[2]]),
            ...forward([min[0], max[1], max[2]]),
            ...forward([min[0], min[1], max[2]]),
            ...forward([max[0], min[1], max[2]]),
            ...forward([max[0], max[1], min[2]]),
            ...forward([min[0], max[1], min[2]]),
            ...forward([min[0], min[1], min[2]]),
            ...forward([max[0], min[1], min[2]]),
        ];

        // get center of box at altitude=Z and project it in view crs;
        const origin = forward([(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, 0]);

        // getLocalRotation()
        const isGeocentric = proj4.defs(this.crs).projName === 'geocent';
        let rotation = new THREE.Quaternion();
        if (isGeocentric) {
            rotation = OrientationUtils.quaternionFromCRSToCRS(this.crs, 'EPSG:4326')(origin);
        }

        // project corners in local referentiel
        const cornersLocal = [];
        for (let i = 0; i < 24; i += 3) {
            const cornerLocal = new THREE.Vector3(
                corners[i] - origin[0],
                corners[i + 1] - origin[1],
                corners[i + 2] - origin[2],
            );
            cornerLocal.applyQuaternion(rotation);
            cornersLocal.push(...cornerLocal.toArray());
        }

        // get the bbox containing all cornersLocal => the bboxLocal
        const _bbox = new THREE.Box3().setFromArray(cornersLocal);
        this.root._bbox = _bbox;

        this.root._position = new THREE.Vector3(...origin);
        this.root._quaternion = rotation;
    }

    setElevationRange(zmin, zmax) {
        this.minElevationRange = this.minElevationRange ?? zmin;
        this.maxElevationRange = this.maxElevationRange ?? zmax;
    }

    preUpdate(context, changeSources) {
        // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
        // slide 17
        context.camera.preSSE =
            context.camera.height /
                (2 * Math.tan(THREE.MathUtils.degToRad(context.camera.camera3D.fov) * 0.5));

        if (this.material) {
            this.material.visible = this.visible;
            this.material.opacity = this.opacity;
            this.material.transparent = this.opacity < 1 || this.material.userData.needTransparency[this.material.mode];
            this.material.size = this.pointSize;
            this.material.scale = context.camera.preSSE;
            if (this.material.updateUniforms) {
                this.material.updateUniforms();
            }
        }

        // lookup lowest common ancestor of changeSources
        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera || source == this) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return [this.root];
            }
            if (source.obj === undefined) {
                continue;
            }
            // filter sources that belong to our layer
            if (source.obj.isPoints && source.obj.layer == this) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);

                    if (!commonAncestor) {
                        return [this.root];
                    }
                }
            }
        }

        if (commonAncestor) {
            return [commonAncestor];
        }

        // Start updating from hierarchy root
        return [this.root];
    }

    update(context, layer, elt) {
        elt.visible = false;

        if (this.octreeDepthLimit >= 0 && this.octreeDepthLimit < elt.depth) {
            markForDeletion(elt);
            return;
        }

        // get object on which to measure distance
        let obj;
        if (elt.obj) {
            obj = elt.obj;
        } else {
            elt.boxHelper = createBoxHelper(elt._bbox, elt._quaternion, elt._position);
            obj = elt.boxHelper;
        }
        const bbox = obj.geometry.boundingBox;
        elt.visible = context.camera.isBox3Visible(obj.geometry.boundingBox, obj.matrixWorld);

        if (!elt.visible) {
            markForDeletion(elt);
            return;
        }

        elt.notVisibleSince = undefined;

        point.copy(context.camera.camera3D.position)
            .sub(obj.getWorldPosition(new THREE.Vector3()))
            .applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()).invert());

        const distanceToCamera = bbox.distanceToPoint(point);

        // only load geometry if this elements has points
        if (elt.numPoints !== 0) {
            if (elt.obj) {
                elt.obj.visible = true;

                if (__DEBUG__) {
                    if (this.bboxes.visible) {
                        if (!elt.obj.boxHelper) {
                            initBoundingBox(elt, layer);
                        }
                        elt.obj.boxHelper.visible = true;
                        // elt.obj.boxHelper.material.color.r = 1 - elt.sse;
                        // elt.obj.boxHelper.material.color.g = elt.sse;

                        elt.obj.tightboxHelper.visible = true;
                    }
                }
            } else if (!elt.promise) {
                const distance = Math.max(0.001, distanceToCamera);
                // Increase priority of nearest node
                const priority = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distance) / distance;
                elt.promise = context.scheduler.execute({
                    layer,
                    requester: elt,
                    view: context.view,
                    priority,
                    redraw: true,
                    earlyDropFunction: cmd => !cmd.requester.visible || !this.visible,
                }).then((pts) => {
                    elt.obj = pts;

                    // make sure to add it here, otherwise it might never
                    // be added nor cleaned
                    this.group.add(elt.obj);
                    elt.obj.updateMatrixWorld(true);
                }).catch((err) => {
                    if (!err.isCancelledCommandException) {
                        return err;
                    }
                }).finally(() => {
                    elt.promise = null;
                });
            }
        }

        if (elt.children && elt.children.length) {
            elt.sse = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distanceToCamera) / this.sseThreshold;
            if (elt.sse >= 1) {
                return elt.children;
            } else {
                for (const child of elt.children) {
                    markForDeletion(child);
                }
            }
        }
    }

    postUpdate() {
        this.displayedCount = 0;
        for (const pts of this.group.children) {
            if (pts.visible) {
                const count = pts.geometry.attributes.position.count;
                pts.geometry.setDrawRange(0, count);
                this.displayedCount += count;
            }
        }

        if (this.displayedCount > this.pointBudget) {
            // 2 different point count limit implementation, depending on the potree source
            if (this.supportsProgressiveDisplay) {
                // In this format, points are evenly distributed within a node,
                // so we can draw a percentage of each node and still get a correct
                // representation
                const reduction = this.pointBudget / this.displayedCount;
                for (const pts of this.group.children) {
                    if (pts.visible) {
                        const count = Math.floor(pts.geometry.drawRange.count * reduction);
                        if (count > 0) {
                            pts.geometry.setDrawRange(0, count);
                        } else {
                            pts.visible = false;
                        }
                    }
                }
                this.displayedCount *= reduction;
            } else {
                // This format doesn't require points to be evenly distributed, so
                // we're going to sort the nodes by "importance" (= on screen size)
                // and display only the first N nodes
                this.group.children.sort((p1, p2) => p2.userData.node.sse - p1.userData.node.sse);

                let limitHit = false;
                this.displayedCount = 0;
                for (const pts of this.group.children) {
                    const count = pts.geometry.attributes.position.count;
                    if (limitHit || (this.displayedCount + count) > this.pointBudget) {
                        pts.visible = false;
                        limitHit = true;
                    } else {
                        this.displayedCount += count;
                    }
                }
            }
        }

        const now = Date.now();
        for (let i = this.group.children.length - 1; i >= 0; i--) {
            const obj = this.group.children[i];
            if (!obj.visible && (now - obj.userData.node.notVisibleSince) > 10000) {
                // remove from group
                this.group.children.splice(i, 1);

                // no need to dispose obj.material, as it is shared by all objects of this layer
                obj.geometry.dispose();
                obj.material = null;
                obj.geometry = null;
                obj.userData.node.obj = null;

                if (__DEBUG__) {
                    if (obj.boxHelper) {
                        obj.boxHelper.removeMe = true;
                        if (Array.isArray(obj.boxHelper.material)) {
                            for (const material of obj.boxHelper.material) {
                                material.dispose();
                            }
                        } else {
                            obj.boxHelper.material.dispose();
                        }
                        obj.boxHelper.geometry.dispose();
                    }
                    if (obj.tightboxHelper) {
                        obj.tightboxHelper.removeMe = true;
                        if (Array.isArray(obj.tightboxHelper.material)) {
                            for (const material of obj.tightboxHelper.material) {
                                material.dispose();
                            }
                        } else {
                            obj.tightboxHelper.material.dispose();
                        }
                        obj.tightboxHelper.geometry.dispose();
                    }
                }
            }
        }

        if (__DEBUG__) {
            this.bboxes.children = this.bboxes.children.filter(b => !b.removeMe);
        }
    }

    pickObjectsAt(view, mouse, radius, target = []) {
        return Picking.pickPointsAt(view, mouse, radius, this, target);
    }

    getObjectToUpdateForAttachedLayers(meta) {
        if (meta.obj) {
            const p = meta.parent;
            if (p && p.obj) {
                return {
                    element: meta.obj,
                    parent: p.obj,
                };
            } else {
                return {
                    element: meta.obj,
                };
            }
        }
    }
}

export default PointCloudLayer;
