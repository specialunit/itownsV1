import * as THREE from 'three';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

class PointCloudNode extends THREE.EventDispatcher {
    constructor(numPoints = 0, layer) {
        super();

        this.numPoints = numPoints;
        this.layer = layer;

        this.children = [];
        this.bbox = new THREE.Box3();
        this._bbox = new THREE.Box3();
        this._position = new THREE.Vector3();
        this._quaternion = new THREE.Quaternion();
        this.sse = -1;
    }

    add(node, indexChild) {
        this.children.push(node);
        node.parent = this;
        this.createChildAABB(node, indexChild);
    }

    /**
     * Create an (A)xis (A)ligned (B)ounding (B)ox for the given node given
     * `this` is its parent.
     * @param {CopcNode} childNode - The child node
     */
    createChildAABB(childNode) {
        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (childNode.depth - this.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        this._bbox.getSize(size).divideScalar(f);

        // initialize the child node bbox at the location of the parent node bbox
        childNode._bbox.min.copy(this._bbox.min);

        // position of the parent node, if it was at the same depth as the
        // child, found by multiplying the tree position by the factor
        position.copy(this).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(childNode, position).multiply(size);

        // apply the translation to the child node bbox
        childNode._bbox.min.add(translation);

        // use the size computed above to set the max
        childNode._bbox.max.copy(childNode._bbox.min).add(size);
    }

    getCenter() {
        // get center of the bbox in the world referentiel
        const centerBbox = new THREE.Vector3();
        this._bbox.getCenter(centerBbox);
        const rotInv = this._quaternion.clone().invert();
        const origVector = this._position;
        this.center = centerBbox.clone().applyQuaternion(rotInv).add(origVector);
    }

    load() {
        // Query octree/HRC if we don't have children potreeNode yet.
        if (!this.octreeIsLoaded) {
            this.loadOctree();
        }

        this.getCenter();

        return this.layer.source.fetcher(this.url, this.layer.source.networkOptions)
            .then(file => this.layer.source.parse(file, { out: { ...this.layer, center: this.center }, in: this.layer.source }));
    }

    findCommonAncestor(node) {
        if (node.depth == this.depth) {
            if (node.id == this.id) {
                return node;
            } else if (node.depth != 0) {
                return this.parent.findCommonAncestor(node.parent);
            }
        } else if (node.depth < this.depth) {
            return this.parent.findCommonAncestor(node);
        } else {
            return this.findCommonAncestor(node.parent);
        }
    }
}

export default PointCloudNode;
