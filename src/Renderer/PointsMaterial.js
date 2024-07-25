import * as THREE from 'three';
import PointsVS from 'Renderer/Shader/PointsVS.glsl';
import PointsFS from 'Renderer/Shader/PointsFS.glsl';
import CommonMaterial from 'Renderer/CommonMaterial';
import Gradients from 'Utils/Gradients';

export const PNTS_MODE = {
    COLOR: 0,
    INTENSITY: 1,
    CLASSIFICATION: 2,
    ELEVATION: 3,
    RETURN_NUMBER: 4,
    RETURN_TYPE: 5,
    RETURN_COUNT: 6,
    POINT_SOURCE_ID: 7,
    SCAN_ANGLE: 8,
    NORMAL: 9,
};

export const PNTS_SHAPE = {
    CIRCLE: 0,
    SQUARE: 1,
};

export const PNTS_SIZE_MODE = {
    VALUE: 0,
    ATTENUATED: 1,
};

const white = new THREE.Color(1.0,  1.0,  1.0);

/**
 * Every lidar point can have a classification assigned to it that defines
 * the type of object that has reflected the laser pulse. Lidar points can be
 * classified into a number of categories including bare earth or ground,
 * top of canopy, and water. The different classes are defined using numeric
 * integer codes in the files.
 *
 * @typedef {Object} Classification
 * @property {boolean} visible - category visibility,
 * @property {string} name - category name,
 * @property {THREE.Color} color - category color,
 * @property {number} opacity - category opacity,
 */

export const ClassificationScheme = {
    DEFAULT: {
        0: { visible: true, name: 'never classified', color: new THREE.Color(0.5,  0.5,  0.5), opacity: 1.0 },
        1: { visible: true, name: 'unclassified', color: new THREE.Color(0.5,  0.5,  0.5), opacity: 1.0 },
        2: { visible: true, name: 'ground', color: new THREE.Color(0.63, 0.32, 0.18), opacity: 1.0 },
        3: { visible: true, name: 'low vegetation', color: new THREE.Color(0.0,  1.0,  0.0), opacity: 1.0 },
        4: { visible: true, name: 'medium vegetation', color: new THREE.Color(0.0,  0.8,  0.0), opacity: 1.0 },
        5: { visible: true, name: 'high vegetation', color: new THREE.Color(0.0,  0.6,  0.0), opacity: 1.0 },
        6: { visible: true, name: 'building', color: new THREE.Color(1.0,  0.66, 0.0), opacity: 1.0 },
        7: { visible: true, name: 'low point(noise)', color: new THREE.Color(1.0,  0.0,  1.0), opacity: 1.0 },
        8: { visible: true, name: 'key-point', color: new THREE.Color(1.0,  0.0,  0.0), opacity: 1.0 },
        9: { visible: true, name: 'water', color: new THREE.Color(0.0,  0.0,  1.0), opacity: 1.0 },
        10: { visible: true, name: 'rail', color: new THREE.Color(0.8,  0.8,  1.0), opacity: 1.0 },
        11: { visible: true, name: 'road Surface', color: new THREE.Color(0.4,  0.4,  0.7), opacity: 1.0 },
        12: { visible: true, name: 'overlap', color: new THREE.Color(1.0,  1.0,  0.0), opacity: 1.0 },
        DEFAULT: { visible: true, name: 'default', color: new THREE.Color(0.3, 0.6, 0.6), opacity: 1.0 },
    },
};

const DiscreteScheme = {
    DEFAULT: {
        0: { visible: true, name: '0', color: new THREE.Color('rgb(67, 99, 216)'), opacity: 1.0 },
        1: { visible: true, name: '1', color: new THREE.Color('rgb(60, 180, 75);'), opacity: 1.0 },
        2: { visible: true, name: '2', color: new THREE.Color('rgb(255, 255, 25)'), opacity: 1.0 },
        3: { visible: true, name: '3', color: new THREE.Color('rgb(145, 30, 180)'), opacity: 1.0 },
        4: { visible: true, name: '4', color: new THREE.Color('rgb(245, 130, 49)'), opacity: 1.0 },
        5: { visible: true, name: '5', color: new THREE.Color('rgb(230, 25, 75)'), opacity: 1.0 },
        6: { visible: true, name: '6', color: new THREE.Color('rgb(66, 212, 244)'), opacity: 1.0 },
        7: { visible: true, name: '7', color: new THREE.Color('rgb(240, 50, 230)'), opacity: 1.0 },
        DEFAULT: { visible: true, name: 'default', color: white, opacity: 1.0 },
    },
};

// Taken from Potree. Copyright (c) 2011-2020, Markus Schütz All rights reserved.
// https://github.com/potree/potree/blob/develop/src/materials/PointCloudMaterial.js
function generateGradientTexture(gradient) {
    const size = 64;

    // create canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    // get context
    const context = canvas.getContext('2d');

    // draw gradient
    context.rect(0, 0, size, size);
    const ctxGradient = context.createLinearGradient(0, 0, size, size);

    for (let i = 0; i < gradient.length; i++) {
        const step = gradient[i];

        ctxGradient.addColorStop(step[0], `#${step[1].getHexString()}`);
    }

    context.fillStyle = ctxGradient;
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    texture.minFilter = THREE.LinearFilter;
    texture.wrap = THREE.RepeatWrapping;
    texture.repeat = 2;

    return texture;
}

function recomputeTexture(scheme, texture, nbClass) {
    let needTransparency;
    const data = texture.image.data;
    const width = texture.image.width;
    if (!nbClass) { nbClass = Object.keys(scheme).length; }

    for (let i = 0; i < width; i++) {
        let color;
        let opacity;

        if (scheme[i]) {
            color = scheme[i].color;
            opacity = scheme[i].opacity;
        } else if (scheme[i % nbClass]) {
            color = scheme[i % nbClass].color;
            opacity = scheme[i % nbClass].opacity;
        } else if (scheme.DEFAULT) {
            color = scheme.DEFAULT.color;
            opacity = scheme.DEFAULT.opacity;
        } else {
            color = white;
            opacity = 1.0;
        }

        const j = 4 * i;
        data[j + 0] = parseInt(255 * color.r, 10);
        data[j + 1] = parseInt(255 * color.g, 10);
        data[j + 2] = parseInt(255 * color.b, 10);
        data[j + 3] = parseInt(255 * opacity, 10);

        needTransparency = needTransparency || opacity < 1;
    }
    texture.needsUpdate = true;
    return needTransparency;
}

class PointsMaterial extends THREE.ShaderMaterial {
    /**
     * @class      PointsMaterial
     * @param      {object}  [options={}]  The options
     * @param      {number}  [options.size=1] point size
     * @param      {number}  [options.mode=PNTS_MODE.COLOR]  display mode.
     * @param      {number}  [options.shape=PNTS_SHAPE.CIRCLE]  rendered points shape.
     * @param      {THREE.Vector4}  [options.overlayColor=new THREE.Vector4(0, 0, 0, 0)]  overlay color.
     * @param      {THREE.Vector2}  [options.intensityRange=new THREE.Vector2(1, 65536)]  intensity range.
     * @param      {THREE.Vector2}  [options.elevationRange=new THREE.Vector2(0, 1000)]  elevation range.
     * @param      {THREE.Vector2}  [options.angleRange=new THREE.Vector2(-90, 90)]  scan angle range.
     * @param      {Scheme}  [options.classificationScheme]  LUT for point classification colorization.
     * @param      {Scheme}  [options.discreteScheme]  LUT for other discret point values colorization.
     * @param      {string}  [options.gradient]  Descrition of the gradient to use for continuous point values.
     *                          (Default value will be the 'SPECTRAL' gradient from Utils/Gradients)
     * @param      {number}  [options.sizeMode=PNTS_SIZE_MODE.VALUE]  point cloud size mode. Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance from point to camera.
     * @param      {number}  [options.minAttenuatedSize=3]  minimum scale used by 'ATTENUATED' size mode
     * @param      {number}  [options.maxAttenuatedSize=10]  maximum scale used by 'ATTENUATED' size mode
     *
     * @property {Scheme}  classificationScheme - Color scheme for point classification values.
     * @property {Scheme}  discreteScheme - Color scheme for all other discrete values.
     * @property {object}  gradients - Descriptions of all available gradients.
     * @property {object}  gradient - Description of the gradient to use for display.
     * @property {THREE.CanvasTexture}  gradientTexture - The texture generate from the choosen gradient.
     *
     * @example
     * // change color category classification
     * const pointMaterial = new PointsMaterial();
     * pointMaterial.classification[3].color.setStyle('red');
     * pointMaterial.recomputeClassification();
     */
    constructor(options = {}) {
        const gradients = {
            ...options.gradient,
            ...Gradients,
        };
        options.gradient = Object.values(gradients)[0];

        const {
            intensityRange = new THREE.Vector2(1, 65536),
            elevationRange = new THREE.Vector2(0, 1000),
            angleRange = new THREE.Vector2(-90, 90),
            classificationScheme = ClassificationScheme.DEFAULT,
            discreteScheme = DiscreteScheme.DEFAULT,
            size = 1,
            mode = PNTS_MODE.COLOR,
            shape = PNTS_SHAPE.CIRCLE,
            sizeMode = PNTS_SIZE_MODE.ATTENUATED,
            minAttenuatedSize = 3,
            maxAttenuatedSize = 10,
            gradient,
            scale = 0.05 * 0.5 / Math.tan(1.0 / 2.0),
            ...materialOptions
        } = options;

        super({
            ...materialOptions,
            fog: true,
            precision: 'highp',
            vertexColors: true,
        });
        this.uniforms = THREE.UniformsUtils.merge([
            // THREE.PointsMaterial uniforms
            THREE.UniformsLib.points,
            THREE.UniformsLib.fog,
        ]);
        this.vertexShader = PointsVS;
        this.fragmentShader = PointsFS;

        this.userData.needTransparency = {};
        this.gradients = gradients;
        this.gradientTexture = new THREE.CanvasTexture();

        CommonMaterial.setDefineMapping(this, 'PNTS_MODE', PNTS_MODE);
        CommonMaterial.setDefineMapping(this, 'PNTS_SHAPE', PNTS_SHAPE);
        CommonMaterial.setDefineMapping(this, 'PNTS_SIZE_MODE', PNTS_SIZE_MODE);

        this.size = size;
        CommonMaterial.setUniformProperty(this, 'mode', mode);
        CommonMaterial.setUniformProperty(this, 'shape', shape);
        CommonMaterial.setUniformProperty(this, 'picking', false);
        CommonMaterial.setUniformProperty(this, 'opacity', this.opacity);
        CommonMaterial.setUniformProperty(this, 'intensityRange', intensityRange);
        CommonMaterial.setUniformProperty(this, 'elevationRange', elevationRange);
        CommonMaterial.setUniformProperty(this, 'angleRange', angleRange);
        CommonMaterial.setUniformProperty(this, 'sizeMode', sizeMode);
        CommonMaterial.setUniformProperty(this, 'scale', scale);
        CommonMaterial.setUniformProperty(this, 'minAttenuatedSize', minAttenuatedSize);
        CommonMaterial.setUniformProperty(this, 'maxAttenuatedSize', maxAttenuatedSize);

        // add classification texture to apply classification lut.
        const data = new Uint8Array(256 * 4);
        const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'classificationTexture', texture);

        // add texture to applying the discrete lut.
        const dataLUT = new Uint8Array(256 * 4);
        const textureLUT = new THREE.DataTexture(dataLUT, 256, 1, THREE.RGBAFormat);
        textureLUT.needsUpdate = true;
        textureLUT.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'discreteTexture', textureLUT);

        // add texture to apply visibility.
        const dataVisi = new Uint8Array(256 * 1);
        const textureVisi = new THREE.DataTexture(dataVisi, 256, 1, THREE.RedFormat);

        textureVisi.needsUpdate = true;
        textureVisi.magFilter = THREE.NearestFilter;
        CommonMaterial.setUniformProperty(this, 'visiTexture', textureVisi);

        // Classification and other discrete values scheme
        this.classificationScheme = classificationScheme;
        this.discreteScheme = discreteScheme;

        // Update classification and discrete Texture
        this.recomputeClassification();
        this.recomputeDiscreteTexture();
        this.recomputeVisibleTexture();

        // Gradient texture for continuous values
        this.gradient = gradient;
        CommonMaterial.setUniformProperty(this, 'gradientTexture', this.gradientTexture);

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
    }

    /**
     * Copy the parameters from the passed material into this material.
     * @override
     * @param {THREE.PointsMaterial} source
     * @returns {this}
     */
    copy(source) {
        // Manually copy this needTransparency if source doesn't have one. Prevents losing it when copying a three
        // PointsMaterial into this PointsMaterial
        const needTransparency = source.userData.needTransparency !== undefined ? source.userData.needTransparency
            : this.userData.needTransparency;

        if (source.isShaderMaterial) {
            super.copy(source);
        } else {
            THREE.Material.prototype.copy.call(this, source);
        }

        // Parameters of THREE.PointsMaterial
        this.color.copy(source.color);
        this.map = source.map;
        this.alphaMap = source.alphaMap;
        this.size = source.size;
        this.sizeAttenuation = source.sizeAttenuation;
        this.fog = source.fog;

        this.userData.needTransparency = needTransparency;

        return this;
    }

    /** @returns {THREE.Color} */
    get color() {
        return this.uniforms.diffuse.value;
    }

    /** @param {THREE.Color} color */
    set color(color) {
        this.uniforms.diffuse.value.copy(color);
    }

    /** @returns {THREE.Texture | null} */
    get map() {
        return this.uniforms.map.value;
    }

    /** @param {THREE.Texture | null} map */
    set map(map) {
        this.uniforms.map.value = map;
        if (!map) { return; }

        if (map.matrixAutoUpdate) {
            map.updateMatrix();
        }

        this.uniforms.uvTransform.value.copy(map.matrix);
    }

    /** @returns {THREE.Texture | null} */
    get alphaMap() {
        return this.uniforms.alphaMap.value;
    }

    /** @param {THREE.Texture | null} map */
    set alphaMap(map) {
        this.uniforms.alphaMap.value = map;
        if (!map) { return; }

        if (map.matrixAutoUpdate) {
            map.updateMatrix();
        }

        this.uniforms.alphaMapTransform.value.copy(map.matrix);
    }

    /** @returns {number} */
    get size() {
        return this.uniforms.size.value;
    }

    /** @param {number} size */
    set size(size) {
        this.uniforms.size.value = size;
    }

    /** @returns {boolean} */
    get sizeAttenuation() {
        return this.sizeMode !== PNTS_SIZE_MODE.VALUE;
    }

    /** @param {boolean} value */
    set sizeAttenuation(value) {
        this.sizeMode = value ?
            PNTS_SIZE_MODE.ATTENUATED :
            PNTS_SIZE_MODE.VALUE;
    }

    recomputeClassification() {
        const needTransparency = recomputeTexture(this.classificationScheme, this.classificationTexture, 256);
        this.userData.needTransparency[PNTS_MODE.CLASSIFICATION] = needTransparency;
        this.dispatchEvent({
            type: 'material_property_changed',
            target: this.uniforms,
        });
    }

    recomputeDiscreteTexture() {
        const needTransparency = recomputeTexture(this.discreteScheme, this.discreteTexture);
        this.userData.needTransparency[PNTS_MODE.RETURN_NUMBER] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.RETURN_TYPE] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.RETURN_COUNT] = needTransparency;
        this.userData.needTransparency[PNTS_MODE.POINT_SOURCE_ID] = needTransparency;
        this.dispatchEvent({
            type: 'material_property_changed',
            target: this.uniforms,
        });
    }

    recomputeVisibleTexture() {
        const texture = this.visiTexture;
        const scheme = this.classificationScheme;

        const data = texture.image.data;
        const width = texture.image.width;

        for (let i = 0; i < width; i++) {
            let visible;

            if (scheme[i]) {
                visible  = scheme[i].visible;
            } else if (scheme.DEFAULT) {
                visible  = scheme.DEFAULT.visible;
            } else {
                visible = true;
            }

            data[i] = visible ? 255 : 0;
        }
        texture.needsUpdate = true;


        this.dispatchEvent({
            type: 'material_property_changed',
            target: this.uniforms,
        });
    }

    enablePicking(picking) {
        this.picking = picking;
        this.blending = picking ? THREE.NoBlending : THREE.NormalBlending;
    }

    set gradient(value) {
        this.gradientTexture = generateGradientTexture(value);
    }
}

export default PointsMaterial;
