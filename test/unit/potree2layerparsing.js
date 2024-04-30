import assert from 'assert';
import Potree2Layer from 'Layer/Potree2Layer';
import Potree2Source from 'Source/Potree2Source';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import View from 'Core/View';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Renderer from './bootstrap';

describe('Potree2 Provider', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const view = new GlobeView(renderer.domElement, placement, { renderer });

    it('should correctly parse normal information in metadata', function (done) {
        // No normals
        const metadata = {
            version: '2.0',
            name: 'lion',
            points: 534909153,
            hierarchy: {
                firstChunkSize: 1276,
                stepSize: 4,
                depth: 16,
            },
            offset: [0, 0, 0],
            scale: [1, 1, 1],
            spacing: 24,
            boundingBox: {
                min: [0, 0, 0],
                max: [1, 1, 1],
            },
            encoding: 'BROTLI',
            attributes: [
                {
                    name: 'position',
                    description: '',
                    size: 12,
                    numElements: 3,
                    elementSize: 4,
                    type: 'int32',
                    min: [0, 0, 0],
                    max: [0, 0, 0],
                },
            ],
        };

        const layers = [];
        let source = new Potree2Source({
            file: 'metadata.json',
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            crs: 'EPSG:4978',
            metadata,
        });

        const layer1 = new Potree2Layer('pointsCloud1', { source, crs: view.referenceCrs });
        layers.push(layer1);
        const p1 = layer1.whenReady.then(() => {
            const normalDefined = layer1.material.defines.NORMAL
                || layer1.material.defines.NORMAL_SPHEREMAPPED
                || layer1.material.defines.NORMAL_OCT16;
            assert.ok(!normalDefined);
        });

        // // // normals as vector
        source = new Potree2Source({
            file: 'metadata.json',
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            crs: 'EPSG:4978',
            metadata: {
                version: '2.0',
                name: 'lion',
                points: 534909153,
                hierarchy: {
                    firstChunkSize: 1276,
                    stepSize: 4,
                    depth: 16,
                },
                offset: [0, 0, 0],
                scale: [1, 1, 1],
                spacing: 24,
                boundingBox: {
                    min: [0, 0, 0],
                    max: [1, 1, 1],
                },
                encoding: 'BROTLI',
                attributes: [
                    {
                        name: 'position',
                        description: '',
                        size: 12,
                        numElements: 3,
                        elementSize: 4,
                        type: 'int32',
                        min: [0, 0, 0],
                        max: [0, 0, 0],
                    },
                    {
                        name: 'classification',
                        description: '',
                        size: 1,
                        numElements: 1,
                        elementSize: 1,
                        type: 'uint8',
                        min: [1],
                        max: [2],
                    },
                    {
                        name: 'NORMAL',
                        description: '',
                        size: 3,
                        numElements: 3,
                        elementSize: 1,
                        type: 'int8',
                        min: [-127],
                        max: [127],
                        scale: [1],
                        offset: [0],
                    },
                ],
            },
        });

        const layer2 = new Potree2Layer('pointsCloud2', { source, crs: view.referenceCrs });
        layers.push(layer2);
        const p2 = layer2.whenReady.then(() => {
            assert.ok(layer2.material.defines.NORMAL);
            assert.ok(!layer2.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!layer2.material.defines.NORMAL_OCT16);
        });

        // // spheremapped normals
        source = new Potree2Source({
            file: 'metadata.json',
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            crs: 'EPSG:4978',
            metadata: {
                version: '2.0',
                name: 'lion',
                points: 534909153,
                hierarchy: {
                    firstChunkSize: 1276,
                    stepSize: 4,
                    depth: 16,
                },
                offset: [0, 0, 0],
                scale: [1, 1, 1],
                spacing: 24,
                boundingBox: {
                    min: [0, 0, 0],
                    max: [1, 1, 1],
                },
                encoding: 'BROTLI',
                attributes: [
                    {
                        name: 'position',
                        description: '',
                        size: 12,
                        numElements: 3,
                        elementSize: 4,
                        type: 'int32',
                        min: [0, 0, 0],
                        max: [0, 0, 0],
                    },
                    {
                        name: 'classification',
                        description: '',
                        size: 1,
                        numElements: 1,
                        elementSize: 1,
                        type: 'uint8',
                        min: [1],
                        max: [2],
                    },
                    {
                        name: 'NORMAL_SPHEREMAPPED',
                        description: '',
                        size: 3,
                        numElements: 3,
                        elementSize: 1,
                        type: 'int8',
                        min: [-127],
                        max: [127],
                        scale: [1],
                        offset: [0],
                    },
                ],
            },
        });
        const layer3 = new Potree2Layer('pointsCloud3', { source, crs: view.referenceCrs });

        layers.push(layer3);
        const p3 = layer3.whenReady.then(() => {
            assert.ok(!layer3.material.defines.NORMAL);
            assert.ok(layer3.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!layer3.material.defines.NORMAL_OCT16);
        });

        // // oct16 normals
        source = new Potree2Source({
            file: 'metadata.json',
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            crs: 'EPSG:4978',
            metadata: {
                version: '2.0',
                name: 'lion',
                points: 534909153,
                hierarchy: {
                    firstChunkSize: 1276,
                    stepSize: 4,
                    depth: 16,
                },
                offset: [0, 0, 0],
                scale: [1, 1, 1],
                spacing: 24,
                boundingBox: {
                    min: [0, 0, 0],
                    max: [1, 1, 1],
                },
                encoding: 'BROTLI',
                attributes: [
                    {
                        name: 'position',
                        description: '',
                        size: 12,
                        numElements: 3,
                        elementSize: 4,
                        type: 'int32',
                        min: [0, 0, 0],
                        max: [0, 0, 0],
                    },
                    {
                        name: 'classification',
                        description: '',
                        size: 1,
                        numElements: 1,
                        elementSize: 1,
                        type: 'uint8',
                        min: [1],
                        max: [2],
                    },
                    {
                        name: 'NORMAL_OCT16',
                        description: '',
                        size: 3,
                        numElements: 3,
                        elementSize: 1,
                        type: 'int8',
                        min: [-127],
                        max: [127],
                        scale: [1],
                        offset: [0],
                    },
                ],
            },
        });
        const layer4 = new Potree2Layer('pointsCloud4', { source, crs: view.referenceCrs });

        layers.push(layer4);
        const p4 = layer4.whenReady
            .then(() => {
                assert.ok(!layer4.material.defines.NORMAL);
                assert.ok(!layer4.material.defines.NORMAL_SPHEREMAPPED);
                assert.ok(layer4.material.defines.NORMAL_OCT16);
            });

        layers.forEach(p => View.prototype.addLayer.call(view, p));

        Promise.all([p1, p2, p3, p4])
            .then(() => done())
            .catch(done);
    });
});


describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly no-parent for the root', function () {
        const meta = {
            obj: 'a',
        };
        assert.equal(Potree2Layer.prototype.getObjectToUpdateForAttachedLayers(meta).element, 'a');
    });
    it('should correctly return the element and its parent', function () {
        const meta = {
            obj: 'a',
            parent: {
                obj: 'b',
            },
        };
        const result = Potree2Layer.prototype.getObjectToUpdateForAttachedLayers(meta);
        assert.equal(result.element, 'a');
        assert.equal(result.parent, 'b');
    });
});
