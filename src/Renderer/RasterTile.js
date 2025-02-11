import * as THREE from 'three';
import { ELEVATION_MODES } from 'Renderer/LayeredMaterial';
import { checkNodeElevationTextureValidity, insertSignificantValuesFromParent, computeMinMaxElevation } from 'Parser/XbilParser';

export const EMPTY_TEXTURE_ZOOM = -1;

const pitch = new THREE.Vector4();

function getIndiceWithPitch(i, pitch, w) {
    // Return corresponding indice in parent tile using pitch
    const currentX = (i % w) / w;  // normalized
    const currentY = Math.floor(i / w) / w; // normalized
    const newX = pitch.x + currentX * pitch.z;
    const newY = pitch.y + currentY * pitch.w;
    const newIndice = Math.floor(newY * w) * w + Math.floor(newX * w);
    return newIndice;
}

/**
 * A `RasterTile` is part of raster {@link Layer} data.
 * This part is a spatial subdivision of the extent of a layer.
 * In the `RasterTile`, The data are converted on three.js textures.
 * This `RasterTile` textures are assigned to a `LayeredMaterial`.
 * This material is applied on terrain (TileMesh).
 * The color textures are mapped to color the terrain.
 * The elevation textures are used to displace vertex terrain.
 *
 * @class RasterTile
 */
export class RasterTile extends THREE.EventDispatcher {
    constructor(material, layer) {
        super();
        this.layer = layer;
        this.crs = layer.parent.tileMatrixSets.indexOf(layer.crs);
        if (this.crs == -1) {
            console.error('Unknown crs:', layer.crs);
        }

        this.textures = [];
        this.offsetScales = [];
        this.level = EMPTY_TEXTURE_ZOOM;
        this.material = material;

        this._handlerCBEvent = () => { this.material.layersNeedUpdate = true; };
        layer.addEventListener('visible-property-changed', this._handlerCBEvent);
        layer.addEventListener('opacity-property-changed', this._handlerCBEvent);
    }

    get id() {
        return this.layer.id;
    }

    get opacity() {
        return this.layer.opacity;
    }

    get visible() {
        return this.layer.visible;
    }

    initFromParent(parent, extents) {
        if (parent && parent.level > this.level) {
            let index = 0;
            for (const c of extents) {
                for (const texture of parent.textures) {
                    if (c.isInside(texture.extent)) {
                        this.setTexture(index++, texture, c.offsetToParent(texture.extent));
                        break;
                    }
                }
            }

            if (__DEBUG__) {
                if (index != extents.length) {
                    console.error(`non-coherent result ${index} vs ${extents.length}.`, extents);
                }
            }
        }
    }

    dispose(removeEvent = true) {
        if (removeEvent) {
            this.layer.removeEventListener('visible-property-changed', this._handlerCBEvent);
            this.layer.removeEventListener('opacity-property-changed', this._handlerCBEvent);
            // dispose all events
            this._listeners = {};
        }
        // TODO: WARNING  verify if textures to dispose aren't attached with ancestor
        for (const texture of this.textures) {
            if (texture.isTexture) {
                texture.dispose();
            }
        }
        this.level = EMPTY_TEXTURE_ZOOM;
        this.textures = [];
        this.offsetScales = [];
        this.material.layersNeedUpdate = true;
    }

    setTexture(index, texture, offsetScale) {
        this.level = (texture && texture.extent && (index == 0)) ? texture.extent.zoom : this.level;
        this.textures[index] = texture || null;
        this.offsetScales[index] = offsetScale;
        this.material.layersNeedUpdate = true;
    }

    setTextures(textures, pitchs) {
        this.dispose(false);
        for (let i = 0, il = textures.length; i < il; ++i) {
            this.setTexture(i, textures[i], pitchs[i]);
        }
    }
}

export class RasterColorTile extends RasterTile {
    get effect_type() {
        return this.layer.effect_type;
    }
    get effect_parameter() {
        return this.layer.effect_parameter;
    }
    get transparent() {
        return this.layer.transparent;
    }
}

export class RasterElevationTile extends RasterTile {
    constructor(material, layer) {
        super(material, layer);
        const defaultEle = {
            bias: 0,
            mode: ELEVATION_MODES.DATA,
            zmin: -Infinity,
            zmax: Infinity,
        };

        this.scaleFactor = 1.0;

        // Define elevation properties
        if (layer.useRgbaTextureElevation) {
            defaultEle.mode = ELEVATION_MODES.RGBA;
            defaultEle.zmax = 5000;
            throw new Error('Restore this feature');
        } else if (layer.useColorTextureElevation) {
            this.scaleFactor = layer.colorTextureElevationMaxZ - layer.colorTextureElevationMinZ;
            defaultEle.mode = ELEVATION_MODES.COLOR;
            defaultEle.bias = layer.colorTextureElevationMinZ;
            this.min = this.layer.colorTextureElevationMinZ;
            this.max = this.layer.colorTextureElevationMaxZ;
        } else {
            this.min = 0;
            this.max = 0;
        }
        this.bias = layer.bias ?? defaultEle.bias;
        this.mode = layer.mode ?? defaultEle.mode;
        this.zmin = layer.zmin ?? defaultEle.zmin;
        this.zmax = layer.zmax ?? defaultEle.zmax;

        layer.addEventListener('scale-property-changed', this._handlerCBEvent);
    }

    get scale() {
        return this.layer.scale * this.scaleFactor;
    }

    dispose(removeEvent) {
        super.dispose(removeEvent);
        if (removeEvent) {
            this.layer.removeEventListener('scale-property-changed', this._handlerCBEvent);
        }
    }

    initFromParent(parent, extents) {
        const currentLevel = this.level;
        super.initFromParent(parent, extents);
        this.updateMinMaxElevation();
        if (currentLevel !== this.level) {
            this.dispatchEvent({ type: 'rasterElevationLevelChanged', node: this });
        }
    }

    setTextures(textures, offsetScales) {
        const currentLevel = this.level;
        this.replaceNoDataValueFromTexture(textures[0]);
        super.setTextures(textures, offsetScales);
        this.updateMinMaxElevation();
        if (currentLevel !== this.level) {
            this.dispatchEvent({ type: 'rasterElevationLevelChanged', node: this });
        }
    }

    updateMinMaxElevation() {
        if (this.textures[0] && !this.layer.useColorTextureElevation) {
            const { min, max } = computeMinMaxElevation(
                this.textures[0],
                this.offsetScales[0],
                {
                    noDataValue: this.layer.noDataValue,
                    zmin: this.layer.zmin,
                    zmax: this.layer.zmax,
                });
            if (this.min != min || this.max != max) {
                this.min = min;
                this.max = max;
            }
        }
    }

    replaceNoDataValueFromTexture(texture) {
        const nodatavalue = this.layer.noDataValue;
        if (nodatavalue == undefined) {
            return;
        }
        // replace no data value with parent texture value or 0 (if no significant value found).
        const parentTexture = this.textures[0];
        const parentDataElevation = parentTexture && parentTexture.image && parentTexture.image.data;
        const dataElevation = texture.image && texture.image.data;

        if (dataElevation && !checkNodeElevationTextureValidity(dataElevation, nodatavalue)) {
            insertSignificantValuesFromParent(dataElevation, parentDataElevation && dataParent(texture, parentTexture, parentDataElevation, pitch), nodatavalue);
        }
    }
}

function dataParent(texture, parentTexture, parentDataElevation, pitch) {
    texture.extent.offsetToParent(parentTexture.extent, pitch);
    return i => parentDataElevation[getIndiceWithPitch(i, pitch, 256)];
}
