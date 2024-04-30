import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import PotreeLayer from 'Layer/PotreeLayer';
import PotreeSource from 'Source/PotreeSource';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import View from 'Core/View';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

const baseurl = 'https://raw.githubusercontent.com/potree/potree/develop/pointclouds/lion_takanawa/';
const fileName = 'cloud.js';

describe('Potree Provider', function () {
    let potreeRRhrc;
    it('fetch test data from https://github.com/potree', async function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        potreeRRhrc = await Fetcher.arrayBuffer(`${baseurl}/data/r/r.hrc`, networkOptions);
    });
    describe('unit tests', function () {
        const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };

        let renderer;
        let view;
        let stubFetcherArrayBuf;

        before(function () {
            stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake(() => Promise.resolve(potreeRRhrc));

            if (!potreeRRhrc) { this.skip(); }

            renderer = new Renderer();
            view = new GlobeView(renderer.domElement, placement, { renderer });
        });
        after(function () {
            stubFetcherArrayBuf.restore();
        });

        describe('cloud information parsing', function _() {
            it('cloud with no normal information', function _it(done) {
            // No normals
                const cloud = {
                    boundingBox: { lx: 10, ly: 20, ux: 30, uy: 40 },
                    tightBoundingBox: { lx: 1, ly: 2, ux: 3, uy: 4 },
                    scale: 1.0,
                    pointAttributes: ['POSITION', 'RGB'],
                    octreeDir: 'data',
                };

                const source = new PotreeSource({
                    file: fileName,
                    url: baseurl,
                    crs: 'EPSG:4978',
                    cloud,
                });

                const layer = new PotreeLayer('pointsCloudNoNormal', { source, crs: view.referenceCrs });
                View.prototype.addLayer.call(view, layer);
                layer.whenReady.then(() => {
                    const normalDefined = layer.material.defines.NORMAL
                        || layer.material.defines.NORMAL_SPHEREMAPPED
                        || layer.material.defines.NORMAL_OCT16;
                    assert.ok(!normalDefined);
                    done();
                }).catch(done);
            });

            it('cloud with normals as vector', function _it(done) {
            // // // // normals as vector
                const cloud = {
                    boundingBox: { lx: 10, ly: 20, ux: 30, uy: 40 },
                    tightBoundingBox: { lx: 1, ly: 2, ux: 3, uy: 4 },
                    scale: 1.0,
                    pointAttributes: ['POSITION', 'NORMAL', 'CLASSIFICATION'],
                    octreeDir: 'data',
                };

                const source = new PotreeSource({
                    file: fileName,
                    url: baseurl,
                    crs: 'EPSG:4978',
                    cloud,
                });

                const layer = new PotreeLayer('pointsCloud2', { source, crs: view.referenceCrs });
                View.prototype.addLayer.call(view, layer);
                layer.whenReady.then(() => {
                    assert.ok(layer.material.defines.NORMAL);
                    assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
                    assert.ok(!layer.material.defines.NORMAL_OCT16);
                    done();
                }).catch(done);
            });

            it('cloud with spheremapped normals', function _it(done) {
            // // spheremapped normals
                const cloud = {
                    boundingBox: { lx: 10, ly: 20, ux: 30, uy: 40 },
                    tightBoundingBox: { lx: 1, ly: 2, ux: 3, uy: 4 },
                    scale: 1.0,
                    pointAttributes: ['POSITION', 'COLOR_PACKED', 'NORMAL_SPHEREMAPPED'],
                    octreeDir: 'data',
                };
                const source = new PotreeSource({
                    file: fileName,
                    url: baseurl,
                    crs: 'EPSG:4978',
                    cloud,
                });
                const layer = new PotreeLayer('pointsCloud3', { source, crs: view.referenceCrs });
                View.prototype.addLayer.call(view, layer);

                layer.whenReady.then(() => {
                    assert.ok(!layer.material.defines.NORMAL);
                    assert.ok(layer.material.defines.NORMAL_SPHEREMAPPED);
                    assert.ok(!layer.material.defines.NORMAL_OCT16);
                    done();
                }).catch(done);
            });

            it('cloud with oct16 normals', function _it(done) {
            // // // oct16 normals
                const cloud = {
                    boundingBox: { lx: 10, ly: 20, ux: 30, uy: 40 },
                    tightBoundingBox: { lx: 1, ly: 2, ux: 3, uy: 4 },
                    scale: 1.0,
                    pointAttributes: ['POSITION', 'COLOR_PACKED', 'CLASSIFICATION', 'NORMAL_OCT16'],
                    octreeDir: 'data',
                };
                const source = new PotreeSource({
                    file: fileName,
                    url: baseurl,
                    cloud,
                    crs: 'EPSG:4978',
                });
                const layer = new PotreeLayer('pointsCloud4', { source, crs: view.referenceCrs });
                View.prototype.addLayer.call(view, layer);

                layer.whenReady
                    .then(() => {
                        assert.ok(!layer.material.defines.NORMAL);
                        assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
                        assert.ok(layer.material.defines.NORMAL_OCT16);
                        done();
                    }).catch(done);
            });
        });
    });
});

describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly no-parent for the root', function () {
        const meta = {
            obj: 'a',
        };
        assert.equal(PotreeLayer.prototype.getObjectToUpdateForAttachedLayers(meta).element, 'a');
    });
    it('should correctly return the element and its parent', function () {
        const meta = {
            obj: 'a',
            parent: {
                obj: 'b',
            },
        };
        const result = PotreeLayer.prototype.getObjectToUpdateForAttachedLayers(meta);
        assert.equal(result.element, 'a');
        assert.equal(result.parent, 'b');
    });
});
