import {
    Vector3, LineSegments, LineBasicMaterial,
    BufferAttribute, Float32BufferAttribute, BufferGeometry,
} from 'three';


class OBBHelper extends LineSegments {
    constructor(obb, color = 0xffff00) {
        const indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7, 0, 2, 1, 3, 4, 6, 5, 7]);

        const positions = [1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1];

        const geometry = new BufferGeometry();

        geometry.setIndex(new BufferAttribute(indices, 1));

        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

        super(geometry, new LineBasicMaterial({ color, toneMapped: false }));

        this.obb = obb;

        this.type = 'OBBHelper';
    }

    updateMatrixWorld(force) {
        const positions = this.geometry.attributes.position.array;

        const halfSize = this.obb.halfSize;
        const center = this.obb.center;
        const rotation = this.obb.rotation;
        const corners = [];

        for (let i = 0; i < 8; i++) {
            const corner = new Vector3();
            corner.x = (i & 1) ? center.x + halfSize.x : center.x - halfSize.x;
            corner.y = (i & 2) ? center.y + halfSize.y : center.y - halfSize.y;
            corner.z = (i & 4) ? center.z + halfSize.z : center.z - halfSize.z;
            corner.applyMatrix3(rotation);
            corners.push(corner);
        }

        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            positions[i * 3] = corner.x;
            positions[i * 3 + 1] = corner.y;
            positions[i * 3 + 2] = corner.z;
        }

        this.geometry.attributes.position.needsUpdate = true;
        super.updateMatrixWorld(force);
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

export default OBBHelper;
