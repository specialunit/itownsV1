import assert from 'assert';
import View from 'Core/View';
import Renderer from './bootstrap';

describe('WebXR', function () {
    let viewer;
    before(async function () {
        const renderer = new Renderer();

        viewer = new View('EPSG:4326', renderer.domElement, {
            renderer,
            webXR: true,
        });
    });

    it('should initialize webXr', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        const sessionEvent = webXRManager.events.get('sessionstart');

        assert.ok(typeof sessionEvent === 'function');
    });

    it('should initialize webXr session', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        assert.ok(webXRManager.enabled === undefined);
        assert.ok(viewer._camXR === undefined);
        webXRManager.dispatchEvent({ type: 'sessionstart' });
        assert.ok(webXRManager.enabled);
        assert.ok(viewer._camXR);
    });
});
