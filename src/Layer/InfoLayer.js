import Extent from 'Core/Geographic/Extent';

export default class InfoLayer {
    constructor(layer) {
        this.layer = layer;
    }
    // eslint-disable-next-line
    clear() {}
    // eslint-disable-next-line
    update() {}
}


/**
 * InfoTiledGeometryLayer that provides some states layer informations. These
 * informations are displayed tiles, displayed {@link ColorLayer} and {@link
 * ElevationLayer} and extent of displayed tiles.
 *
 * @class InfoTiledGeometryLayer
 *
 * @property {object} displayed
 * @property {Layer[]} displayed.layers - Displayed {@link ColorLayer} and {@link ElevationLayer}.
 * @property {Extent} displayed.extent - {@link Extent} of displayed tiles.
 * @property {Set} displayed.tiles - Set of displayed tiles.
 */
export class InfoTiledGeometryLayer extends InfoLayer {
    constructor(tiledGeometryLayer) {
        super(tiledGeometryLayer);
        this.displayed = { tiles: new Set() };
        Object.defineProperty(
            this.displayed,
            'layers',
            {
                get: () => {
                    let layers = [];
                    this.displayed.tiles.forEach((tile) => {
                        const m = tile.material;
                        layers = [...new Set([...layers, ...m.colorTileIds.filter(id => m.getColorTile(id)), m.elevationTileId])];
                    });

                    return this.layer.attachedLayers.filter(l => layers.includes(l.id));
                },
            });
        Object.defineProperty(
            this.displayed,
            'extent',
            {
                get: () => {
                    const extent = new Extent(this.layer.extent.crs, Infinity, -Infinity, Infinity, -Infinity);
                    extent.min = +Infinity;
                    extent.max = -Infinity;
                    this.displayed.tiles.forEach((tile) => {
                        extent.union(tile.extent);
                        extent.min = Math.min(tile.obb.z.min, extent.min);
                        extent.max = Math.max(tile.obb.z.max, extent.max);
                    });

                    return extent;
                },
            });
    }

    clear() {
        this.displayed.tiles.clear();
    }

    update(tile) {
        if (tile.material.visible) {
            this.displayed.tiles.add(tile);
        } else {
            this.displayed.tiles.delete(tile);
        }
    }
}
