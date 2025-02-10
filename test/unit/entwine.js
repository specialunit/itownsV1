import assert from 'assert';
import { Vector3 } from 'three';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import EntwinePointTileSource from 'Source/EntwinePointTileSource';
import EntwinePointTileLayer from 'Layer/EntwinePointTileLayer';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import LASParser from 'Parser/LASParser';
import Renderer from './bootstrap';

import eptFile from '../data/entwine/ept.json';
import eptHierarchyFile from '../data/entwine/ept-hierarchy/0-0-0-0.json';

// LASParser need to be mocked instead of calling it
LASParser.enableLazPerf('./examples/libs/laz-perf');

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/entwine';

const eptSsAuthority = JSON.parse(eptFile);
eptSsAuthority.srs = {
    wkt: 'PROJCS["RGF93 v1 / Lambert-93",GEOGCS["RGF93 v1",DATUM["Reseau_Geodesique_Francais_1993_v1",SPHEROID["GRS 1980",6378137,298.257222101],TOWGS84[0,0,0,0,0,0,0]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","2154"]]',
};

const resources = {
    [`${baseurl}/ept.json`]: JSON.parse(eptFile),
    'withoutAutority/ept.json': eptSsAuthority,
    [`${baseurl}/ept-hierarchy/0-0-0-0.json`]: JSON.parse(eptHierarchyFile),
};

describe('Entwine Point Tile', function () {
    let source;
    let stubFetcherJson;
    let stubFetcherArrayBuf;

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(url => Promise.resolve(resources[url]));
        stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
            .callsFake(() => Promise.resolve(new ArrayBuffer()));
        // currently no test on data fetched...

        LASParser.enableLazPerf('./examples/libs/laz-perf');
    });

    after(async function () {
        stubFetcherJson.restore();
        stubFetcherArrayBuf.restore();
        await LASParser.terminate();
    });

    describe('Entwine Point Tile Source', function () {
        describe('data type', function () {
            // TO DO dataType in [laszip, binary, zstandard]
        });
        describe('retrieving crs from srs information', function () {
            it('No srs authority', (done) => {
                source = new EntwinePointTileSource({
                    url: 'withoutAutority',
                });
                source.whenReady
                    .then(() => {
                        assert.equal(source.crs, 'RGF93 v1 / Lambert-93');
                        done();
                    }).catch(done);
            });
            it('With srs authority', (done) => {
                source = new EntwinePointTileSource({
                    url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/entwine',
                });
                source.whenReady
                    .then(() => {
                        assert.equal(source.crs, 'EPSG:3857');
                        done();
                    }).catch(done);
            });
        });
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

        it('tries to update on the root and fails', function (done) {
            layer.update(context, layer, layer.root);
            layer.root.promise
                .then((res) => {
                    assert.ok(res instanceof Error);
                    done();
                }).catch(done);
        });

        it('tries to update on the root and succeeds', function (done) {
            const lookAt = new Vector3();
            const coord = new Coordinates(view.referenceCrs).setFromVector3(layer.root.bbox.getCenter(lookAt));
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
            root.obb.fromBox3(root.bbox);
            root.obb.position = root.obb.center;

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
