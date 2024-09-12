import assert from 'assert';
import Potree2Layer from 'Layer/Potree2Layer';
import Potree2Node from 'Core/Potree2Node';

describe('preUpdate Potree2Layer', function () {
    const context = { camera: { height: 1, camera3D: { fov: 1 } } };
    const layer = {
        id: 'a',
        source: { baseurl: 'server.geo' },
        hierarchyStepSize: 1,
    };
    const root = new Potree2Node(4000, 0, layer);
    root.bbox.setFromArray([1000, 1000, 1000, 0, 0, 0]);

    root.add(new Potree2Node(3000, 0, layer), 1, root);
    root.children[0].obj = { layer, isPoints: true };
    root.add(new Potree2Node(3000, 0, layer), 2, root);
    root.children[1].obj = { layer, isPoints: true };
    root.add(new Potree2Node(3000, 0, layer), 3, root);
    root.children[2].obj = { layer, isPoints: true };

    root.children[0].add(new Potree2Node(2000, 0, layer), 1, root);
    root.children[0].children[0].obj = { layer, isPoints: true };
    root.children[0].add(new Potree2Node(2000, 0, layer), 2, root);
    root.children[0].children[1].obj = { layer, isPoints: true };
    root.children[1].add(new Potree2Node(2000, 0, layer), 1, root);
    root.children[1].children[0].obj = { layer, isPoints: true };
    root.children[2].add(new Potree2Node(2000, 0, layer), 2, root);
    root.children[2].children[0].obj = { layer, isPoints: true };
    root.children[2].add(new Potree2Node(2000, 0, layer), 3, root);
    root.children[2].children[1].obj = { layer, isPoints: true };

    root.children[0].children[0].add(new Potree2Node(1000, 0, layer), 1, root);
    root.children[0].children[0].children[0].obj = { layer, isPoints: true };
    root.children[0].children[0].add(new Potree2Node(1000, 0, layer), 5, root);
    root.children[0].children[0].children[1].obj = { layer, isPoints: true };
    root.children[0].children[1].add(new Potree2Node(1000, 0, layer), 4, root);
    root.children[0].children[1].children[0].obj = { layer, isPoints: true };
    root.children[2].children[1].add(new Potree2Node(1000, 0, layer), 1, root);
    root.children[2].children[1].children[0].obj = { layer, isPoints: true };
    root.children[2].children[1].add(new Potree2Node(1000, 0, layer), 2, root);
    root.children[2].children[1].children[1].obj = { layer, isPoints: true };
    root.children[2].children[1].add(new Potree2Node(1000, 0, layer), 3, root);
    root.children[2].children[1].children[2].obj = { layer, isPoints: true };
    root.children[2].children[1].add(new Potree2Node(1000, 0, layer), 4, root);
    root.children[2].children[1].children[3].obj = { layer, isPoints: true };

    layer.root = [root];

    it('should return root if no change source', () => {
        const sources = new Set();
        assert.deepStrictEqual(
            layer.root[0],
            Potree2Layer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should return root if no common ancestors', () => {
        const sources = new Set();
        sources.add(layer.root[0].children[0].children[0]);
        sources.add(layer.root[0].children[2].children[1]);
        assert.deepStrictEqual(
            layer.root[0],
            Potree2Layer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should return common ancestor', () => {
        const sources = new Set();
        sources.add(layer.root[0].children[2].children[0]);
        sources.add(layer.root[0].children[2].children[1]);
        sources.add(layer.root[0].children[2].children[1].children[2]);
        sources.add(layer.root[0].children[2].children[1].children[3]);
        assert.deepStrictEqual(
            layer.root[0].children[2],
            Potree2Layer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should not search ancestors if layer are different root if no common ancestors', () => {
        const sources = new Set();
        sources.add(layer.root[0].children[2].children[0]);
        sources.add(layer.root[0].children[2].children[1].children[3]);
        layer.root[0].children[2].children[1].children[3].obj = { layer: {}, isPoints: true };
        assert.deepStrictEqual(
            layer.root[0].children[2].children[0],
            Potree2Layer.prototype.preUpdate.call(layer, context, sources)[0]);
    });
});
