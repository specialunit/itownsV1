import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import GeometryLayer from 'Layer/GeometryLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import Label from 'Core/Label';
import { readExpression, StyleContext } from 'Core/Style';
import { ScreenGrid } from 'Renderer/Label2DRenderer';

const context = new StyleContext();

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);

const nodeDimensions = new THREE.Vector2();
const westNorthNode = new THREE.Vector2();
const labelPosition = new THREE.Vector2();

/**
 * DomNode is a node in the tree data structure of labels divs.
 *
 * @class DomNode
 */
class DomNode {
    #domVisibility = false;

    constructor() {
        this.dom = document.createElement('div');

        this.dom.style.display = 'none';

        this.visible = true;
    }

    get visible() { return this.#domVisibility; }

    set visible(v) {
        if (v !== this.#domVisibility) {
            this.#domVisibility = v;
            this.dom.style.display = v ? 'block' : 'none';
        }
    }

    hide() { this.visible = false; }

    show() { this.visible = true; }

    add(node) {
        this.dom.append(node.dom);
    }
}

/**
 * LabelsNode is node of tree data structure for LabelLayer.
 * the node is made of dom elements and 3D labels.
 *
 * @class      LabelsNode
 */
class LabelsNode extends THREE.Group {
    constructor(node) {
        super();
        // attached node parent
        this.nodeParent = node;
        // When this is set, it calculates the position in that frame and resets this property to false.
        this.needsUpdate = true;
    }

    // instanciate dom elements
    initializeDom() {
        // create root dom
        this.domElements = new DomNode();
        // create labels container dom
        this.domElements.labels = new DomNode();

        this.domElements.add(this.domElements.labels);

        this.domElements.labels.dom.style.opacity = '0';
    }

    // add node label
    // add label 3d and dom label
    addLabel(label) {
        // add 3d object
        this.add(label);

        // add dom label
        this.domElements.labels.dom.append(label.content);

        // Batch update the dimensions of labels all at once to avoid
        // redraw for at least this tile.
        label.initDimensions();

        // add horizon culling point if it's necessary
        // the horizon culling is applied to nodes that trace the horizon which
        // corresponds to the low zoom node, that's why the culling is done for a zoom lower than 4.
        if (this.nodeParent.layer.isGlobeLayer && this.nodeParent.level < 4) {
            label.horizonCullingPoint = new THREE.Vector3();
        }
    }

    // remove node label
    // remove label 3d and dom label
    removeLabel(label) {
        // remove 3d object
        this.remove(label);

        // remove dom label
        this.domElements.labels.dom.removeChild(label.content);
    }

    // update position if it's necessary
    updatePosition(label) {
        if (this.needsUpdate) {
            // update elevation from elevation layer.
            if (this.needsAltitude) {
                label.updateElevationFromLayer(this.nodeParent.layer, [this.nodeParent]);
            }

            // update elevation label
            label.update3dPosition(this.nodeParent.layer.crs);

            // update horizon culling
            label.updateHorizonCullingPoint();
        }
    }

    // return labels count
    count() {
        return this.children.length;
    }

    get labels() {
        return this.children;
    }
}

/**
 * A layer to handle a bunch of `Label`. This layer can be created on its own,
 * but it is better to use the option `addLabelLayer` on another `Layer` to let
 * it work with it (see the `vector_tile_raster_2d` example). Supported for Points features, not yet
 * for Lines and Polygons features.
 *
 * @property {boolean} isLabelLayer - Used to checkout whether this layer is a
 * LabelLayer.  Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class LabelLayer extends GeometryLayer {
    #filterGrid = new ScreenGrid();
    /**
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {boolean} [config.performance=true] - remove labels that have no chance of being visible.
     * if the `config.performance` is set to true then the performance is improved
     * proportional to the amount of unnecessary labels that are removed.
     * Indeed, even in the best case, labels will never be displayed. By example, if there's many labels.
     * We advise you to not use this option if your data is optimized.
     * @param {domElement|function} config.domElement - An HTML domElement.
     * If set, all `Label` displayed within the current instance `LabelLayer`
     * will be this domElement.
     *
     * It can be set to a method. The single parameter of this method gives the
     * properties of each feature on which a `Label` is created.
     *
     * If set, all the parameters set in the `LabelLayer` `Style.text` will be overridden,
     * except for the `Style.text.anchor` parameter which can help place the label.
     */
    constructor(id, config = {}) {
        const {
            domElement,
            performance = true,
            forceClampToTerrain = false,
            margin,
            ...geometryConfig
        } = config;
        super(id, config.object3d || new THREE.Group(), geometryConfig);

        this.isLabelLayer = true;
        this.domElement = new DomNode();
        this.domElement.show();
        this.domElement.dom.id = `itowns-label-${this.id}`;
        this.buildExtent = true;
        this.crs = config.source.crs;
        this.performance = performance;
        this.forceClampToTerrain = forceClampToTerrain;
        this.margin = margin;

        this.toHide = new THREE.Group();

        this.labelDomelement = domElement;

        // The margin property defines a space around each label that cannot be occupied by another label.
        // For example, if some labelLayer has a margin value of 5, there will be at least 10 pixels
        // between each labels of the layer
        // TODO : this property should be moved to Style after refactoring style properties structure
        this.margin = config.margin;
    }

    get visible() {
        return super.visible;
    }

    set visible(value) {
        super.visible = value;
        if (value) {
            this.domElement?.show();
        } else {
            this.domElement?.hide();
        }
    }

    get submittedLabelNodes() {
        return this.object3d.children;
    }

    /**
     * Reads each {@link FeatureGeometry} that contains label configuration, and
     * creates the corresponding {@link Label}. To create a `Label`, a geometry
     * needs to have a `label` object with at least a few properties:
     * - `content`, which refers to `Label#content`
     * - `position`, which refers to `Label#position`
     * - (optional) `config`, containing miscellaneous configuration for the
     *   label
     *
     * The geometry (or its parent Feature) needs to have a Style set.
     *
     * @param {FeatureCollection} data - The FeatureCollection to read the
     * labels from.
     * @param {Extent|Tile} extentOrTile
     *
     * @return {Label[]} An array containing all the created labels.
     */
    convert(data, extentOrTile) {
        const labels = [];

        // Converting the extent now is faster for further operation
        if (extentOrTile.isExtent) {
            extentOrTile.as(data.crs, _extent);
        } else {
            extentOrTile.toExtent(data.crs, _extent);
        }
        coord.crs = data.crs;

        context.setZoom(extentOrTile.zoom);

        data.features.forEach((f) => {
            if (f.style.text) {
                if (Object.keys(f.style.text).length === 0) {
                    return;
                }
            }

            context.setFeature(f);

            const featureField = f.style?.text?.field;

            // determine if altitude style is specified by the user
            const altitudeStyle = f.style?.point?.base_altitude;
            const isDefaultElevationStyle = altitudeStyle instanceof Function && altitudeStyle.name == 'baseAltitudeDefault';

            // determine if the altitude needs update with ElevationLayer
            labels.needsAltitude = labels.needsAltitude || this.forceClampToTerrain === true || (isDefaultElevationStyle && !f.hasRawElevationData);

            f.geometries.forEach((g) => {
                context.setGeometry(g);
                this.style.setContext(context);
                const layerField = this.style.text && this.style.text.field;
                const geometryField = g.properties.style && g.properties.style.text && g.properties.style.text.field;
                let content;
                if (this.labelDomelement) {
                    content = readExpression(this.labelDomelement, context);
                } else if (!geometryField && !featureField && !layerField) {
                    // Check if there is an icon, with no text
                    if (!(g.properties.style && (g.properties.style.icon.source || g.properties.style.icon.key))
                        && !(f.style && f.style.icon && (f.style.icon.source || f.style.icon.key))
                        && !(this.style.icon && (this.style.icon.source || this.style.icon.key))) {
                        return;
                    }
                }

                if (this.style.zoom.min > this.style.context.zoom || this.style.zoom.max <= this.style.context.zoom) {
                    return;
                }

                // NOTE: this only works fine for POINT.
                // It needs more work for LINE and POLYGON as we currently only use the first point of the entity

                g.indices.forEach((i) => {
                    coord.setFromArray(f.vertices, g.size * i.offset);
                    // Transform coordinate to data.crs projection
                    coord.applyMatrix4(data.matrixWorld);

                    if (!_extent.isPointInside(coord)) { return; }

                    const label = new Label(content, coord.clone(), this.style);

                    label.layerId = this.id;
                    label.order = f.order;
                    label.padding = this.margin || label.padding;

                    labels.push(label);
                });
            });
        });

        return labels;
    }

    // placeholder
    preUpdate(context, sources) {
        if (sources.has(this.parent)) {
            this.object3d.clear();
            this.#filterGrid.width = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.height = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.resize();
        }
    }

    #submitToRendering(labelsNode) {
        this.object3d.add(labelsNode);
    }

    #disallowToRendering(labelsNode) {
        this.toHide.add(labelsNode);
    }

    #findClosestDomElement(node) {
        if (node.parent?.isTileMesh) {
            return node.parent.link[this.id]?.domElements || this.#findClosestDomElement(node.parent);
        } else {
            return this.domElement;
        }
    }

    #hasLabelChildren(object) {
        return object.children.every(c => c.layerUpdateState && c.layerUpdateState[this.id]?.hasFinished());
    }

    // Remove all labels invisible with pre-culling with screen grid
    // We use the screen grid with maximum size of node on screen
    #removeCulledLabels(node) {
        // copy labels array
        const labels = node.children.slice();

        // reset filter
        this.#filterGrid.reset();

        // sort labels by order
        labels.sort((a, b) => b.order - a.order);

        labels.forEach((label) => {
            // get node dimensions
            node.nodeParent.extent.planarDimensions(nodeDimensions);
            coord.crs = node.nodeParent.extent.crs;

            // get west/north node coordinates
            coord.setFromValues(node.nodeParent.extent.west, node.nodeParent.extent.north, 0).toVector3(westNorthNode);

            // get label position
            coord.copy(label.coordinates).as(node.nodeParent.extent.crs, coord).toVector3(labelPosition);

            // transform label position to local node system
            labelPosition.sub(westNorthNode);
            labelPosition.y += nodeDimensions.y;
            labelPosition.divide(nodeDimensions).multiplyScalar(this.#filterGrid.width);

            // update the projected position to transform to local filter grid sytem
            label.updateProjectedPosition(labelPosition.x, labelPosition.y);

            // use screen grid to remove all culled labels
            if (!this.#filterGrid.insert(label)) {
                node.removeLabel(label);
            }
        });
    }

    update(context, layer, node, parent) {
        if (!parent && node.link[layer.id]) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, node);
            return;
        }

        const labelsNode = node.link[layer.id] || new LabelsNode(node);
        node.link[layer.id] = labelsNode;

        if (this.frozen || !node.visible || !this.visible) {
            return;
        }

        if (!node.material.visible && this.#hasLabelChildren(node)) {
            return this.#disallowToRendering(labelsNode);
        }

        const extentsDestination = node.getExtentsByProjection(this.source.crs) || [node.extent];
        const zoomDest = extentsDestination[0].zoom;

        if (zoomDest < layer.zoom.min || zoomDest > layer.zoom.max) {
            return this.#disallowToRendering(labelsNode);
        }

        if (node.layerUpdateState[this.id] === undefined) {
            node.layerUpdateState[this.id] = new LayerUpdateState();
        }

        if (!this.source.extentInsideLimit(node.extent, zoomDest)) {
            node.layerUpdateState[this.id].noMoreUpdatePossible();
            return;
        } else if (this.#hasLabelChildren(node.parent)) {
            if (!node.material.visible) {
                labelsNode.needsUpdate = true;
            }
            this.#submitToRendering(labelsNode);
            return;
        } else if (!node.layerUpdateState[this.id].canTryUpdate()) {
            return;
        }

        node.layerUpdateState[this.id].newTry();

        const command = {
            layer: this,
            extentsSource: extentsDestination,
            view: context.view,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            if (!result) { return; }

            const renderer = context.view.mainLoop.gfxEngine.label2dRenderer;

            labelsNode.initializeDom();

            this.#findClosestDomElement(node).add(labelsNode.domElements);

            result.forEach((labels) => {
                // Clean if there isnt' parent
                if (!node.parent) {
                    labels.forEach((l) => {
                        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, l);
                        renderer.removeLabelDOM(l);
                    });
                    return;
                }

                labelsNode.needsAltitude = labelsNode.needsAltitude || labels.needsAltitude;

                // Add all labels for this tile at once to batch it
                labels.forEach((label) => {
                    if (node.extent.isPointInside(label.coordinates)) {
                        labelsNode.addLabel(label);
                    }
                });
            });

            if (labelsNode.count()) {
                labelsNode.domElements.labels.hide();
                labelsNode.domElements.labels.dom.style.opacity = '1.0';

                node.addEventListener('show', () => labelsNode.domElements.labels.show());

                node.addEventListener('hidden', () => this.#disallowToRendering(labelsNode));

                // Necessary event listener, to remove any Label attached to
                node.addEventListener('removed', () => this.removeNodeDomElement(node));

                if (labelsNode.needsAltitude && node.material.getElevationTile()) {
                    node.material.getElevationTile().addEventListener('rasterElevationLevelChanged', () => { labelsNode.needsUpdate = true; });
                }

                if (this.performance) {
                    this.#removeCulledLabels(labelsNode);
                }
            }

            node.layerUpdateState[this.id].noMoreUpdatePossible();
        });
    }

    removeLabelsFromNodeRecursive(node) {
        node.children.forEach((c) => {
            if (c.link[this.id]) {
                delete c.link[this.id];
            }
            this.removeLabelsFromNodeRecursive(c);
        });

        this.removeNodeDomElement(node);
    }

    removeNodeDomElement(node) {
        if (node.link[this.id]?.domElements) {
            const child = node.link[this.id].domElements.dom;
            child.parentElement.removeChild(child);
            delete node.link[this.id].domElements;
        }
    }

    /**
     * All layer's objects and domElements are removed.
     * @param {boolean} [clearCache=false] Whether to clear the layer cache or not
     */
    delete(clearCache) {
        if (clearCache) {
            this.cache.clear();
        }
        this.domElement.dom.parentElement.removeChild(this.domElement.dom);

        this.parent.level0Nodes.forEach(obj => this.removeLabelsFromNodeRecursive(obj));
    }
}

export default LabelLayer;
