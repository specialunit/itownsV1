import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import { compareWithEpsilon } from './utils';

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds';
const lasUrl = `${baseurl}/data_test.las`;

const url = 'https://github.com/connormanning/copc.js/raw/master/src/test/data';
const lazV14Url = `${url}/ellipsoid-1.4.laz`;

describe('LASParser', function () {
    let lasData;
    let lazV14Data;
    it('fetch binaries', async function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        lasData = await Fetcher.arrayBuffer(lasUrl, networkOptions);
        lazV14Data = await Fetcher.arrayBuffer(lazV14Url, networkOptions);
    }).timeout(4000);

    describe('unit tests', function () {
        const epsilon = 0.1;
        LASParser.enableLazPerf('./examples/libs/laz-perf');

        it('parses a las file to a THREE.BufferGeometry', async function () {
            if (!lasData) { this.skip(); }
            const bufferGeometry = await LASParser.parse(lasData);
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
        });

        it('parses a laz file to a THREE.BufferGeometry', async function () {
            if (!lazV14Data) { this.skip(); }
            const bufferGeometry = await LASParser.parse(lazV14Data);
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
        });

        afterEach(async function () {
            await LASParser.terminate();
        });
    });
});
