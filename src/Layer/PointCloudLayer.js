import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import PointsMaterial, { PNTS_MODE } from 'Renderer/PointsMaterial';
import Picking from 'Core/Picking';
import OBBHelper from 'Utils/OBBHelper';

const _vector = /* @__PURE__ */ new THREE.Vector3();

const _point = new THREE.Vector3();

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}

function initBoundingBox(elt, layer) {
    const newbbox = elt.bbox.clone();
    newbbox.max.z = newbbox.max.z > layer.clamp.zmax ? layer.clamp.zmax :  newbbox.max.z;
    newbbox.min.z = newbbox.min.z < layer.clamp.zmin ? layer.clamp.zmin : newbbox.min.z;
    elt.obj.box3Helper = new THREE.Box3Helper(newbbox, 0x00ffff);// light blue
    layer.bboxes.add(elt.obj.box3Helper);
    elt.obj.box3Helper.updateMatrixWorld(true);

    const newtightbox = elt.tightbbox.clone();
    elt.obj.tightbox3Helper = new THREE.Box3Helper(newtightbox, 0xffff00);// jaune
    layer.bboxes.add(elt.obj.tightbox3Helper);
    elt.obj.tightbox3Helper.updateMatrixWorld();
}

function initOrientedBox(elt, layer) {
    const newobb = elt.obb.clone();
    const zmin = clamp(newobb.center.z - newobb.halfSize.z, layer.minElevationRange, layer.maxElevationRange);
    const zmax = clamp(newobb.center.z + newobb.halfSize.z, layer.minElevationRange, layer.maxElevationRange);
    newobb.center.z = (zmin + zmax) / 2;
    newobb.halfSize.z = Math.abs(zmax - zmin) / 2;
    elt.obj.obbHelper = new OBBHelper(newobb, 0xff00ff);// violet
    elt.obj.obbHelper.position.copy(elt.obb.position);
    layer.obbes.add(elt.obj.obbHelper);
    elt.obj.obbHelper.updateMatrixWorld();

    const newtightobb = elt.tightobb.clone();
    elt.obj.tightobbHelper = new OBBHelper(newtightobb, 0x00ff00);// vert
    elt.obj.tightobbHelper.position.copy(elt.tightobb.position);
    layer.obbes.add(elt.obj.tightobbHelper);
    elt.obj.tightobbHelper.updateMatrixWorld();
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
            if (elt.obj.box3Helper) {
                elt.obj.box3Helper.visible = false;
                elt.obj.tightbox3Helper.visible = false;
            }
            if (elt.obj.obbHelper) {
                elt.obj.obbHelper.visible = false;
                elt.obj.tightobbHelper.visible = false;
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
 */
class PointCloudLayer extends GeometryLayer {
    /**
     * Constructs a new instance of point cloud layer.
     * Constructs a new instance of a Point Cloud Layer. This should not be used
     * directly, but rather implemented using `extends`.
     *
     * @constructor
     * @extends GeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     */
    constructor(id, config = {}) {
        super(id, config.object3d || new THREE.Group(), config);
        this.isPointCloudLayer = true;
        this.protocol = 'pointcloud';

        this.group = config.group || new THREE.Group();
        this.object3d.add(this.group);
        this.bboxes = config.bboxes || new THREE.Group();
        this.bboxes.name = 'bboxes';
        this.bboxes.visible = false;
        this.obbes = config.obbes || new THREE.Group();
        this.obbes.name = 'obbes';
        this.obbes.visible = false;
        this.object3d.add(this.obbes);
        this.object3d.add(this.bboxes);
        this.group.updateMatrixWorld();

        // default config
        this.octreeDepthLimit = config.octreeDepthLimit || -1;
        this.pointBudget = config.pointBudget || 2000000;
        this.pointSize = config.pointSize === 0 || !isNaN(config.pointSize) ? config.pointSize : 4;
        this.sseThreshold = config.sseThreshold || 2;

        this.defineLayerProperty('minIntensityRange', config.minIntensityRange || 1, changeIntensityRange);
        this.defineLayerProperty('maxIntensityRange', config.maxIntensityRange || 65536, changeIntensityRange);
        this.defineLayerProperty('minElevationRange', config.minElevationRange || 0, changeElevationRange);
        this.defineLayerProperty('maxElevationRange', config.maxElevationRange || 1000, changeElevationRange);
        this.defineLayerProperty('minAngleRange', config.minAngleRange || -90, changeAngleRange);
        this.defineLayerProperty('maxAngleRange', config.maxAngleRange || 90, changeAngleRange);

        this.material = config.material || {};
        if (!this.material.isMaterial) {
            config.material = config.material || {};
            config.material.intensityRange = new THREE.Vector2(this.minIntensityRange, this.maxIntensityRange);
            config.material.elevationRange = new THREE.Vector2(this.minElevationRange, this.maxElevationRange);
            config.material.angleRange = new THREE.Vector2(this.minAngleRange, this.maxAngleRange);
            this.material = new PointsMaterial(config.material);
        }
        this.material.defines = this.material.defines || {};

        this.mode = config.mode || PNTS_MODE.COLOR;
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
                return this.root;
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
                        return this.root;
                    }
                }
            }
        }

        if (commonAncestor) {
            return [commonAncestor];
        }

        // Start updating from hierarchy root
        return this.root;
    }

    update(context, layer, elt) {
        elt.visible = false;

        if (this.octreeDepthLimit >= 0 && this.octreeDepthLimit < elt.depth) {
            markForDeletion(elt);
            return;
        }

        // pick the best oriented box
        let obb;
        if (elt.tightobb) {
            obb = elt.tightobb;
        } else {
            obb = elt.obb.clone();
            obb.position = elt.obb.position || new THREE.Vector3();
            // clamp the initial OBB
            const zmin = clamp(obb.center.z - obb.halfSize.z, layer.minElevationRange, layer.maxElevationRange);
            const zmax = clamp(obb.center.z + obb.halfSize.z, layer.minElevationRange, layer.maxElevationRange);
            obb.center.z = (zmin + zmax) / 2;
            obb.halfSize.z = Math.abs(zmax - zmin) / 2;
        }

        elt.visible = context.camera.isObbVisible(obb, this.object3d.matrixWorld);

        if (!elt.visible) {
            markForDeletion(elt);
            return;
        }

        elt.notVisibleSince = undefined;
        _point.copy(context.camera.camera3D.position).sub(this.object3d.position);

        // only load geometry if this elements has points
        if (elt.numPoints !== 0) {
            if (elt.obj) {
                elt.obj.visible = true;

                if (__DEBUG__) {
                    if (this.bboxes.visible) {
                        if (!elt.obj.box3Helper) {
                            initBoundingBox(elt, layer);
                        }

                        elt.obj.box3Helper.visible = true;
                        elt.obj.box3Helper.material.color.r = 1 - elt.sse;
                        elt.obj.box3Helper.material.color.g = elt.sse;

                        elt.obj.tightbox3Helper.visible = true;
                        elt.obj.tightbox3Helper.material.color.r = 1 - elt.sse;
                        elt.obj.tightbox3Helper.material.color.g = elt.sse;
                    }
                    if (this.obbes.visible) {
                        if (!elt.obj.obbHelper) {
                            initOrientedBox(elt, layer);
                        }

                        elt.obj.obbHelper.visible = true;
                        elt.obj.obbHelper.material.color.r = 1 - elt.sse;
                        elt.obj.obbHelper.material.color.g = elt.sse;

                        elt.obj.tightobbHelper.visible = true;
                        elt.obj.tightobbHelper.material.color.r = 1 - elt.sse;
                        elt.obj.tightobbHelper.material.color.g = elt.sse;
                    }
                }
            } else if (!elt.promise) {
                const obbWorld = obb.clone();
                obbWorld.center = obb.center.clone().applyMatrix3(obb.rotation).add(obb.position);
                const obbDistance = Math.max(0.001, obbWorld.clampPoint(_point, _vector).distanceTo(_point));

                const distance = obbDistance;
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
                    if (this.onPointsCreated) {
                        this.onPointsCreated(layer, pts);
                    }

                    elt.obj = pts;
                    // store tightbbox and tightobb to avoid ping-pong (bbox = larger => visible, tight => invisible)
                    elt.tightbbox = pts.tightbbox;
                    elt.tightobb = pts.tightobb;

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
            const obbWorld = obb.clone();
            obbWorld.center = obb.center.clone().applyMatrix3(obb.rotation).add(obb.position);
            const obbDistance = Math.max(0.001, obbWorld.clampPoint(_point, _vector).distanceTo(_point));

            const distance = obbDistance;
            // const sse = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distance) / this.sseThreshold;
            const sse = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distance);
            elt.sse = sse;
            // if (elt.sse >= 1) {
            if (elt.sse >= this.sseThreshold) {
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
                    if (obj.box3Helper) {
                        obj.box3Helper.removeMe = true;
                        obj.tightbox3Helper.removeMe = true;
                        if (Array.isArray(obj.box3Helper.material)) {
                            for (const material of obj.box3Helper.material) {
                                material.dispose();
                            }
                        } else {
                            obj.box3Helper.material.dispose();
                        }
                        obj.box3Helper.geometry.dispose();
                        obj.tightbox3Helper.geometry.dispose();
                    }
                    if (obj.obbHelper) {
                        obj.obbHelper.removeMe = true;
                        obj.tightobbHelper.removeMe = true;
                        if (Array.isArray(obj.obbHelper.material)) {
                            for (const material of obj.obbHelper.material) {
                                material.dispose();
                            }
                        } else {
                            obj.obbHelper.material.dispose();
                        }
                        obj.obbHelper.geometry.dispose();
                        obj.tightobbHelper.geometry.dispose();
                    }
                }
            }
        }

        if (__DEBUG__) {
            this.bboxes.children = this.bboxes.children.filter(b => !b.removeMe);
            this.obbes.children = this.obbes.children.filter(b => !b.removeMe);
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
