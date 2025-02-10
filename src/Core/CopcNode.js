import * as THREE from 'three';
import { Hierarchy } from 'copc';
import PointCloudNode from 'Core/PointCloudNode';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

function buildId(depth, x, y, z) {
    return `${depth}-${x}-${y}-${z}`;
}

class CopcNode extends PointCloudNode {
    /**
     * Constructs a new instance of a COPC Octree node
     *
     * @param {number} depth - Depth within the octree
     * @param {number} x - X position within the octree
     * @param {number} y - Y position within the octree
     * @param {number} z - Z position with the octree
     * @param {number} entryOffset - Offset from the beginning of the file of
     * the node entry
     * @param {number} entryLength - Size of the node entry
     * @param {CopcLayer} layer - Parent COPC layer
     * @param {number} [numPoints=0] - Number of points given by this entry
     */
    constructor(depth, x, y, z, entryOffset, entryLength, layer, numPoints = 0) {
        super(numPoints, layer);
        this.isCopcNode = true;

        this.entryOffset = entryOffset;
        this.entryLength = entryLength;
        this.layer = layer;
        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    get id() {
        return buildId(this.depth, this.x, this.y, this.z);
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    /**
     * @param {number} offset
     * @param {number} size
     */
    async _fetch(offset, size) {
        return this.layer.source.fetcher(this.layer.source.url, {
            ...this.layer.source.networkOptions,
            headers: {
                ...this.layer.source.networkOptions.headers,
                range: `bytes=${offset}-${offset + size - 1}`,
            },
        });
    }

    /**
     * Create an (A)xis (A)ligned (B)ounding (B)ox for the node given
     * `this` is its parent.
     * @param {CopcNode} node - The child node
     */
    createChildAABB(node) {
        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (node.depth - this.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        this.bbox.getSize(size).divideScalar(f);

        // initialize the child node bbox at the location of the parent node bbox
        node.bbox.min.copy(this.bbox.min);

        // position of the parent node, if it was at the same depth as the
        // child, found by multiplying the tree position by the factor
        position.copy(this).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(node, position).multiply(size);

        // apply the translation to the child node bbox
        node.bbox.min.add(translation);

        // use the size computed above to set the max
        node.bbox.max.copy(node.bbox.min).add(size);
    }

    /**
     * Create an (O)riented (B)ounding (B)ox for the node given
     * `this` is its parent.
     * @param {CopcNode} childNode - The child node
     */
    createChildOBB(childNode) {
        const f = 2 ** (childNode.depth - this.depth);

        this.obb.getSize(size).divideScalar(f);

        position.copy(this).multiplyScalar(f);

        translation.subVectors(childNode, position).multiply(size);

        childNode.obb = this.obb.clone();
        childNode.obb.halfSize.divideScalar(f);

        childNode.obb.center = this.obb.center.clone().add(this.obb.halfSize.clone().multiplyScalar(-0.5)).add(translation);
        childNode.obb.position = this.obb.position.clone();
    }

    /**
     * Create a CopcNode from the provided subtree and add it as child
     * of the current node.
     * @param {number} depth - Child node depth in the octree
     * @param {number} x - Child node x position in the octree
     * @param {number} y - Child node y position in the octree
     * @param {number} z - Child node z position in the octree
     * @param {Hierarchy.Subtree} hierarchy - Octree's subtree
     * @param {CopcNode[]} stack - Stack of node candidates for traversal
     */
    findAndCreateChild(depth, x, y, z, hierarchy, stack) {
        const id = buildId(depth, x, y, z);

        let pointCount;
        let offset;
        let byteSize;

        const node = hierarchy.nodes[id];
        if (node) {
            pointCount = node.pointCount;
            offset = node.pointDataOffset;
            byteSize = node.pointDataLength;
        } else {
            const page = hierarchy.pages[id];
            if (!page) { return; }
            pointCount = -1;
            offset = page.pageOffset;
            byteSize = page.pageLength;
        }

        const child = new CopcNode(
            depth,
            x,
            y,
            z,
            offset,
            byteSize,
            this.layer,
            pointCount,
        );
        this.add(child);
        stack.push(child);
    }

    async loadOctree() {
        // Load hierarchy
        const buffer = await this._fetch(this.entryOffset, this.entryLength);
        const hierarchy = await Hierarchy.parse(new Uint8Array(buffer));

        // Update current node entry from loaded subtree
        const node = hierarchy.nodes[this.id];
        if (!node) {
            return Promise.reject('[CopcNode]: Ill-formed data, entry not found in hierarchy.');
        }
        this.numPoints = node.pointCount;
        this.entryOffset = node.pointDataOffset;
        this.entryLength = node.pointDataLength;

        // Load subtree entries
        const stack = [];
        stack.push(this);
        while (stack.length) {
            const node = stack.shift();
            const depth = node.depth + 1;
            const x = node.x * 2;
            const y = node.y * 2;
            const z = node.z * 2;

            node.findAndCreateChild(depth, x,     y,     z,     hierarchy, stack);
            node.findAndCreateChild(depth, x + 1, y,     z,     hierarchy, stack);
            node.findAndCreateChild(depth, x,     y + 1, z,     hierarchy, stack);
            node.findAndCreateChild(depth, x + 1, y + 1, z,     hierarchy, stack);
            node.findAndCreateChild(depth, x,     y,     z + 1, hierarchy, stack);
            node.findAndCreateChild(depth, x + 1, y,     z + 1, hierarchy, stack);
            node.findAndCreateChild(depth, x,     y + 1, z + 1, hierarchy, stack);
            node.findAndCreateChild(depth, x + 1, y + 1, z + 1, hierarchy, stack);
        }
    }

    /**
     * Load the COPC Buffer geometry for this node.
     * @returns {Promise<THREE.BufferGeometry>}
     */
    async load() {
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const buffer = await this._fetch(this.entryOffset, this.entryLength);
        const geometry = await this.layer.source.parser(buffer, {
            in: {
                ...this.layer.source,
                pointCount: this.numPoints,
            },
            out: this.layer,
        });

        return geometry;
    }
}

export default CopcNode;
