import * as THREE from 'three';
import { OBB } from 'ThreeExtended/math/OBB';

class PointCloudNode extends THREE.EventDispatcher {
    constructor(numPoints = 0, layer) {
        super();

        this.numPoints = numPoints;
        this.layer = layer;

        this.children = [];
        this.bbox = new THREE.Box3();
        this.obb = new OBB();
        this.sse = -1;
    }

    add(childNode, indexChild) {
        this.children.push(childNode);
        childNode.parent = this;
        this.createChildAABB(childNode, indexChild);
        this.createChildOBB(childNode);
    }

    load() {
        // Query octree/HRC if we don't have children potreeNode yet.
        if (!this.octreeIsLoaded) {
            this.loadOctree();
        }

        return this.layer.source.fetcher(this.url, this.layer.source.networkOptions)
            .then(file => this.layer.source.parse(file, { out: this.layer, in: this.layer.source }));
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
