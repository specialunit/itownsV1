import * as THREE from 'three';

// See the different constants holding ordinal, name, numElements, byteSize in PointAttributes.cpp in PotreeConverter
// elementByteSize is byteSize / numElements
const POINT_ATTRIBUTES = {
    POSITION_CARTESIAN: {
        numElements: 3,
        arrayType: Float32Array,
        attributeName: 'position',
    },
    COLOR_PACKED: {
        numElements: 4,
        arrayType: Uint8Array,
        attributeName: 'color',
        normalized: true,
    },
    INTENSITY: {
        numElements: 1,
        numByte: 2,
        // using Float32Array because Float16Array doesn't exist
        arrayType: Uint16Array,
        attributeName: 'intensity',
        normalized: true,
    },
    CLASSIFICATION: {
        numElements: 1,
        arrayType: Uint8Array,
        attributeName: 'classification',
        normalized: true,
    },
    // Note: at the time of writing, PotreeConverter will only generate normals in Oct16 format
    // see PotreeConverter.cpp:121
    // we keep all the historical value to still supports old conversion
    NORMAL_SPHEREMAPPED: {
        numElements: 2,
        arrayType: Uint8Array,
        attributeName: 'sphereMappedNormal',
    },
    // see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602
    NORMAL_OCT16: {
        numElements: 2,
        arrayType: Uint8Array,
        attributeName: 'oct16Normal',
    },
    NORMAL: {
        numElements: 3,
        arrayType: Float32Array,
        attributeName: 'normal',
    },
};

for (const potreeName of Object.keys(POINT_ATTRIBUTES)) {
    const attr = POINT_ATTRIBUTES[potreeName];
    attr.potreeName = potreeName;
    attr.numByte = attr.numByte || attr.arrayType.BYTES_PER_ELEMENT;
    attr.byteSize = attr.numElements * attr.numByte;
    attr.normalized = attr.normalized || false;
    // chrome is known to perform badly when we call a method without respecting its arity
    const fnName = `getUint${attr.numByte * 8}`;
    attr.getValue = attr.numByte === 1 ?
        function getValue(view, offset) { return view[fnName](offset); } :
        function getValue(view, offset) { return view[fnName](offset, true); };
}

export default {
    /** @module PotreeBinParser */
    /** Parse .bin PotreeConverter format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @param {Object} options
     * @param {string[]} options.in.pointAttributes - the point attributes information contained in cloud.js
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer, options) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const view = new DataView(buffer);
        // Format: X1,Y1,Z1,R1,G1,B1,A1,[...],XN,YN,ZN,RN,GN,BN,AN
        let pointByteSize = 0;
        for (const potreeName of options.in.pointAttributes) {
            pointByteSize += POINT_ATTRIBUTES[potreeName].byteSize;
        }
        const numPoints = Math.floor(buffer.byteLength / pointByteSize);

        const geometry = new THREE.BufferGeometry();
        let elemOffset = 0;
        let attrOffset = 0;
        for (const potreeName of options.in.pointAttributes) {
            const attr = POINT_ATTRIBUTES[potreeName];
            const arrayLength = attr.numElements * numPoints;
            const array = new attr.arrayType(arrayLength);
            for (let arrayOffset = 0; arrayOffset < arrayLength; arrayOffset += attr.numElements) {
                for (let elemIdx = 0; elemIdx < attr.numElements; elemIdx++) {
                    array[arrayOffset + elemIdx] = attr.getValue(view, attrOffset + elemIdx * attr.numByte);
                }
                attrOffset += pointByteSize;
            }
            elemOffset += attr.byteSize;
            attrOffset = elemOffset;
            geometry.setAttribute(attr.attributeName, new THREE.BufferAttribute(array, attr.numElements, attr.normalized));
        }

        return Promise.resolve(geometry);
    },
};
