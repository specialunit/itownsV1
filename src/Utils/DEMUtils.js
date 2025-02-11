import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import placeObjectOnGround from 'Utils/placeObjectOnGround';

const FAST_READ_Z = 0;
const PRECISE_READ_Z = 1;


/**
 * Utility module to retrieve elevation at a given coordinates. The returned
 * value is read in the elevation textures used by the graphics card to render
 * the tiles (globe or plane). This implies that the return value may change
 * depending on the current tile resolution.
 *
 * @module DEMUtils
 */
export default {
    /**
     * Gives the elevation value of a {@link TiledGeometryLayer}, at a specific
     * {@link Coordinates}.
     *
     * @param {TiledGeometryLayer} layer - The tile layer owning the elevation
     * textures we're going to query. This is typically a `GlobeLayer` or
     * `PlanarLayer` (accessible through `view.tileLayer`).
     * @param {Coordinates} coord - The coordinates that we're interested in.
     * @param {number} [method=FAST_READ_Z] - There are two available methods:
     * `FAST_READ_Z` (default) or `PRECISE_READ_Z`. The first one is faster,
     * while the second one is slower but gives better precision.
     * @param {TileMesh[]} [tileHint] - Optional array of tiles to speed up the
     * process. You can give candidates tiles likely to contain `coord`.
     * Otherwise the lookup process starts from the root of `layer`.
     *
     * @return {number} If found, a value in meters is returned; otherwise
     * `undefined`.
     */
    getElevationValueAt(layer, coord, method = FAST_READ_Z, tileHint) {
        const result = _readZ(layer, method, coord, tileHint || layer.level0Nodes);
        if (result) {
            return result.coord.z;
        }
    },

    /**
     * @typedef Terrain
     * @type {Object}
     *
     * @property {Coordinates} coord - Pick coordinate with the elevation in coord.z.
     * @property {THREE.Texture} texture - the picked elevation texture.
     * The texture where the `z` value has been read from
     * @property {TileMesh} tile - the picked tile and the tile containing the texture
     */
    /**
     * Gives a {@link Terrain} object, at a specific {@link Coordinates}. The returned
     * object is as follow:
     * - `coord`, Coordinate, coord.z is the value in meters of the elevation at the coordinates
     * - `texture`, the texture where the `z` value has been read from
     * - `tile`, the tile containing the texture
     * @example
     * // place mesh on the ground
     * const coord = new Coordinates('EPSG:4326', 6, 45);
     * const result = DEMUtils.getTerrainObjectAt(view.tileLayer, coord)
     * mesh.position.copy(result.coord.as(view.referenceCrs));
     * view.scene.add(mesh);
     * mesh.updateMatrixWorld();
     *
     *
     * @param {TiledGeometryLayer} layer - The tile layer owning the elevation
     * textures we're going to query. This is typically a `GlobeLayer` or
     * `PlanarLayer` (accessible through `view.tileLayer`).
     * @param {Coordinates} coord - The coordinates that we're interested in.
     * @param {number} [method=FAST_READ_Z] - There are two available methods:
     * `FAST_READ_Z` (default) or `PRECISE_READ_Z`. The first one is faster,
     * while the second one is slower but gives better precision.
     * @param {TileMesh[]} [tileHint] - Optional array of tiles to speed up the
     * process. You can give candidates tiles likely to contain `coord`.
     * Otherwise the lookup process starts from the root of `layer`.
     * @param {Object} [cache] - Object to cache previous result and speed up the next `getTerrainObjectAt`` use.
     *
     * @return {Terrain} - The {@link Terrain} object.
     */
    getTerrainObjectAt(layer, coord, method = FAST_READ_Z, tileHint, cache) {
        return _readZ(layer, method, coord, tileHint || layer.level0Nodes, cache);
    },
    FAST_READ_Z,
    PRECISE_READ_Z,
    placeObjectOnGround,
};

function tileAt(pt, tile) {
    if (tile.extent) {
        if (!tile.extent.isPointInside(pt)) {
            return undefined;
        }

        for (let i = 0; i < tile.children.length; i++) {
            const t = tileAt(pt, tile.children[i]);
            if (t) {
                return t;
            }
        }
        const tileLayer = tile.material.getElevationTile();
        if (tileLayer && tileLayer.level >= 0) {
            return tile;
        }
        return undefined;
    }
}

let _canvas;
function _readTextureValueAt(metadata, texture, ...uv) {
    for (let i = 0; i < uv.length; i += 2) {
        uv[i] = THREE.MathUtils.clamp(uv[i], 0, texture.image.width - 1);
        uv[i + 1] = THREE.MathUtils.clamp(uv[i + 1], 0, texture.image.height - 1);
    }

    if (texture.image.data) {
        // read a single value
        if (uv.length === 2) {
            const v = texture.image.data[uv[1] * texture.image.width + uv[0]];
            return v != metadata.noDataValue ? v : undefined;
        }
        // or read multiple values
        const result = [];
        for (let i = 0; i < uv.length; i += 2) {
            const v = texture.image.data[uv[i + 1] * texture.image.width + uv[i]];
            result.push(v != metadata.noDataValue ? v : undefined);
        }
        return result;
    } else {
        if (!_canvas) {
            _canvas = document.createElement('canvas');
            _canvas.width = 2;
            _canvas.height = 2;
        }
        let minx = Infinity;
        let miny = Infinity;
        let maxx = -Infinity;
        let maxy = -Infinity;
        for (let i = 0; i < uv.length; i += 2) {
            minx = Math.min(uv[i], minx);
            miny = Math.min(uv[i + 1], miny);
            maxx = Math.max(uv[i], maxx);
            maxy = Math.max(uv[i + 1], maxy);
        }
        const dw = maxx - minx + 1;
        const dh = maxy - miny + 1;
        _canvas.width = Math.max(_canvas.width, dw);
        _canvas.height = Math.max(_canvas.height, dh);

        const ctx = _canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(texture.image, minx, miny, dw, dh, 0, 0, dw, dh);
        const d = ctx.getImageData(0, 0, dw, dh);

        const result = [];
        for (let i = 0; i < uv.length; i += 2) {
            const ox = uv[i] - minx;
            const oy = uv[i + 1] - miny;

            // d is 4 bytes per pixel
            const v = THREE.MathUtils.lerp(
                metadata.colorTextureElevationMinZ,
                metadata.colorTextureElevationMaxZ,
                d.data[4 * oy * dw + 4 * ox] / 255);
            result.push(v != metadata.noDataValue ? v : undefined);
        }
        if (uv.length === 2) {
            return result[0];
        } else {
            return result;
        }
    }
}

function _convertUVtoTextureCoords(texture, u, v) {
    const width = texture.image.width;
    const height = texture.image.height;

    const up = Math.max(0, u * width - 0.5);
    const vp = Math.max(0, v * height - 0.5);

    const u1 = Math.floor(up);
    const u2 = Math.ceil(up);
    const v1 = Math.floor(vp);
    const v2 = Math.ceil(vp);

    const wu = up - u1;
    const wv = vp - v1;

    return { u1, u2, v1, v2, wu, wv };
}

function _readTextureValueNearestFiltering(metadata, texture, vertexU, vertexV) {
    const coords = _convertUVtoTextureCoords(texture, vertexU, vertexV);

    const u = (coords.wu <= 0) ? coords.u1 : coords.u2;
    const v = (coords.wv <= 0) ? coords.v1 : coords.v2;

    return _readTextureValueAt(metadata, texture, u, v);
}

function _lerpWithUndefinedCheck(x, y, t) {
    if (x == undefined) {
        return y;
    } else if (y == undefined) {
        return x;
    } else {
        return THREE.MathUtils.lerp(x, y, t);
    }
}

export function readTextureValueWithBilinearFiltering(metadata, texture, vertexU, vertexV) {
    const coords = _convertUVtoTextureCoords(texture, vertexU, vertexV);

    const [z11, z21, z12, z22] = _readTextureValueAt(metadata, texture,
        coords.u1, coords.v1,
        coords.u2, coords.v1,
        coords.u1, coords.v2,
        coords.u2, coords.v2);


    // horizontal filtering
    const zu1 = _lerpWithUndefinedCheck(z11, z21, coords.wu);
    const zu2 = _lerpWithUndefinedCheck(z12, z22, coords.wu);
    // then vertical filtering
    return _lerpWithUndefinedCheck(zu1, zu2, coords.wv);
}


function _readZFast(layer, texture, uv) {
    const elevationLayer = layer.attachedLayers.filter(l => l.isElevationLayer)[0];
    return _readTextureValueNearestFiltering(elevationLayer, texture, uv.x, uv.y);
}

const bary = new THREE.Vector3();
function _readZCorrect(layer, texture, uv, tileDimensions, tileOwnerDimensions) {
    // We need to emulate the vertex shader code that does 2 thing:
    //   - interpolate (u, v) between triangle vertices: u,v will be multiple of 1/nsegments
    //     (for now assume nsegments == 16)
    //   - read elevation texture at (u, v) for

    // Determine u,v based on the vertices count.
    // 'modulo' is the gap (in [0, 1]) between 2 successive vertices in the geometry
    // e.g if you have 5 vertices, the only possible values for u (or v) are: 0, 0.25, 0.5, 0.75, 1
    // so modulo would be 0.25
    // note: currently the number of segments is hard-coded to 16 (see TileProvider) => 17 vertices
    const modulo = (tileDimensions.x / tileOwnerDimensions.x) / (17 - 1);
    let u = Math.floor(uv.x / modulo) * modulo;
    let v = Math.floor(uv.y / modulo) * modulo;

    if (u == 1) {
        u -= modulo;
    }
    if (v == 1) {
        v -= modulo;
    }

    // Build 4 vertices, 3 of them will be our triangle:
    //    11---21
    //    |   / |
    //    |  /  |
    //    | /   |
    //    21---22
    const u1 = u;
    const u2 = u + modulo;
    const v1 = v;
    const v2 = v + modulo;

    // Our multiple z-value will be weigh-blended, depending on the distance of the real point
    // so lu (resp. lv) are the weight. When lu -> 0 (resp. 1) the final value -> z at u1 (resp. u2)
    const lu = (uv.x - u) / modulo;
    const lv = (uv.y - v) / modulo;


    // Determine if we're going to read the vertices from the top-left or lower-right triangle
    // (low-right = on the line 21-22 or under the diagonal lu = 1 - lv)
    const lowerRightTriangle = (lv == 1) || lu / (1 - lv) >= 1;

    const tri = new THREE.Triangle(
        new THREE.Vector3(u1, v2),
        new THREE.Vector3(u2, v1),
        lowerRightTriangle ? new THREE.Vector3(u2, v2) : new THREE.Vector3(u1, v1));

    // bary holds the respective weight of each vertices of the triangles
    tri.getBarycoord(new THREE.Vector3(uv.x, uv.y), bary);

    const elevationLayer = layer.attachedLayers.filter(l => l.isElevationLayer)[0];

    // read the 3 interesting values
    const z1 = readTextureValueWithBilinearFiltering(elevationLayer, texture, tri.a.x, tri.a.y);
    const z2 = readTextureValueWithBilinearFiltering(elevationLayer, texture, tri.b.x, tri.b.y);
    const z3 = readTextureValueWithBilinearFiltering(elevationLayer, texture, tri.c.x, tri.c.y);

    // Blend with bary
    return z1 * bary.x + z2 * bary.y + z3 * bary.z;
}

const temp = {
    v: new THREE.Vector3(),
    coord1: new Coordinates('EPSG:4978'),
    coord2: new Coordinates('EPSG:4978'),
    offset: new THREE.Vector2(),
};

const dimension = new THREE.Vector2();

function offsetInExtent(point, extent, target = new THREE.Vector2()) {
    if (point.crs != extent.crs) {
        throw new Error(`Unsupported mix: ${point.crs} and ${extent.crs}`);
    }

    extent.planarDimensions(dimension);

    const originX = (point.x - extent.west) / dimension.x;
    const originY = (extent.north - point.y) / dimension.y;

    return target.set(originX, originY);
}

function _readZ(layer, method, coord, nodes, cache) {
    const pt = coord.as(layer.extent.crs, temp.coord1);

    let tileWithValidElevationTexture = null;
    // first check in cache
    if (cache?.tile?.material) {
        tileWithValidElevationTexture = tileAt(pt, cache.tile);
    }
    for (let i = 0; !tileWithValidElevationTexture && i < nodes.length; i++) {
        tileWithValidElevationTexture = tileAt(pt, nodes[i]);
    }

    if (!tileWithValidElevationTexture) {
        // failed to find a tile, abort
        return;
    }

    const tile = tileWithValidElevationTexture;
    const tileLayer = tile.material.getElevationTile();
    const src = tileLayer.textures[0];

    // check cache value if existing
    if (cache) {
        if (cache.id === src.id && cache.version === src.version) {
            return { coord: pt, texture: src, tile };
        }
    }

    // Assuming that tiles are split in 4 children, we lookup the parent that
    // really owns this texture
    const stepsUpInHierarchy = Math.round(Math.log2(1.0 / tileLayer.offsetScales[0].z));
    for (let i = 0; i < stepsUpInHierarchy; i++) {
        tileWithValidElevationTexture = tileWithValidElevationTexture.parent;
    }

    // offset = offset from top-left
    offsetInExtent(pt, tileWithValidElevationTexture.extent, temp.offset);

    // At this point we have:
    //   - tileWithValidElevationTexture.texture.image which is the current image
    //     used for rendering
    //   - offset which is the offset in this texture for the coordinate we're
    //     interested in
    // We now have 2 options:
    //   - the fast one: read the value of tileWithValidElevationTexture.texture.image
    //     at (offset.x, offset.y) and we're done
    //   - the correct one: emulate the vertex shader code
    if (method == PRECISE_READ_Z) {
        pt.z = _readZCorrect(layer, src, temp.offset, tile.extent.planarDimensions(), tileWithValidElevationTexture.extent.planarDimensions());
    } else {
        pt.z = _readZFast(layer, src, temp.offset);
    }

    if (pt.z != undefined) {
        return { coord: pt, texture: src, tile };
    }
}
