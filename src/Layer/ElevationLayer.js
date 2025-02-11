import RasterLayer from 'Layer/RasterLayer';
import { updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
import { RasterElevationTile } from 'Renderer/RasterTile';

/**
 * @property {boolean} isElevationLayer - Used to checkout whether this layer is
 * an ElevationLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {number} noDataValue - Used to specify a **null** or **no data value** in the elevation terrain.
 * @property {number} [zmin] - Used to specify a minimum value for the elevation terrain (if the data goes lower, it will be clamped).
 * @property {number} [zmax] - Used to specify a maximum value for the elevation terrain (if the data goes higher, it will be clamped)
 * @property {number} scale - Used to apply a scale on the elevation value. It
 * can be used for exageration of the elevation, like in [this
 * example](https://www.itowns-project.org/itowns/examples/#plugins_pyramidal_tiff).
 * @property {boolean} useColorTextureElevation - the elevation is computed with one color texture channel,
 * `this.colorTextureElevationMaxZ` and `this.colorTextureElevationMinZ`.
 *
 * The formula is:
 *
 * ```js
 * elevation = color.r * (this.colorTextureElevationMaxZ - this.colorTextureElevationMinZ) + this.colorTextureElevationMinZ
 * ```
 * @property {number} colorTextureElevationMinZ - elevation minimum in `useColorTextureElevation` mode.
 * @property {number} colorTextureElevationMaxZ - elevation maximum in `useColorTextureElevation` mode.
 *
 * @extends RasterLayer
 */
class ElevationLayer extends RasterLayer {
    /**
     * A simple layer, managing an elevation texture to add some reliefs on the
     * plane or globe view for example.
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {number} [config.noDataValue]   The value coding the noData in the data set
     * @param {Object} [config.clampValues] - Optional information for clamping
     * the elevation between a minimum and a maximum value
     * @param {number} [config.clampValues.min]   The minimum value to clamp the elevation
     * @param {number} [config.clampValues.max]   The maximum value to clamp the elevation
     *
     * @example
     * // Create an ElevationLayer
     * const elevation = new ElevationLayer('IGN_MNT', {
     *      source: new WMTSSource({
     *          "url": "https://data.geopf.fr/wmts?",
     *           "crs": "EPSG:4326",
     *           "format": "image/x-bil;bits=32",
     *           "name": "ELEVATION.ELEVATIONGRIDCOVERAGE",
     *      }),
     * });
     *
     * // Add the layer
     * view.addLayer(elevation);
     */
    constructor(id, config = {}) {
        const {
            scale = 1.0,
            noDataValue,
            clampValues,
            useRgbaTextureElevation,
            useColorTextureElevation,
            colorTextureElevationMinZ,
            colorTextureElevationMaxZ,
            bias,
            mode,
            ...rasterConfig
        } = config;

        super(id, rasterConfig);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isElevationLayer = true;

        this.noDataValue = noDataValue;

        if (config.zmin || config.zmax) {
            console.warn('Config using zmin and zmax are deprecated, use {clampValues: {min, max}} structure.');
        }

        /**
         * @type {number | undefined}
         */
        this.zmin = clampValues?.min ?? config.zmin;

        /**
         * @type {number | undefined}
         */
        this.zmax = clampValues?.max ?? config.zmax;

        this.defineLayerProperty('scale', scale);

        this.useRgbaTextureElevation = useRgbaTextureElevation;
        this.useColorTextureElevation = useColorTextureElevation;
        this.colorTextureElevationMinZ = colorTextureElevationMinZ;
        this.colorTextureElevationMaxZ = colorTextureElevationMaxZ;

        this.bias = bias;
        this.mode = mode;
    }

    /**
     * Setup RasterElevationTile added to TileMesh. This RasterElevationTile handles
     * the elevation texture to displace TileMesh vertices.
     *
     * @param      {TileMesh}  node    The node to apply new RasterElevationTile;
     * @return     {RasterElevationTile}  The raster elevation node added.
     */
    setupRasterNode(node) {
        const rasterElevationNode = new RasterElevationTile(node.material, this);

        node.material.setElevationTile(rasterElevationNode);
        node.material.setElevationTileId(this.id);
        // bounding box initialisation
        const updateBBox = () => node.setBBoxZ({
            min: rasterElevationNode.min, max: rasterElevationNode.max, scale: this.scale,
        });
        updateBBox();

        // listen elevation updating
        rasterElevationNode.addEventListener('rasterElevationLevelChanged', updateBBox);

        // listen scaling elevation updating
        this.addEventListener('scale-property-changed', updateBBox);
        // remove scaling elevation updating if node is removed
        node.addEventListener('dispose', () => {
            this.removeEventListener('scale-property-changed', updateBBox);
        });

        return rasterElevationNode;
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeElevation(context, this, node, parent);
    }
}

export default ElevationLayer;
