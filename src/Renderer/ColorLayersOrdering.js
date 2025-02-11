import { ImageryLayers } from 'Layer/Layer';

function updateLayersOrdering(geometryLayer, imageryLayers) {
    const sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
    const cO = function cO(object) {
        if (object.material?.setColorTileIds) {
            object.material.setColorTileIds(sequence);
        }
    };

    for (const node of geometryLayer.level0Nodes) {
        node.traverse(cO);
    }
}

export const COLOR_LAYERS_ORDER_CHANGED = 'layers-order-changed';

/**
 * Utilitary to organize {@link ColorLayer} in a {@link View}.
 *
 * @module ColorLayersOrdering
 */
export default {
    /**
     * Moves up in the layer list. This function has no effect if the layer is
     * moved to its current index.
     *
     * @param {View} view - The view in which the layer is moved up.
     * @param {string} layerId - The ID of the layer to move.
     *
     * @example
     * itowns.ColorLayersOrdering.moveLayerUp(viewer, 'idLayerToUp');
     */
    moveLayerUp(view, layerId) {
        const imageryLayers = view.getLayers(l => l.isColorLayer);
        const layer = view.getLayerById(layerId);
        if (layer) {
            const previousSequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
            ImageryLayers.moveLayerUp(layer, imageryLayers);
            updateLayersOrdering(view.tileLayer, imageryLayers);
            view.dispatchEvent({
                type: COLOR_LAYERS_ORDER_CHANGED,
                previous: { sequence: previousSequence },
                new: { sequence: ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers) },
            });
            view.notifyChange(view.tileLayer);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
    /**
     * Moves down in the layer list. This function has no effect if the layer is
     * moved to its current index.
     *
     * @param {View} view - The view in which the layer is moved down.
     * @param {string} layerId - The ID of the layer to move.
     *
     * @example
     * itowns.ColorLayersOrdering.moveLayerDown(viewer, 'idLayerToDown');
     */
    moveLayerDown(view, layerId) {
        const imageryLayers = view.getLayers(l => l.isColorLayer);
        const layer = view.getLayerById(layerId);
        if (layer) {
            const previousSequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
            ImageryLayers.moveLayerDown(layer, imageryLayers);
            updateLayersOrdering(view.tileLayer, imageryLayers);
            view.dispatchEvent({
                type: COLOR_LAYERS_ORDER_CHANGED,
                previous: { sequence: previousSequence },
                new: { sequence: ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers) },
            });
            view.notifyChange(view.tileLayer);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
    /**
     * Moves a specific layer to a specific index in the layer list. This
     * function has no effect if the layer is moved to its current index.
     *
     * @param {View} view - The view in which the layer is moved.
     * @param {string} layerId - The ID of the layer to move.
     * @param {number} index - The index to move the layer to.
     *
     * @example
     * itowns.ColorLayersOrdering.moveLayerToIndex(viewer, 'idLayerToChangeIndex', 2);
     */
    moveLayerToIndex(view, layerId, index) {
        const imageryLayers = view.getLayers(l => l.isColorLayer);
        const layer = view.getLayerById(layerId);
        if (layer) {
            const previousSequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
            ImageryLayers.moveLayerToIndex(layer, index, imageryLayers);
            updateLayersOrdering(view.tileLayer, imageryLayers);
            view.dispatchEvent({
                type: COLOR_LAYERS_ORDER_CHANGED,
                previous: { sequence: previousSequence },
                new: { sequence: ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers) },
            });
            view.notifyChange(view.tileLayer);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
};
