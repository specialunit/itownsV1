import * as THREE from 'three';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import InfoLayer from 'Layer/InfoLayer';
import Source from 'Source/Source';
import { LRUCache } from 'lru-cache';
import Style from 'Core/Style';

function updateElements(context, geometryLayer, elements) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        // update element
        // TODO find a way to notify attachedLayers when geometryLayer deletes some elements
        // and then update Debug.js:addGeometryLayerDebugFeatures
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        const sub = geometryLayer.getObjectToUpdateForAttachedLayers(element);

        if (sub) {
            if (sub.element) {
                if (__DEBUG__) {
                    if (!(sub.element.isObject3D)) {
                        throw new Error(`
                            Invalid object for attached layer to update.
                            Must be a THREE.Object and have a THREE.Material`);
                    }
                }
                // update attached layers
                for (const attachedLayer of geometryLayer.attachedLayers) {
                    if (attachedLayer.ready) {
                        attachedLayer.update(context, attachedLayer, sub.element, sub.parent);
                    }
                }
            } else if (sub.elements) {
                for (let i = 0; i < sub.elements.length; i++) {
                    if (!(sub.elements[i].isObject3D)) {
                        throw new Error(`
                            Invalid object for attached layer to update.
                            Must be a THREE.Object and have a THREE.Material`);
                    }
                    // update attached layers
                    for (const attachedLayer of geometryLayer.attachedLayers) {
                        if (attachedLayer.ready) {
                            attachedLayer.update(context, attachedLayer, sub.elements[i], sub.parent);
                        }
                    }
                }
            }
        }
        updateElements(context, geometryLayer, newElementsToUpdate);
    }
}

/**
 * @property {boolean} isLayer - Used to checkout whether this layer is a Layer.
 * Default is true. You should not change this, as it is used internally for
 * optimisation.
 * @property {boolean} ready - This property is false when the layer isn't added.
 * It's true when the layer is added and all initializations are done.
 * @property {Source} source - This source determines the datas to be displayed with the layer.
 * The layer determines how this data are displayed.
 * By example:
 * * For ColorLayer/ElevationLayer, the source datas are rasterised (if it's necessary).
 * * For GeometryLayer, the source datas are converted to meshes (not possible for the raster data sources).
 * @property {Promise} whenReady - this promise is resolved when the layer is added and all initializations are done.
 * This promise is resolved with this layer.
 * This promise is returned by [View#addLayer]{@link View}.
 * @property {object} [zoom] - This property is used only the layer is attached
 * to {@link TiledGeometryLayer}.
 * By example,
 * The layer checks the tile zoom level to determine if the layer is visible in this tile.
 *
 * ![tiled geometry](/docs/static/images/wfszoommaxmin.jpeg)
 * _In `GlobeView`, **red lines** represents the **WGS84 grid** and **orange lines** the Pseudo-mercator grid_
 * _In this example [WFS to 3D objects](http://www.itowns-project.org/itowns/examples/index.html#source_stream_wfs_3d), the building layer zoom min is 14._
 * _In the lower part of the picture, the zoom tiles 14 have buildings, while in the upper part of the picture, the level 13 tiles have no buildings._
 *
 * @property {number} [zoom.max=Infinity] - this is the maximum zoom beyond which it'll be hidden.
 * @property {number} [zoom.min=0] - this is the minimum zoom from which it'll be visible.
 *
 */
class Layer extends THREE.EventDispatcher {
    /**
     * Don't use directly constructor to instance a new Layer. Instead, use
     * another available type of Layer, implement a new one inheriting from this
     * one or use [View#addLayer]{@link View}.
     *
     * @protected
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} config - configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {Source|boolean} config.source - instantiated Source specifies data source to display.
     * if config.source is a boolean, it can only be false. if config.source is false,
     * the layer doesn't need Source (like debug Layer or procedural layer).
     * @param {StyleOptions} [config.style] - an object that contain any properties
     * (order, zoom, fill, stroke, point, text or/and icon)
     * and sub properties of a Style (@see {@link StyleOptions}). Or directly a {@link Style} .<br/>
     * When entering a StyleOptions the missing style properties will be look for in the data (if any)
     * what won't be done when you use a Style.
     * @param {number} [config.cacheLifeTime=Infinity] - set life time value in cache.
     * This value is used for cache expiration mechanism.
     * @param {(boolean|Object)} [config.addLabelLayer] - Used to tell if this layer has
     * labels to display from its data. For example, it needs to be set to `true`
     * for a layer with vector tiles. If it's `true` a new `LabelLayer` is added and attached to this `Layer`.
     * You can also configure it with {@link LabelLayer} options described below such as: `addLabelLayer: { performance: true }`.
     * @param {boolean} [config.addLabelLayer.performance=false] - In case label layer adding, so remove labels that have no chance of being visible.
     * Indeed, even in the best case, labels will never be displayed. By example, if there's many labels.
     * @param {boolean} [config.addLabelLayer.forceClampToTerrain=false] - use elevation layer to clamp label on terrain.
     * @param {number} [config.subdivisionThreshold=256] - set the texture size and, if applied to the globe, affects the tile subdivision.
     *
     * @example
     * // Add and create a new Layer
     * const newLayer = new Layer('id', options);
     * view.addLayer(newLayer);
     *
     * // Change layer's visibility
     * const layerToChange = view.getLayerById('idLayerToChange');
     * layerToChange.visible = false;
     * view.notifyChange(); // update viewer
     *
     * // Change layer's opacity
     * const layerToChange = view.getLayerById('idLayerToChange');
     * layerToChange.opacity = 0.5;
     * view.notifyChange(); // update viewer
     *
     * // Listen properties
     * const layerToListen = view.getLayerById('idLayerToListen');
     * layerToListen.addEventListener('visible-property-changed', (event) => console.log(event));
     * layerToListen.addEventListener('opacity-property-changed', (event) => console.log(event));
     */
    constructor(id, config = {}) {
        const {
            source,
            name,
            style = {},
            subdivisionThreshold = 256,
            addLabelLayer = false,
            cacheLifeTime,
            options = {},
            updateStrategy,
            zoom,
            mergeFeatures = true,
            crs,
        } = config;

        super();

        /**
         * @type {boolean}
         * @readonly
         */
        this.isLayer = true;

        /**
         * @type {string}
         * @readonly
         */
        this.id = id;
        Object.defineProperty(this, 'id', {
            writable: false,
        });

        /**
         * @type {string}
         */
        this.name = name;

        if (source === undefined || source === true) {
            throw new Error(`Layer ${id} needs Source`);
        }
        /**
         * @type {Source}
         */
        this.source = source || new Source({ url: 'none' });

        this.crs = crs;

        if (style && !(style instanceof Style)) {
            if (typeof style.fill?.pattern === 'string') {
                console.warn('Using style.fill.pattern = { source: Img|url } is adviced');
                style.fill.pattern = { source: style.fill.pattern };
            }
            this.style = new Style(style);
        } else {
            this.style = style || new Style();
        }

        /**
         * @type {number}
         */
        this.subdivisionThreshold = subdivisionThreshold;
        this.sizeDiagonalTexture =  (2 * (this.subdivisionThreshold * this.subdivisionThreshold)) ** 0.5;

        this.addLabelLayer = addLabelLayer;

        // Default properties
        this.options = options;

        this.updateStrategy = updateStrategy ?? {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
            options: {},
        };

        this.defineLayerProperty('frozen', false);

        this.zoom = {
            min: zoom?.min ?? 0,
            max: zoom?.max ?? Infinity,
        };

        this.info = new InfoLayer(this);

        /**
         * @type {boolean}
         */
        this.ready = false;

        /**
         * @type {Array<Promise<any>>}
         * @protected
         */
        this._promises = [];

        /**
         * @type {Promise<this>}
         */
        this.whenReady = new Promise((re, rj) => {
            this._resolve = re;
            this._reject = rj;
        }).then(() => {
            this.ready = true;
            this.source.onLayerAdded({ out: this });
            return this;
        });

        this._promises.push(this.source.whenReady);

        /**
         * @type {Cache}
         */
        this.cache = new LRUCache({
            max: 500,
            ...(cacheLifeTime !== Infinity && { ttl: cacheLifeTime }),
        });

        this.mergeFeatures = mergeFeatures;
    }

    addInitializationStep() {
        // Possibility to add rejection handler, if it's necessary.
        let resolve;
        this._promises.push(new Promise((re) => { resolve = re; }));
        return resolve;
    }

    /**
     * Defines a property for this layer, with a default value and a callback
     * executed when the property changes.
     * <br><br>
     * When changing the property, it also emits an event, named following this
     * convention: `${propertyName}-property-changed`, with `${propertyName}`
     * being replaced by the name of the property.  For example, if the added
     * property name is `frozen`, it will emit a `frozen-property-changed`.
     * <br><br>
     * @example <caption>The emitted event has some properties assigned to it</caption>
     * event = {
     *     new: {
     *         ${propertyName}: * // the new value of the property
     *     },
     *     previous: {
     *         ${propertyName}: * // the previous value of the property
     *     },
     *     target: Layer // the layer it has been dispatched from
     *     type: string // the name of the emitted event
     * }
     *
     * @param {string} propertyName - The name of the property, also used in
     * the emitted event name.
     * @param {*} defaultValue - The default set value.
     * @param {function} [onChange] - The function executed when the property is
     * changed. Parameters are the layer the property is defined on, and the
     * name of the property.
     */
    defineLayerProperty(propertyName, defaultValue, onChange) {
        const existing = Object.getOwnPropertyDescriptor(this, propertyName);
        if (!existing || !existing.set) {
            let property = this[propertyName] == undefined ? defaultValue : this[propertyName];

            Object.defineProperty(
                this,
                propertyName,
                {
                    get: () => property,
                    set: (newValue) => {
                        if (property !== newValue) {
                            const event = { type: `${propertyName}-property-changed`, previous: {}, new: {} };
                            event.previous[propertyName] = property;
                            event.new[propertyName] = newValue;
                            property = newValue;
                            if (onChange) {
                                onChange(this, propertyName);
                            }
                            this.dispatchEvent(event);
                        }
                    },
                });
        }
    }

    updateAll(context, srcs) {
        const elementsToUpdate = this.preUpdate(context, srcs);
        // `update` is called in `updateElements`.
        updateElements(context, this, elementsToUpdate);
        // `postUpdate` is called when this geom layer update process is finished
        this.postUpdate(context, this, elementsToUpdate);
    }

    // Placeholder
    // eslint-disable-next-line
    convert(data) {
        return data;
    }

    getData(from, to) {
        const key = this.source.getDataKey(this.source.isVectorSource ? to : from);
        let data = this.cache.get(key);
        if (!data) {
            data = this.source.loadData(from, this)
                .then(feat => this.convert(feat, to), (err) => {
                    throw err;
                });
            this.cache.set(key, data);
        }
        return data;
    }

    /**
     * Remove and dispose all objects from layer.
     * @param {boolean} [clearCache=false] Whether to clear the layer cache or not
     */
    // eslint-disable-next-line
    delete(clearCache) {
        console.warn('Function delete doesn\'t exist for this layer');
    }
}

export default Layer;

export const ImageryLayers = {
    // move this to new index
    // After the modification :
    //      * the minimum sequence will always be 0
    //      * the maximum sequence will always be layers.lenght - 1
    // the ordering of all layers (Except that specified) doesn't change
    moveLayerToIndex: function moveLayerToIndex(layer, newIndex, imageryLayers) {
        newIndex = Math.min(newIndex, imageryLayers.length - 1);
        newIndex = Math.max(newIndex, 0);
        const oldIndex = layer.sequence;

        for (const imagery of imageryLayers) {
            if (imagery.id === layer.id) {
                // change index of specified layer
                imagery.sequence = newIndex;
            } else if (imagery.sequence > oldIndex && imagery.sequence <= newIndex) {
                // down all layers between the old index and new index (to compensate the deletion of the old index)
                imagery.sequence--;
            } else if (imagery.sequence >= newIndex && imagery.sequence < oldIndex) {
                // up all layers between the new index and old index (to compensate the insertion of the new index)
                imagery.sequence++;
            }
        }
    },

    moveLayerDown: function moveLayerDown(layer, imageryLayers) {
        if (layer.sequence > 0) {
            this.moveLayerToIndex(layer, layer.sequence - 1, imageryLayers);
        }
    },

    moveLayerUp: function moveLayerUp(layer, imageryLayers) {
        const m = imageryLayers.length - 1;
        if (layer.sequence < m) {
            this.moveLayerToIndex(layer, layer.sequence + 1, imageryLayers);
        }
    },

    getColorLayersIdOrderedBySequence: function getColorLayersIdOrderedBySequence(imageryLayers) {
        const copy = Array.from(imageryLayers);
        copy.sort((a, b) => a.sequence - b.sequence);
        return copy.map(l => l.id);
    },
};
