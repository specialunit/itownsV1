import * as THREE from 'three';
import ElevationLayer from 'Layer/ElevationLayer';
import WMTSSource from 'Source/WMTSSource';
import Fetcher from 'Provider/Fetcher';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import { updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
import TileMesh from 'Core/TileMesh';
import OBB from 'Renderer/OBB';
import LayerUpdateState from 'Layer/LayerUpdateState';
import DEMUtils from 'Utils/DEMUtils';
import { RasterElevationTile } from 'Renderer/RasterTile';
import sinon from 'sinon';
import Renderer from './bootstrap';

const BIL_ROWS = 256;
const BIL_COLS = 256;
function createBilData(elevation = 1) {
    return new Float32Array(new Array(BIL_COLS * BIL_ROWS).fill(elevation));
}

describe('DemUtils', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), zoom: 10 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    let elevationlayer;
    let context;
    let stubFetcherTextFloat;
    const ELEVATION = 300;

    before(function () {
        stubFetcherTextFloat = sinon.stub(Fetcher, 'textureFloat')
            .callsFake(() => {
                const floatArray = createBilData(ELEVATION);
                const texture = new THREE.DataTexture(floatArray, 256, 256, THREE.RedFormat, THREE.FloatType);
                texture.internalFormat = 'R32F';
                texture.needsUpdate = false;
                return Promise.resolve(texture);
            });

        const source = new WMTSSource({
            format: 'image/x-bil;bits=32',
            crs: 'EPSG:4326',
            url: 'https://data.geopf.fr/wmts?',
            name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.SRTM3',
            tileMatrixSet: 'WGS84G',
        });
        source.url = 'https://github.com/iTowns/iTowns2-sample-data/blob/master/dem3_3_8.bil?raw=true';
        elevationlayer = new ElevationLayer('worldelevation', { source });

        context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: {
                execute: (command) => {
                    const provider = viewer.mainLoop.scheduler.getProtocolProvider(command.layer.protocol);
                    return provider.executeCommand(command);
                },
            },
            view: viewer,
        };
    });

    after(() => {
        stubFetcherTextFloat.restore();
    });

    it('add elevation layer', (done) => {
        viewer.addLayer(elevationlayer)
            .then((l) => {
                assert.equal('worldelevation', l.id);
                done();
            }).catch(done);
    });
    const tiles = [];
    const extent = new Extent('EPSG:4326', 5.625, 11.25, 45, 50.625);
    const coord = extent.center();

    it('load elevation texture', (done) => {
        const geom = new THREE.BufferGeometry();
        geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
        const material = new THREE.Material();
        const nodeLayer = new RasterElevationTile(material, elevationlayer);
        material.getElevationTile = () => nodeLayer;
        const tile = new TileMesh(geom, material, viewer.tileLayer, extent, 5);
        tile.layerUpdateState[elevationlayer.id] = new LayerUpdateState();
        tiles.push(tile);
        updateLayeredMaterialNodeElevation(context, elevationlayer, tile, {})
            .then(() => {
                assert.equal(nodeLayer.textures[0].image.data[0], ELEVATION);
                done();
            }).catch(done);
    });

    it('get elevation value at center with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation, ELEVATION);
    });

    it('get elevation value at center with FAST_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation, ELEVATION);
    });

    it('get terrain at center with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation.coord.z, ELEVATION);
    });

    it('get terrain at center with FAST_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation.coord.z, ELEVATION);
    });
});

