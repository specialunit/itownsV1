import * as THREE from 'three';
import assert from 'assert';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
import FeatureProcessing from 'Process/FeatureProcessing';
import TileMesh from 'Core/TileMesh';
import Extent from 'Core/Geographic/Extent';
import { globalExtentTMS } from 'Core/Tile/TileGrid';
import OBB from 'Renderer/OBB';
import DataSourceProvider from 'Provider/DataSourceProvider';
import Fetcher from 'Provider/Fetcher';
import TileProvider from 'Provider/TileProvider';
import WMTSSource from 'Source/WMTSSource';
import WMSSource from 'Source/WMSSource';
import WFSSource from 'Source/WFSSource';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ColorLayer from 'Layer/ColorLayer';
import ElevationLayer from 'Layer/ElevationLayer';
import GeometryLayer from 'Layer/GeometryLayer';
import PlanarLayer from 'Core/Prefab/Planar/PlanarLayer';
import Style from 'Core/Style';
import Feature2Mesh from 'Converter/Feature2Mesh';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';
import { EMPTY_TEXTURE_ZOOM } from 'Renderer/RasterTile';
import sinon from 'sinon';

import holes from '../data/geojson/holesPoints.geojson';

describe('Provide in Sources', function () {
    // TODO We should mock the creation of all layers creation.

    // Misc var to initialize a TileMesh instance
    const geom = new THREE.BufferGeometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const globalExtent = globalExtentTMS.get('EPSG:3857');
    const material = new LayeredMaterial();
    const zoom = 10;
    const sizeTile = globalExtent.planarDimensions().x / 2 ** zoom;
    const extent = new Extent('EPSG:3857', 0, sizeTile, 0, sizeTile);

    let stubFetcherJson;
    let stubFetcherTexture;
    let planarlayer;
    let elevationlayer;
    let colorlayer;
    let nodeLayer;
    let nodeLayerElevation;
    let featureLayer;

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

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(() => Promise.resolve(JSON.parse(holes)));
        stubFetcherTexture = sinon.stub(Fetcher, 'texture')
            .callsFake(() => Promise.resolve(new THREE.Texture()));

        planarlayer = new PlanarLayer('globe', globalExtent, new THREE.Group());
        colorlayer = new ColorLayer('color', { crs: 'EPSG:3857', source: false });
        elevationlayer = new ElevationLayer('elevation', { crs: 'EPSG:3857', source: false });

        planarlayer.attach(colorlayer);
        planarlayer.attach(elevationlayer);

        const fakeNode = { material, setBBoxZ: () => { }, addEventListener: () => { } };
        colorlayer.setupRasterNode(fakeNode);
        elevationlayer.setupRasterNode(fakeNode);

        nodeLayer = material.getColorTile(colorlayer.id);
        nodeLayerElevation = material.getElevationTile();

        featureLayer = new GeometryLayer('geom', new THREE.Group(), {
            crs: 'EPSG:4978',
            mergeFeatures: false,
            zoom: { min: 10 },
            source: false,
            style: new Style({
                fill: {
                    extrusion_height: 5000,
                    color: new THREE.Color(0xffcc00),
                },
            }),
        });
        featureLayer.update = FeatureProcessing.update;
        featureLayer.convert = Feature2Mesh.convert();

        featureLayer.source = new WFSSource({
            url: 'http://domain.com',
            typeName: 'name',
            format: 'application/json',
            extent: globalExtent,
            crs: 'EPSG:3857',
        });

        planarlayer.attach(featureLayer);

        context.elevationLayers = [elevationlayer];
        context.colorLayers = [colorlayer];
    });

    after(function () {
        stubFetcherJson.restore();
        stubFetcherTexture.restore();
    });


    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
    });

    it('should get wmts texture with DataSourceProvider', (done) => {
        colorlayer.source = new WMTSSource({
            url: 'http://domain.com',
            name: 'name',
            format: 'image/png',
            tileMatrixSet: 'PM',
            crs: 'EPSG:3857',
            extent: globalExtent,
            zoom: {
                min: 0,
                max: 12,
            },
        });

        colorlayer.source.onLayerAdded({ out: colorlayer });

        const tile = new TileMesh(geom, material, planarlayer, extent);
        material.visible = true;
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = {};

        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((textures) => {
                assert.equal(textures.length, 1);
                assert.equal(textures[0].isTexture, true);
                done();
            }).catch(done);
    });

    it('should get wmts texture elevation with DataSourceProvider', (done) => {
        elevationlayer.source = new WMTSSource({
            url: 'http://domain.com',
            name: 'name',
            format: 'image/png',
            tileMatrixSet: 'PM',
            crs: 'EPSG:3857',
            zoom: {
                min: 0,
                max: 12,
            },
        });

        elevationlayer.source.onLayerAdded({ out: elevationlayer });
        const tile = new TileMesh(geom, material, planarlayer, extent, zoom);
        material.visible = true;
        nodeLayerElevation.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = {};

        updateLayeredMaterialNodeElevation(context, elevationlayer, tile, tile.parent);
        updateLayeredMaterialNodeElevation(context, elevationlayer, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((textures) => {
                assert.equal(textures.length, 1);
                assert.equal(textures[0].isTexture, true);
                done();
            }).catch(done);
    });

    it('should get wms texture with DataSourceProvider', (done) => {
        colorlayer.source = new WMSSource({
            url: 'http://domain.com',
            name: 'name',
            format: 'image/png',
            extent: globalExtent,
            crs: 'EPSG:3857',
            zoom: {
                min: 0,
                max: 12,
            },
        });
        // May be move in layer Constructor
        colorlayer.source.onLayerAdded({ out: colorlayer });

        const tile = new TileMesh(geom, material, planarlayer, extent, zoom);
        material.visible = true;
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = {};

        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((textures) => {
                assert.equal(textures.length, 1);
                assert.equal(textures[0].isTexture, true);
                done();
            }).catch(done);
    });

    it('should get 4 TileMesh from TileProvider', (done) => {
        const tile = new TileMesh(geom, material, planarlayer, extent, zoom);
        material.visible = true;
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = {};

        planarlayer.subdivideNode(context, tile);
        TileProvider.executeCommand(context.scheduler.commands[0])
            .then((tiles) => {
                assert.equal(tiles.length, 4);
                assert.equal(tiles[0].extent.west, tile.extent.east * 0.5);
                assert.equal(tiles[0].extent.east, tile.extent.east);
                assert.equal(tiles[0].extent.north, tile.extent.north);
                assert.equal(tiles[0].extent.south, tile.extent.north * 0.5);
                done();
            }).catch(done);
    });

    it('should get 3 meshs with WFS source and DataSourceProvider', (done) => {
        const tile = new TileMesh(geom, material, planarlayer, extent, featureLayer.zoom.min);
        material.visible = true;
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = { pendingSubdivision: false };
        featureLayer.mergeFeatures = false;
        tile.layerUpdateState = { test: new LayerUpdateState() };

        featureLayer.source.onLayerAdded({ out: featureLayer });

        featureLayer.update(context, featureLayer, tile);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((features) => {
                assert.equal(features[0].meshes.children.length, 4);
                done();
            }).catch(done);
    });

    it('should get 1 mesh with WFS source and DataSourceProvider and mergeFeatures == true', (done) => {
        const tile = new TileMesh(
            geom,
            material,
            planarlayer,
            extent,
            featureLayer.zoom.min);
        tile.material.visible = true;
        tile.parent = { pendingSubdivision: false };
        featureLayer.source.uid = 8;
        featureLayer.mergeFeatures = true;
        featureLayer.cache.clear();
        featureLayer.source._featuresCaches = {};
        featureLayer.source.onLayerAdded({ out: featureLayer });
        featureLayer.update(context, featureLayer, tile);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((features) => {
                assert.ok(features[0].meshes.children[0].isMesh);
                assert.ok(features[0].meshes.children[1].isPoints);
                assert.equal(features[0].meshes.children[0].children.length, 0);
                assert.equal(features[0].meshes.children[1].children.length, 0);
                done();
            }).catch(done);
    });

    it('should get 1 texture with WFS source and DataSourceProvider', (done) => {
        const tile = new TileMesh(
            geom,
            material,
            planarlayer,
            extent,
            zoom);
        material.visible = true;
        tile.parent = { pendingSubdivision: false };
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.material.visible = true;
        featureLayer.source.uid = 22;
        const colorlayerWfs = new ColorLayer('color', {
            crs: 'EPSG:3857',
            source: featureLayer.source,
            style: {
                fill: {
                    color: 'red',
                    opacity: 0.5,
                },
                stroke: {
                    color: 'white',
                    width: 2.0,
                },
                point: {
                    color: 'white',
                    line: 'green',
                },
            },
        });
        colorlayerWfs.source.onLayerAdded({ out: colorlayerWfs });
        updateLayeredMaterialNodeImagery(context, colorlayerWfs, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, colorlayerWfs, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((textures) => {
                assert.equal(textures.length, 1);
                assert.ok(textures[0].isTexture);
                done();
            }).catch(done);
    });

    it('should get updated RasterLayer', (done) => {
        colorlayer.source = new WMTSSource({
            url: 'http://domain.com',
            name: 'name',
            format: 'image/png',
            tileMatrixSet: 'PM',
            crs: 'EPSG:3857',
            extent: globalExtent,
            zoom: {
                min: 0,
                max: 12,
            },
        });

        const tile = new TileMesh(geom, new LayeredMaterial(), planarlayer, extent);
        tile.material.visible = true;
        nodeLayer.level = EMPTY_TEXTURE_ZOOM;
        tile.parent = {};

        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0])
            .then((result) => {
                tile.material.setColorTileIds([colorlayer.id]);
                tile.material.getColorTile(colorlayer.id).setTextures(result, [new THREE.Vector4()]);
                assert.equal(tile.material.uniforms.colorTextures.value[0].anisotropy, 1);
                tile.material.updateLayersUniforms();
                assert.equal(tile.material.uniforms.colorTextures.value[0].anisotropy, 16);
                done();
            }).catch(done);
    });
});
