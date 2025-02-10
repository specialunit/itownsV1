import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import { OBB } from 'ThreeExtended/math/OBB';

let nextuuid = 1;
function addPickingAttribute(points) {
    // generate unique id for picking
    const numPoints = points.geometry.attributes.position.count;
    const ids = new Uint8Array(4 * numPoints);
    const baseId = nextuuid++;
    if (numPoints > 0xffff || baseId > 0xffff) {
        // TODO: fixme
        console.warn('Currently picking is limited to Points with less than 65535 elements and less than 65535 Points instances');
        return points;
    }
    for (let i = 0; i < numPoints; i++) {
        // todo numpoints > 16bits
        const v = (baseId << 16) | i;
        ids[4 * i + 0] = (v & 0xff000000) >> 24;
        ids[4 * i + 1] = (v & 0x00ff0000) >> 16;
        ids[4 * i + 2] = (v & 0x0000ff00) >> 8;
        ids[4 * i + 3] = (v & 0x000000ff) >> 0;
    }

    points.baseId = baseId;
    points.geometry.setAttribute('unique_id', new THREE.BufferAttribute(ids, 4, true));
    return points;
}

export default {
    executeCommand(command) {
        const layer = command.layer;
        const node = command.requester;

        return node.load().then((geometry) => {
            const origin = geometry.userData.origin || node.bbox.min;
            const points = new THREE.Points(geometry, layer.material);

            addPickingAttribute(points);
            points.frustumCulled = false;
            points.matrixAutoUpdate = false;
            points.position.copy(origin);
            points.scale.copy(layer.scale);

            points.updateMatrix();
            geometry.computeBoundingBox();
            points.tightbbox = geometry.boundingBox.applyMatrix4(points.matrix);
            points.layer = layer;

            points.extent = Extent.fromBox3(command.view.referenceCrs, node.bbox);
            points.userData.node = node;

            // OBB
            const geometryOBB = new THREE.BufferGeometry();
            const pointsOBB = new THREE.Points(geometryOBB);

            const matrix = new THREE.Matrix4();
            const matrixInverse = new THREE.Matrix4();

            if (layer.crs === 'EPSG:4978') {
                const axisZ = new THREE.Vector3(0, 0, 1);
                const alignYtoEast = new THREE.Quaternion();
                const center4978 = new Coordinates('EPSG:4978').setFromVector3(origin);// center
                const center4326 = center4978.as('EPSG:4326');// this.center

                // align Z axe to geodesic normal.
                pointsOBB.quaternion.setFromUnitVectors(axisZ, center4978.geodesicNormal);
                // align Y axe to East
                alignYtoEast.setFromAxisAngle(axisZ, THREE.MathUtils.degToRad(90 + center4326.longitude));
                pointsOBB.quaternion.multiply(alignYtoEast);
            }
            pointsOBB.updateMatrix();

            matrix.copy(pointsOBB.matrix);
            matrixInverse.copy(matrix).invert();

            const position = geometry.attributes.position.array.slice();
            const positionBuffer = new THREE.BufferAttribute(position, 3);
            geometryOBB.setAttribute('position', positionBuffer);

            const positions = pointsOBB.geometry.attributes.position;

            for (let i = 0; i < positions.count; i++) {
                const coord = new THREE.Vector3(
                    positions.array[i * 3] * layer.scale.x,
                    positions.array[i * 3 + 1] * layer.scale.y,
                    positions.array[i * 3 + 2] * layer.scale.z,
                ).applyMatrix4(matrixInverse);

                positions.array[i * 3] = coord.x;
                positions.array[i * 3 + 1] = coord.y;
                positions.array[i * 3 + 2] = coord.z;
            }

            geometryOBB.computeBoundingBox();
            const obb = new OBB().fromBox3(geometryOBB.boundingBox);
            obb.applyMatrix4(pointsOBB.matrix);
            obb.position = origin;

            points.tightobb = obb;

            return points;
        });
    },
};
