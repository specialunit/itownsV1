import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import { compareWithEpsilon } from './utils';

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds';
const lasUrl = `${baseurl}/data_test.las`;

const url = 'https://github.com/connormanning/copc.js/raw/master/src/test/data';
const lazV14Url = `${url}/ellipsoid-1.4.laz`;

const copcUrl = `${url}/ellipsoid.copc.laz`;

describe('LASParser', function () {
    let lasData;
    let lazV14Data;
    let copcData;
    describe('fetch binaries', function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        it('fetch las data', async function () {
            lasData = await Fetcher.arrayBuffer(lasUrl, networkOptions);
        });
        it('fetch laz data', async function () {
            lazV14Data = await Fetcher.arrayBuffer(lazV14Url, networkOptions);
        });
        it('fetch copc data', async function _it() {
            copcData = await Fetcher.arrayBuffer(copcUrl, networkOptions);
        });
    });

    describe('unit tests', function _describe() {
        const epsilon = 0.1;
        LASParser.enableLazPerf('./examples/libs/laz-perf');

        it('parses a las file to a THREE.BufferGeometry', async function () {
            if (!lasData) { this.skip(); }
            const options = {
                in: {
                    crs: 'EPSG:3857',
                },
                out: {
                    crs: 'EPSG:3857',
                },
            };
            const bufferGeometry = await LASParser.parse(lasData, options);
            const header = bufferGeometry.userData.header;
            const origin = bufferGeometry.userData.origin;
            assert.strictEqual(header.pointCount, 106);
            assert.strictEqual(bufferGeometry.attributes.position.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color, undefined);

            bufferGeometry.computeBoundingBox();
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + origin.x, header.min[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + origin.y, header.min[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + origin.z, header.min[2], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + origin.x, header.max[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + origin.y, header.max[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + origin.z, header.max[2], epsilon));
            await LASParser.terminate();
        });

        it('parses a laz file to a THREE.BufferGeometry', async function () {
            if (!lazV14Data) { this.skip(); }
            const options = {
                in: {
                    crs: 'EPSG:3857',
                },
                out: {
                    crs: 'EPSG:3857',
                },
            };
            const bufferGeometry = await LASParser.parse(lazV14Data, options);
            const header = bufferGeometry.userData.header;
            const origin = bufferGeometry.userData.origin;
            assert.strictEqual(header.pointCount, 100000);
            assert.strictEqual(bufferGeometry.attributes.position.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, header.pointCount);

            bufferGeometry.computeBoundingBox();
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + origin.x, header.min[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + origin.y, header.min[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + origin.z, header.min[2], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + origin.x, header.max[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + origin.y, header.max[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + origin.z, header.max[2], epsilon));
            await LASParser.terminate();
        });

        it('parses a copc chunk to a THREE.BufferGeometry', async function _it() {
            if (!copcData) { this.skip(); }
            const header = {
                fileSignature: 'LASF',
                fileSourceId: 0,
                globalEncoding: 16,
                projectId: '00000000-0000-0000-0000000000000000',
                majorVersion: 1,
                minorVersion: 4,
                systemIdentifier: '',
                generatingSoftware: '',
                fileCreationDayOfYear: 1,
                fileCreationYear: 1,
                headerLength: 375,
                pointDataOffset: 1424,
                vlrCount: 3,
                pointDataRecordFormat: 7,
                pointDataRecordLength: 36,
                pointCount: 100000,
                pointCountByReturn: [
                    50002, 49998, 0, 0,
                    0,     0, 0, 0,
                    0,     0, 0, 0,
                    0,     0, 0,
                ],
                scale: [0.01, 0.01, 0.01],
                offset: [-8242596, 4966606, 0],
                min: [-8242746, 4966506, -50],
                max: [-8242446, 4966706, 50],
                waveformDataOffset: 0,
                evlrOffset: 630520,
                evlrCount: 1,
            };
            const options = {
                in: {
                    pointCount: header.pointCount,
                    header,
                    // eb,
                    crs: 'EPSG:3857',
                },
                out: {
                    crs: 'EPSG:3857',
                },
            };
            const bufferGeometry = await LASParser.parseChunk(copcData, options);

            assert.strictEqual(bufferGeometry.attributes.position.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, header.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, header.pointCount);
            await LASParser.terminate();
        });
    });
});
