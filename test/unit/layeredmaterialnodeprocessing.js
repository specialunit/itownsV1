import * as THREE from 'three';
import assert from 'assert';
import { updateLayeredMaterialNodeImagery } from 'Process/LayeredMaterialNodeProcessing';
import TileMesh from 'Core/TileMesh';
import Extent from 'Core/Geographic/Extent';
import OBB from 'Renderer/OBB';
import Layer from 'Layer/Layer';
import Source from 'Source/Source';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import { RasterColorTile } from 'Renderer/RasterTile';

describe('updateLayeredMaterialNodeImagery', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.BufferGeometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const extent = new Extent('EPSG:4326', 0, 11.25, 0, 11.25);
    const material = new THREE.Material();

    // Mock scheduler
    const context = {
        view: {
            notifyChange: () => true,
        },
        scheduler: {
            commands: [],
            execute: (cmd) => {
                context.scheduler.commands.push(cmd);
                return new Promise(() => { /* no-op */ });
            },
        },
    };

    const source = new Source({
        url: 'http://',
        crs: 'EPSG:4326',
        extent,
    });

    const layer = new Layer('foo', {
        source,
        crs: 'EPSG:4326',
        info: { update: () => { } },
    });
    layer.tileMatrixSets = [
        'EPSG:4326',
        'EPSG:3857',
    ];
    layer.parent = {
        tileMatrixSets: [
            'EPSG:4326',
            'EPSG:3857',
        ],
    };

    const nodeLayer = new RasterColorTile(material, layer);
    material.getTile = () => nodeLayer;

    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
        // reset default layer state

        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
            options: {},
        };
        layer.visible = true;

        source.extentInsideLimit = () => true;
        source.zoom = { min: 0, max: 10 };
        source.extent = { crs: 'EPSG:4326' };
    });


    it('hidden tile should not execute commands', () => {
        const tile = new TileMesh(geom, material, layer, extent, 0);
        material.visible = false;
        nodeLayer.level = 0;
        tile.parent = {};
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(geom, material, layer, extent, 3);
        material.visible = true;
        nodeLayer.level = 3;
        tile.parent = {};
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(geom, material, layer, extent, 2);
        material.visible = true;
        nodeLayer.level = 1;
        tile.parent = {};

        // FIRST PASS: init Node From Parent and get out of the function
        // without any network fetch
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
        // SECOND PASS: Fetch best texture
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 1);
    });

    it('tile should not request texture with level > layer.source.zoom.max', () => {
        const countTexture = 2 ** 15;
        const newExtent = new Extent('EPSG:4326', 0, 180 / countTexture, 0, 180 / countTexture);
        const tile = new TileMesh(geom, material, layer, newExtent, 15);
        // Emulate a situation where tile inherited a level 1 texture
        material.visible = true;
        nodeLayer.level = 1;
        tile.parent = {};
        source.isWMTSSource = true;
        source.tileMatrixSet = 'WGS84G';
        // Emulate a situation where tile inherited a level 1 texture
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];
        // Since layer is using STRATEGY_MIN_NETWORK_TRAFFIC, we should emit
        // a single command, requesting a texture at layer.source.zoom.max level
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 1);
        assert.equal(
            context.scheduler.commands[0].extentsSource[0].zoom,
            layer.source.zoom.max);
    });
});
