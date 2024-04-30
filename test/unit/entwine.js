import assert from 'assert';
import { Vector3 } from 'three';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import EntwinePointTileSource from 'Source/EntwinePointTileSource';
import EntwinePointTileLayer from 'Layer/EntwinePointTileLayer';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import LASParser from 'Parser/LASParser';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

import ept from '../data/entwine/ept.json';
import eptHierarchy from '../data/entwine/ept-hierarchy/0-0-0-0.json';

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds';
const urlEpt = `${baseurl}/entwine/ept.json`;
const urlEptHierarchy = `${baseurl}/entwine/ept-hierarchy/0-0-0-0.json`;

const resources = {
    [urlEpt]: ept,
    [urlEptHierarchy]: eptHierarchy,
};

describe('Entwine Point Tile', function () {
    let source;
    let stubFetcherJson;
    let stubFetcherArrayBuf;

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(url => Promise.resolve(JSON.parse(resources[url])));
        stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
            .callsFake(() => Promise.resolve(new ArrayBuffer()));
        // currently no test on data fetched...

        LASParser.enableLazPerf('./examples/libs/laz-perf');
        source = new EntwinePointTileSource({
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/entwine',
        });
    });

    after(async function () {
        stubFetcherJson.restore();
        stubFetcherArrayBuf.restore();
        await LASParser.terminate();
    });

    it('loads the EPT structure', (done) => {
        source.whenReady
            .then(() => {
                done();
            }).catch(done);
    });

    describe('Entwine Point Tile Layer', function () {
        let renderer;
        let view;
        let layer;
        let context;

        before(function (done) {
            renderer = new Renderer();
            view = new GlobeView(renderer.domElement, {}, { renderer });
            layer = new EntwinePointTileLayer('test', { source });

            context = {
                camera: view.camera,
                engine: view.mainLoop.gfxEngine,
                scheduler: view.mainLoop.scheduler,
                geometryLayer: layer,
                view,
            };

            View.prototype.addLayer.call(view, layer)
                .then(() => {
                    done();
                }).catch(done);
        });

        it('pre updates and finds the root', () => {
            const element = layer.preUpdate(context, new Set([layer]));
            assert.strictEqual(element.length, 1);
            assert.deepStrictEqual(element[0], layer.root);
        });

        it('tries to update on the root and fails', function () {
            layer.update(context, layer, layer.root);
            assert.strictEqual(layer.root.promise, undefined);
        });

        it('tries to update on the root and succeeds', function (done) {
            const lookAt = new Vector3();
            const coord = new Coordinates(view.referenceCrs, layer.root.bbox.getCenter(lookAt));
            view.controls.lookAtCoordinate({
                coord,
                range: 250,
            }, false)
                .then(() => {
                    layer.update(context, layer, layer.root);
                    layer.root.promise
                        .then(() => {
                            done();
                        });
                }).catch(done);
        });

        it('post updates', function () {
            layer.postUpdate(context, layer);
        });
    });

    describe('Entwine Point Tile Node', function () {
        let root;
        before(function () {
            const layer = { source: { url: 'http://server.geo', extension: 'laz' } };
            root = new EntwinePointTileNode(0, 0, 0, 0, layer, 4000);
            root.bbox.setFromArray([1000, 1000, 1000, 0, 0, 0]);

            root.add(new EntwinePointTileNode(1, 0, 0, 0, layer, 3000));
            root.add(new EntwinePointTileNode(1, 0, 0, 1, layer, 3000));
            root.add(new EntwinePointTileNode(1, 0, 1, 1, layer, 3000));

            root.children[0].add(new EntwinePointTileNode(2, 0, 0, 0, layer, 2000));
            root.children[0].add(new EntwinePointTileNode(2, 0, 1, 0, layer, 2000));
            root.children[1].add(new EntwinePointTileNode(2, 0, 1, 3, layer, 2000));
            root.children[2].add(new EntwinePointTileNode(2, 0, 2, 2, layer, 2000));
            root.children[2].add(new EntwinePointTileNode(2, 0, 3, 3, layer, 2000));

            root.children[0].children[0].add(new EntwinePointTileNode(3, 0, 0, 0, layer, 1000));
            root.children[0].children[0].add(new EntwinePointTileNode(3, 0, 1, 0, layer, 1000));
            root.children[1].children[0].add(new EntwinePointTileNode(3, 0, 2, 7, layer, 1000));
            root.children[2].children[0].add(new EntwinePointTileNode(3, 0, 5, 4, layer, 1000));
            root.children[2].children[1].add(new EntwinePointTileNode(3, 1, 6, 7, layer));
        });

        it('finds the common ancestor of two nodes', () => {
            let ancestor = root.children[2].children[1].children[0].findCommonAncestor(root.children[2].children[0].children[0]);
            assert.deepStrictEqual(ancestor, root.children[2]);

            ancestor = root.children[0].children[0].children[0].findCommonAncestor(root.children[0].children[0].children[1]);
            assert.deepStrictEqual(ancestor, root.children[0].children[0]);

            ancestor = root.children[0].children[1].findCommonAncestor(root.children[2].children[1].children[0]);
            assert.deepStrictEqual(ancestor, root);

            ancestor = root.children[1].findCommonAncestor(root.children[1].children[0].children[0]);
            assert.deepStrictEqual(ancestor, root.children[1]);

            ancestor = root.children[2].children[0].findCommonAncestor(root.children[2]);
            assert.deepStrictEqual(ancestor, root.children[2]);
        });
    });
});
