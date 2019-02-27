import * as THREE from 'three';
import TileVS from 'Renderer/Shader/TileVS.glsl';
import TileFS from 'Renderer/Shader/TileFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import Capabilities from 'Core/System/Capabilities';
import RenderMode from 'Renderer/RenderMode';
import MaterialLayer from 'Renderer/MaterialLayer';

const identityOffsetScale = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);

// from three.js packDepthToRGBA
const UnpackDownscale = 255 / 256; // 0..1 -> fraction (excluding 1)
const bitSh = new THREE.Vector4(
    UnpackDownscale / (256.0 * 256.0 * 256.0),
    UnpackDownscale / (256.0 * 256.0),
    UnpackDownscale / 256.0,
    UnpackDownscale);

export function unpack1K(color, factor) {
    return factor ? bitSh.dot(color) * factor : bitSh.dot(color);
}

export const CRS_DEFINES = [
    ['WGS84', 'WGS84G', 'TMS', 'EPSG:3946', 'EPSG:4326', 'WMTS:WGS84G'],
    ['PM', 'WMTS:PM'],
];

// Max sampler color count to LayeredMaterial
// Because there's a statement limitation to unroll, in getColorAtIdUv method
const maxSamplersColorCount = 15;
const samplersElevationCount = 1;

export function getMaxColorSamplerUnitsCount() {
    const maxSamplerUnitsCount = Capabilities.getMaxTextureUnitsCount();
    return Math.min(maxSamplerUnitsCount - samplersElevationCount, maxSamplersColorCount);
}

function updateLayersUniforms(uniforms, olayers, max) {
    // prepare convenient access to elevation or color uniforms
    const layers = uniforms.layers.value;
    const textures = uniforms.textures.value;
    const offsetScales = uniforms.offsetScales.value;
    const textureCount = uniforms.textureCount;

    // flatten the 2d array [i,j] -> layers[_layerIds[i]].textures[j]
    let count = 0;
    for (const layer of olayers) {
        layer.textureOffset = count;
        for (let i = 0, il = layer.textures.length; i < il; ++i, ++count) {
            if (count < max) {
                offsetScales[count] = layer.offsetScales[i];
                textures[count] = layer.textures[i];
                layers[count] = layer;
            }
        }
    }
    if (count > max) {
        console.warn(`LayeredMaterial: Not enough texture units (${max} < ${count}), excess textures have been discarded.`);
    }
    textureCount.value = count;
}

function setDefineMapping(object, PROPERTY, mapping) {
    Object.keys(mapping).forEach((key) => {
        object.defines[`${PROPERTY}_${key}`] = mapping[key];
    });
}

function setDefineProperty(object, property, PROPERTY, initValue) {
    object.defines[PROPERTY] = initValue;
    Object.defineProperty(object, property, {
        get: () => object.defines[PROPERTY],
        set: (value) => {
            if (object.defines[PROPERTY] != value) {
                object.defines[PROPERTY] = value;
                object.needsUpdate = true;
            }
        },
    });
}

function setUniformProperty(object, property, initValue) {
    object.uniforms[property] = new THREE.Uniform(initValue);
    Object.defineProperty(object, property, {
        get: () => object.uniforms[property].value,
        set: (value) => {
            if (object.uniforms[property].value != value) {
                object.uniforms[property].value = value;
            }
        },
    });
}

export const ELEVATION_MODES = {
    RGBA: 0,
    COLOR: 1,
    DATA: 2,
};

let nbSamplers;
let fragmentShader;
class LayeredMaterial extends THREE.RawShaderMaterial {
    constructor(options = {}) {
        super(options);

        nbSamplers = nbSamplers || [samplersElevationCount, getMaxColorSamplerUnitsCount()];

        this.defines.NUM_VS_TEXTURES = nbSamplers[0];
        this.defines.NUM_FS_TEXTURES = nbSamplers[1];
        this.defines.USE_FOG = 1;
        this.defines.EPSILON = 1e-6;

        for (let i = 0, il = CRS_DEFINES.length; i < il; ++i) {
            this.defines[`CRS_${CRS_DEFINES[i][0]}`] = i;
        }
        this.defines.NUM_CRS = CRS_DEFINES.length;

        setDefineMapping(this, 'ELEVATION', ELEVATION_MODES);
        setDefineMapping(this, 'MODE', RenderMode.MODES);
        setDefineProperty(this, 'mode', 'MODE', RenderMode.MODES.FINAL);

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
            const outlineColors = [
                new THREE.Vector3(1.0, 0.0, 0.0),
                new THREE.Vector3(1.0, 0.5, 0.0),
            ];
            setUniformProperty(this, 'showOutline', true);
            setUniformProperty(this, 'outlineWidth', 0.008);
            setUniformProperty(this, 'outlineColors', outlineColors);
        }

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        this.vertexShader = TileVS;
        fragmentShader = fragmentShader || ShaderUtils.unrollLoops(TileFS, this.defines);
        this.fragmentShader = fragmentShader;

        // Color uniforms
        setUniformProperty(this, 'diffuse', new THREE.Color(0.04, 0.23, 0.35));
        setUniformProperty(this, 'opacity', this.opacity);

        // Lighting uniforms
        setUniformProperty(this, 'lightingEnabled', false);
        setUniformProperty(this, 'lightPosition', new THREE.Vector3(-0.5, 0.0, 1.0));

        // Misc properties
        setUniformProperty(this, 'fogDistance', 1000000000.0);
        setUniformProperty(this, 'fogColor', new THREE.Color(0.76, 0.85, 1.0));
        setUniformProperty(this, 'overlayAlpha', 0);
        setUniformProperty(this, 'overlayColor', new THREE.Color(1.0, 0.3, 0.0));
        setUniformProperty(this, 'objectId', 0);
        setUniformProperty(this, 'horizonDistance', 1000000000.0);

        // > 0 produces gaps,
        // < 0 causes oversampling of textures
        // = 0 causes sampling artefacts due to bad estimation of texture-uv gradients
        // best is a small negative number
        setUniformProperty(this, 'minBorderDistance', -0.01);

        // LayeredMaterialLayers
        this.layers = [];
        this.elevationLayerIds = [];
        this.colorLayerIds = [];

        // elevation layer uniforms, to be updated using updateUniforms()
        this.uniforms.elevationLayers = new THREE.Uniform(new Array(nbSamplers[0]).fill({}));
        this.uniforms.elevationTextures = new THREE.Uniform(new Array(nbSamplers[0]).fill(null));
        this.uniforms.elevationOffsetScales = new THREE.Uniform(new Array(nbSamplers[0]).fill(identityOffsetScale));
        this.uniforms.elevationTextureCount = new THREE.Uniform(0);

        // color layer uniforms, to be updated using updateUniforms()
        this.uniforms.colorLayers = new THREE.Uniform(new Array(nbSamplers[1]).fill({}));
        this.uniforms.colorTextures = new THREE.Uniform(new Array(nbSamplers[1]).fill(null));
        this.uniforms.colorOffsetScales = new THREE.Uniform(new Array(nbSamplers[1]).fill(identityOffsetScale));
        this.uniforms.colorTextureCount = new THREE.Uniform(0);
    }

    getUniformByType(type) {
        return {
            layers: this.uniforms[`${type}Layers`],
            textures: this.uniforms[`${type}Textures`],
            offsetScales: this.uniforms[`${type}OffsetScales`],
            textureCount: this.uniforms[`${type}TextureCount`],
        };
    }

    updateLayersUniforms() {
        const colorlayers = this.layers.filter(l => this.colorLayerIds.includes(l.id) && l.visible && l.opacity > 0);
        colorlayers.sort((a, b) => this.colorLayerIds.indexOf(a.id) - this.colorLayerIds.indexOf(b.id));
        updateLayersUniforms(this.getUniformByType('color'), colorlayers, this.defines.NUM_FS_TEXTURES);

        if (this.elevationLayerIds.some(id => this.getLayer(id)) ||
            (this.uniforms.elevationTextureCount.value && !this.elevationLayerIds.length)) {
            const elevationLayer = this.getElevationLayer() ? [this.getElevationLayer()] : [];
            updateLayersUniforms(this.getUniformByType('elevation'), elevationLayer, this.defines.NUM_VS_TEXTURES);
        }
        this.layersNeedUpdate = false;
    }

    dispose() {
        this.dispatchEvent({ type: 'dispose' });
        this.layers.forEach(l => l.dispose(false));
        this.layers.length = 0;
        this.layersNeedUpdate = true;
    }

    // TODO: rename to setColorLayerIds and add setElevationLayerIds ?
    setSequence(sequenceLayer) {
        this.colorLayerIds = sequenceLayer;
        this.layersNeedUpdate = true;
    }

    setSequenceElevation(layerId) {
        this.elevationLayerIds[0] = layerId;
        this.layersNeedUpdate = true;
    }

    removeLayer(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index > -1) {
            this.layers[index].dispose();
            this.layers.splice(index, 1);
            const idSeq = this.colorLayerIds.indexOf(layerId);
            if (idSeq > -1) {
                this.colorLayerIds.splice(idSeq, 1);
            } else {
                this.elevationLayerIds = [];
            }
        }
    }

    addLayer(layer, tileMT) {
        if (layer.id in this.layers) {
            console.warn('The "{layer.id}" layer was already present in the material, overwritting.');
        }
        const lml = new MaterialLayer(this, layer, tileMT);
        this.layers.push(lml);
        return lml;
    }

    getLayer(id) {
        return this.layers.find(l => l.id === id);
    }

    getElevationLayer() {
        return this.layers.find(l => l.id === this.elevationLayerIds[0]);
    }
}

export default LayeredMaterial;
