import * as THREE from 'three';

export default {
    /** @module PotreeCinParser */
    /** Parse .cin PotreeConverter format (see {@link https://github.com/peppsac/PotreeConverter/tree/custom_bin}) and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the cin buffer.
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const numPoints = Math.floor((buffer.byteLength - 24) / 16);

        const positions = new Float32Array(buffer, 24, 3 * numPoints);
        const colors = new Uint8Array(buffer, 24 + 3 * 4 * numPoints, 4 * numPoints);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));

        return Promise.resolve(geometry);
    },
};
