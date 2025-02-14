<a name="2.45.0"></a>
# [2.45.0](https://github.com/iTowns/itowns/compare/v2.44.2...v2.45.0) (2025-02-14)


### Features

* **3d-tiles:** support picking of metadata ([031f93e](https://github.com/iTowns/itowns/commit/031f93e))
* **3dtiles:** add deprecation warning to C3DTilesLayer. Use OGC3DTilesLayer instead ([cbfd1bb](https://github.com/iTowns/itowns/commit/cbfd1bb))
* **3dtiles:** add tiles-load-start and tiles-load-end events ([3d89169](https://github.com/iTowns/itowns/commit/3d89169))
* **3dtiles:** update 3d-tiles-renderer to 0.3.39 ([565ba36](https://github.com/iTowns/itowns/commit/565ba36))
* add `enableMeshoptDecoder` function for GLTFs ([3a9784c](https://github.com/iTowns/itowns/commit/3a9784c))
* add publiccode ([#2417](https://github.com/iTowns/itowns/issues/2417)) ([cfb9d0f](https://github.com/iTowns/itowns/commit/cfb9d0f))
* **ci:** bump node to next LTS (v22) ([#2452](https://github.com/iTowns/itowns/issues/2452)) ([8df42d2](https://github.com/iTowns/itowns/commit/8df42d2))
* **controls:** add state controls at view init ([868889f](https://github.com/iTowns/itowns/commit/868889f))
* **controls:** disabled multi actions when zooming ([89bbbd8](https://github.com/iTowns/itowns/commit/89bbbd8))
* deprecate Coordinates constructor with array and vector3 ([efe9c58](https://github.com/iTowns/itowns/commit/efe9c58))
* **eslint:** remove preference for default export ([#2447](https://github.com/iTowns/itowns/issues/2447)) ([4e7bcd2](https://github.com/iTowns/itowns/commit/4e7bcd2))
* **Extent:** add setFromArray and setFromExtent methods ([856bb88](https://github.com/iTowns/itowns/commit/856bb88))
* **globeControls:** zoom on mouse position while using wheel ([85ce178](https://github.com/iTowns/itowns/commit/85ce178))
* **index.html:** auto-redirect to examples ([#2478](https://github.com/iTowns/itowns/issues/2478)) ([1e171ff](https://github.com/iTowns/itowns/commit/1e171ff))
* **MVT:** change mapBox package to mapLib ([b81e8e9](https://github.com/iTowns/itowns/commit/b81e8e9))
* **VectorTile:** add support for relative url in style ([09f7adb](https://github.com/iTowns/itowns/commit/09f7adb))
* **wms:** use proj4 crs axis param ([7d67ec4](https://github.com/iTowns/itowns/commit/7d67ec4))


### Bug Fixes

* **3dtiles:** add layer to object returned by OGC3DTilesLayer.pickObjectsAt ([25467e5](https://github.com/iTowns/itowns/commit/25467e5))
* **3DTiles:** correctly handle all layer config (e.g. layer name) ([0acb0a4](https://github.com/iTowns/itowns/commit/0acb0a4))
* **babel:** include ts files in prerequisites ([eb73b45](https://github.com/iTowns/itowns/commit/eb73b45))
* **C3DTilesLayer:** updateStyle works with new style API ([a4f0d22](https://github.com/iTowns/itowns/commit/a4f0d22))
* **COG:** Fix extent in COG parser ([452ca7e](https://github.com/iTowns/itowns/commit/452ca7e))
* **Crs:** correctly renamed reasonableEpsilon function ([205c27f](https://github.com/iTowns/itowns/commit/205c27f))
* **crs:** fix proj4 unit 'meter' and add 'foot' ([07c3f63](https://github.com/iTowns/itowns/commit/07c3f63))
* **doc:** fix doc generation error ([fc2d3ab](https://github.com/iTowns/itowns/commit/fc2d3ab))
* **examples:** add envmap for PBR materials in 3d tiles loader example ([8b22591](https://github.com/iTowns/itowns/commit/8b22591))
* **examples:** fix linked with zoom properties well used ([d947233](https://github.com/iTowns/itowns/commit/d947233))
* **fetcher:** improve image loading error log ([dc347d1](https://github.com/iTowns/itowns/commit/dc347d1))
* **GlobeView:** remove default directional light ([0a098af](https://github.com/iTowns/itowns/commit/0a098af))
* **i3dm:** use instanceId to get info ([683e55d](https://github.com/iTowns/itowns/commit/683e55d))
* **LabelLayer:** gestion simplified of line and polygon Label ([cb3c3b7](https://github.com/iTowns/itowns/commit/cb3c3b7))
* **Label:** Multiple labels with same textContent ([a2cfd3a](https://github.com/iTowns/itowns/commit/a2cfd3a))
* **MVTLayers:** add MVTLayer where MVTStyle.layer has 'ref' properties ([497ac8c](https://github.com/iTowns/itowns/commit/497ac8c))
* **MVTParser:** supp use of layer.style.zoom in parser ([6b0e287](https://github.com/iTowns/itowns/commit/6b0e287))
* **MVTStyle:** Doing recoloring only with sdf icons. ([11d10ea](https://github.com/iTowns/itowns/commit/11d10ea))
* **MVTStyle:** icon properties -> fix return of function when id includes {} ([fffecc9](https://github.com/iTowns/itowns/commit/fffecc9))
* **OGC3DTilesLayer:** handle multiple views ([#2435](https://github.com/iTowns/itowns/issues/2435)) ([b991878](https://github.com/iTowns/itowns/commit/b991878))
* **PointCloudLayer:** use the User value for ElevationRange (if present) ([387d64f](https://github.com/iTowns/itowns/commit/387d64f))
* **publiccode.yml:** fix the logo URL ([822c63b](https://github.com/iTowns/itowns/commit/822c63b))
* **source:** support urls already containing query parameters for wms, wmts, and wfs ([4f53025](https://github.com/iTowns/itowns/commit/4f53025))
* **Style:** cropValueDefault ([fe68e41](https://github.com/iTowns/itowns/commit/fe68e41))
* **Style:** Don't draw Polygon when fill.color is undefined ([21b0900](https://github.com/iTowns/itowns/commit/21b0900))
* **Style:** Don't draw stroke when width is 0 ([b8a13d9](https://github.com/iTowns/itowns/commit/b8a13d9))
* **Style:** dont draw icon when size is 0 ([858b89e](https://github.com/iTowns/itowns/commit/858b89e))
* **Style:** take style.zoom into account for LabelLayer and Feature2Texture ([5ec037b](https://github.com/iTowns/itowns/commit/5ec037b))
* **Terrain:** fix terrain subdivision when a terrain tile only has values that should be clamped ([cb96727](https://github.com/iTowns/itowns/commit/cb96727))
* **test:** fix local unit tests behind proxy ([9b9d52a](https://github.com/iTowns/itowns/commit/9b9d52a))
* **test:** increase time out ([bfdebca](https://github.com/iTowns/itowns/commit/bfdebca))
* **tests:** re set --no-sandbox ([c4629d6](https://github.com/iTowns/itowns/commit/c4629d6))
* **test:** tempory disable clamp ground test because data server is down ([4ee3c7f](https://github.com/iTowns/itowns/commit/4ee3c7f))
* **TileBuilder:** use cached buffers correctly ([#2491](https://github.com/iTowns/itowns/issues/2491)) ([f3d2e90](https://github.com/iTowns/itowns/commit/f3d2e90))
* **TiledGeometryLayer:** remove subdivision checking code ([#2344](https://github.com/iTowns/itowns/issues/2344)) ([e386637](https://github.com/iTowns/itowns/commit/e386637))
* **TiledGeometryLayer:** replace get data by the new getPropertyArray ([ec665c3](https://github.com/iTowns/itowns/commit/ec665c3))
* **TiledGeometryLayer:** set autoRefreshToken to true ([ebf37dd](https://github.com/iTowns/itowns/commit/ebf37dd))
* **VectorTile:** fix {z}/{y}/{x} ([9250fd8](https://github.com/iTowns/itowns/commit/9250fd8))
* **VectorTile:** supp order in Style as it's only a Label properties in VT ([3dc135e](https://github.com/iTowns/itowns/commit/3dc135e))
* **wms:** assign axis order param from source ([aec3ebf](https://github.com/iTowns/itowns/commit/aec3ebf))
* **wms:** take wms 1.1.1 version into account for axis order ([0499f95](https://github.com/iTowns/itowns/commit/0499f95))
* **xbilparser:** apply zmin / zmax for any texture subsampling size ([745ab2c](https://github.com/iTowns/itowns/commit/745ab2c))
* **Zoom:** use zoom state ([426fe29](https://github.com/iTowns/itowns/commit/426fe29))


### Examples

* **3DTiles:** create an only 3D tiles example that can load any 3D tiles ([3eb7a23](https://github.com/iTowns/itowns/commit/3eb7a23))
* **MVT:** add example with official MapBox style file ([d1abe5a](https://github.com/iTowns/itowns/commit/d1abe5a))
* **PointCloud:** fix errors ([8dc71f9](https://github.com/iTowns/itowns/commit/8dc71f9))


### Code Refactoring

* **cache:** use LRUCache instead of own cache ([6d12fde](https://github.com/iTowns/itowns/commit/6d12fde))
* **CopcSource:** use metadata.wkt to set source.crs ([69ed2f4](https://github.com/iTowns/itowns/commit/69ed2f4))
* **Crs:** cleanup unit handling ([ea397ee](https://github.com/iTowns/itowns/commit/ea397ee))
* **Crs:** remove tms/epsg family of functions ([83eb0d9](https://github.com/iTowns/itowns/commit/83eb0d9))
* **Crs:** rename toUnit to getUnit ([2fdf15a](https://github.com/iTowns/itowns/commit/2fdf15a))
* **Crs:** use named exports instead of default export ([fca5a29](https://github.com/iTowns/itowns/commit/fca5a29))
* **entwineSource:** read crs from metadata.srs ([1ecc6aa](https://github.com/iTowns/itowns/commit/1ecc6aa))
* **Layer:** remove Object.assign of config ([cf41e8d](https://github.com/iTowns/itowns/commit/cf41e8d))
* migrate Coordinates to typescript ([ec79573](https://github.com/iTowns/itowns/commit/ec79573))
* migrate Crs to typescript ([d884ba6](https://github.com/iTowns/itowns/commit/d884ba6))
* migrate Ellipsoid to typescript ([a3fb6c5](https://github.com/iTowns/itowns/commit/a3fb6c5))
* migrate Extent to typescript ([1c41e93](https://github.com/iTowns/itowns/commit/1c41e93))
* migrate Tile to typescript ([ac93bfd](https://github.com/iTowns/itowns/commit/ac93bfd))
* **MVTParser:** 1 feature per vtfeature ([25db866](https://github.com/iTowns/itowns/commit/25db866))
* **PointCloudLayer:** delete onPointsCreated callback ([628ed94](https://github.com/iTowns/itowns/commit/628ed94))
* **PointCloudLayer:** promise.catch/finally instead of then(CallBack, errCallBack) ([b2bcb7f](https://github.com/iTowns/itowns/commit/b2bcb7f))
* split Extent between geographic/tiled ([4b57498](https://github.com/iTowns/itowns/commit/4b57498))
* **StyleOptions:** move StyleOptions from Style to its own file ([fdd2bd9](https://github.com/iTowns/itowns/commit/fdd2bd9))
* **test:** change timeout ([327b914](https://github.com/iTowns/itowns/commit/327b914))
* **TileBuilder:** migrate to TypeScript ([#2440](https://github.com/iTowns/itowns/issues/2440)) ([3207dcd](https://github.com/iTowns/itowns/commit/3207dcd))
* URLBuilder as pure functions ([8ba1376](https://github.com/iTowns/itowns/commit/8ba1376))
* **VectorTileParser:** cleanup ([fdf4b0a](https://github.com/iTowns/itowns/commit/fdf4b0a))


### Workflow and chores

* release v2.45.0 ([5b359d2](https://github.com/iTowns/itowns/commit/5b359d2))
* **3dtiles:** add more unit tests ([a923f1f](https://github.com/iTowns/itowns/commit/a923f1f))
* **architecture:** monorepo structure ([3103718](https://github.com/iTowns/itowns/commit/3103718))
* **Crs:** update and refine documentation ([d467a29](https://github.com/iTowns/itowns/commit/d467a29))
* **deps-dev:** bump undici from 7.2.0 to 7.2.3 ([f01365d](https://github.com/iTowns/itowns/commit/f01365d))
* **deps:** bump [@tweenjs](https://github.com/tweenjs)/tween.js from 23.1.2 to 25.0.0 ([63e2194](https://github.com/iTowns/itowns/commit/63e2194))
* **deps:** bump 3d-tiles-renderer from 0.3.37 to 0.3.38 ([837c044](https://github.com/iTowns/itowns/commit/837c044))
* **deps:** bump 3d-tiles-renderer from 0.3.39 to 0.4.4 ([e75fbb8](https://github.com/iTowns/itowns/commit/e75fbb8))
* **deps:** bump cookie and express ([f602ac7](https://github.com/iTowns/itowns/commit/f602ac7))
* **deps:** bump developer dependencies ([4d034b5](https://github.com/iTowns/itowns/commit/4d034b5))
* **deps:** bump nanoid from 3.3.7 to 3.3.8 ([09a016f](https://github.com/iTowns/itowns/commit/09a016f))
* **deps:** bump proj4 from 2.11.0 to 2.12.1 ([804c65f](https://github.com/iTowns/itowns/commit/804c65f))
* **deps:** bump shpjs from 6.0.1 to 6.1.0 ([4937064](https://github.com/iTowns/itowns/commit/4937064))
* **deps:** bump three from 0.165.0 to 0.168.0 ([f7303de](https://github.com/iTowns/itowns/commit/f7303de))
* **deps:** bump three from 0.168.0 to 0.170.0 ([ffe89c7](https://github.com/iTowns/itowns/commit/ffe89c7))
* **deps:** remove node-fetch from dev dependencies ([1d9ffe9](https://github.com/iTowns/itowns/commit/1d9ffe9))
* **Ellipsoid:** add method return types ([fe189be](https://github.com/iTowns/itowns/commit/fe189be))
* **eslint:** add no-use-before-define and change max-len rules ([f8021b4](https://github.com/iTowns/itowns/commit/f8021b4))
* **eslint:** update config to support TypeScript ([0d6b611](https://github.com/iTowns/itowns/commit/0d6b611))
* **Extent:** deprecate array and extent constructor parameters ([1d72b64](https://github.com/iTowns/itowns/commit/1d72b64))
* **Extent:** remove deprecated methods ([5d0c8d8](https://github.com/iTowns/itowns/commit/5d0c8d8))
* remove istanbul and editor comments ([#2479](https://github.com/iTowns/itowns/issues/2479)) ([c975752](https://github.com/iTowns/itowns/commit/c975752))
* update babel and webpack configs to support TypeScript ([8830d6d](https://github.com/iTowns/itowns/commit/8830d6d))
* update vulnerable dev dependencies ([b95035b](https://github.com/iTowns/itowns/commit/b95035b))


### Documentation

* **contributors:** add Tim Ebben ([b65d8ae](https://github.com/iTowns/itowns/commit/b65d8ae))
* **Coordinates:** update and refine documentation ([6cb7416](https://github.com/iTowns/itowns/commit/6cb7416))
* **Ellipsoid:** update and refine documentation ([f922530](https://github.com/iTowns/itowns/commit/f922530))
* **Extent:** update and refine documentation ([965c2ea](https://github.com/iTowns/itowns/commit/965c2ea))
* **test:** update command to run one functional test ([c862ca7](https://github.com/iTowns/itowns/commit/c862ca7))
* **Tile:** update and refine documentation ([bb69004](https://github.com/iTowns/itowns/commit/bb69004))


### Tests

* **lasparser:** add test for parseChunk ([50a17a6](https://github.com/iTowns/itowns/commit/50a17a6))
* **VectorTileSource:** fix test ([a80b95f](https://github.com/iTowns/itowns/commit/a80b95f))


### BREAKING CHANGES

* **cache:** - remove Source#onParsedFile callback
* **Extent:** - Deprecate Extent#constructor with array and extent parameters
- Deprecate Extent#set with array and extent parameters
* **Extent:** - Remove deprecated Extent#dimensions method
* **Crs:** CRS.isEPSG and CRS.isTMS have been removed
* **Crs:** CRS.formatToESPG and CRS.formatToTMS have been removed
* **Crs:** CRS.toUnit renamed to CRS.getUnit
* **Crs:** CRS.reasonnableEspsilon renamed to CRS.reasonableEpsilon
* **controls:** disabled multi actions when zooming



<a name="2.44.2"></a>
## [2.44.2](https://github.com/iTowns/itowns/compare/v2.44.1...v2.44.2) (2024-09-17)


### Bug Fixes

* **3dtiles:** support point cloud attenuated mode in OGC3DTiles layer ([afcb250](https://github.com/iTowns/itowns/commit/afcb250))
* **exampleCOPC:** fix elevation behavior ([95d2194](https://github.com/iTowns/itowns/commit/95d2194))
* **PointCloud:** Fix clipping point cloud ([2019826](https://github.com/iTowns/itowns/commit/2019826))
* **pointcloud:** Fix point cloud distance to camera whatever point cloud initial placement is ([ff9a86a](https://github.com/iTowns/itowns/commit/ff9a86a))


### Workflow and chores

* release v2.44.2 ([f785666](https://github.com/iTowns/itowns/commit/f785666))
* **deps:** bump actions/download-artifact in /.github/workflows ([8e872be](https://github.com/iTowns/itowns/commit/8e872be))
* **deps:** bump body-parser and express ([a01de04](https://github.com/iTowns/itowns/commit/a01de04))
* fix dependency vulnerabilities ([29dfc60](https://github.com/iTowns/itowns/commit/29dfc60))


### Documentation

* remove empty class used for documentation ([9479973](https://github.com/iTowns/itowns/commit/9479973))
* rewrite some docs to follow jsdoc semantics ([cbb1b96](https://github.com/iTowns/itowns/commit/cbb1b96))



<a name="2.44.1"></a>
## [2.44.1](https://github.com/iTowns/itowns/compare/v2.44.0...v2.44.1) (2024-09-06)


### Bug Fixes

* **tutorials:** use OGC3DTilesLayer in 3d tiles tutorials ([e345979](https://github.com/iTowns/itowns/commit/e345979))


### Workflow and chores

* release v2.44.1 ([fc7f8e9](https://github.com/iTowns/itowns/commit/fc7f8e9))



<a name="2.44.0"></a>
# [2.44.0](https://github.com/iTowns/itowns/compare/v2.43.1...v2.44.0) (2024-09-02)


### Features

* **3dtiles:** add new OGC3DTilesLayer using 3d-tiles-renderer-js ([a2fedd8](https://github.com/iTowns/itowns/commit/a2fedd8))
* Add support for Cloud Optimized Point Clouds (COPC) ([f1e014f](https://github.com/iTowns/itowns/commit/f1e014f))
* **COG:** Allow tileWidth, tileHeight & resampleMethod parameter ([24ab82f](https://github.com/iTowns/itowns/commit/24ab82f))
* **deps:** bump proj4 from 2.9.2 to 2.11.0 ([7962fdc](https://github.com/iTowns/itowns/commit/7962fdc))
* **deps:** bump three from 0.159.0 to 0.165.0 ([258adc6](https://github.com/iTowns/itowns/commit/258adc6))
* **examples:** add COPC url loader ([6b4a5f2](https://github.com/iTowns/itowns/commit/6b4a5f2))
* introducing workers for LAS parser ([0505297](https://github.com/iTowns/itowns/commit/0505297))
* **LasParser:** add parsing of chunks of LAS files ([eec3197](https://github.com/iTowns/itowns/commit/eec3197))
* **potree2:** Add potree 2.0 loader ([ee56ec7](https://github.com/iTowns/itowns/commit/ee56ec7))


### Bug Fixes

* **3dTilesLayer:** fix transparency for 3dTilesLayer ([af4d061](https://github.com/iTowns/itowns/commit/af4d061))
* **C3DTFeature:** use correct interleaved buffer getter ([#2326](https://github.com/iTowns/itowns/issues/2326)) ([6e20fcb](https://github.com/iTowns/itowns/commit/6e20fcb))
* **COG:** Fix AggregateError (retry if error occur) ([038dedd](https://github.com/iTowns/itowns/commit/038dedd))
* **COG:** Fix COG example ([aaa9691](https://github.com/iTowns/itowns/commit/aaa9691))
* **COG:** Fix COG levels parsing ([921bc03](https://github.com/iTowns/itowns/commit/921bc03))
* **COG:** Fix selectLevel (incorrect level selection when source extent is huge) ([809a4ad](https://github.com/iTowns/itowns/commit/809a4ad))
* **COG:** Fix texture width & height (use source.tileWidth & source.tileHeight) ([e03caf5](https://github.com/iTowns/itowns/commit/e03caf5))
* **deps:** update babel and add [@babel](https://github.com/babel)/core dependency ([77fd215](https://github.com/iTowns/itowns/commit/77fd215))
* **entwine:** change transparency settings ([47f859d](https://github.com/iTowns/itowns/commit/47f859d))
* **example:** change klokantech url in 3dtile_ion.html ([14891fd](https://github.com/iTowns/itowns/commit/14891fd))
* **MVT:** add texture and subdivision size parameter ([f286b40](https://github.com/iTowns/itowns/commit/f286b40))
* **parser:** wrong shpjs 6.0.1 using ([755ae17](https://github.com/iTowns/itowns/commit/755ae17))
* **PointCloud:** Allow using custom object3d on PointCloudLayer ([2b81710](https://github.com/iTowns/itowns/commit/2b81710))
* **PointCloud:** fix after pr feedback ([19c0e65](https://github.com/iTowns/itowns/commit/19c0e65))
* **pointcloud:** fix non-world projected elevation ([58fc8bb](https://github.com/iTowns/itowns/commit/58fc8bb))
* **PointCloud:** use preSSE for C3DTilesLayer ([8654ccb](https://github.com/iTowns/itowns/commit/8654ccb))
* **PointsMaterial.js:** Allow transparency when any class is invisible ([d091207](https://github.com/iTowns/itowns/commit/d091207))
* **points:** support point classification up to 256 classes ([170f220](https://github.com/iTowns/itowns/commit/170f220))
* **points:** use param classificationScheme in 3DTiles ([eeef84d](https://github.com/iTowns/itowns/commit/eeef84d))
* **potree2:** Fix options request issue with raw.githubusercontent.com data source ([9abdeed](https://github.com/iTowns/itowns/commit/9abdeed))
* **potree2:** Fix sample data url ([d5ee112](https://github.com/iTowns/itowns/commit/d5ee112))
* **scheduler:** ignore invalid URLs ([c3a67a3](https://github.com/iTowns/itowns/commit/c3a67a3))
* **shader:** Remove early discard based on vcolor ([16cbbbf](https://github.com/iTowns/itowns/commit/16cbbbf))
* **test-functional:** fixes on hooks_functional.js ([bc41708](https://github.com/iTowns/itowns/commit/bc41708))
* **test:** fetcher.js augment timeout limit ([5668334](https://github.com/iTowns/itowns/commit/5668334))
* **test:** fix change on id for test functional ([3780c56](https://github.com/iTowns/itowns/commit/3780c56))
* **test:** import HttpsProxyAgent ([624880d](https://github.com/iTowns/itowns/commit/624880d))
* **TiledGeometryLayer:** add hideSkirt unit test ([3738a06](https://github.com/iTowns/itowns/commit/3738a06))
* **TiledGeometryLayer:** handle hideSkirt at creation ([0fa08cd](https://github.com/iTowns/itowns/commit/0fa08cd))
* **VectorTile:** fix Style.setFromVectorTileLayer() when icon.id with {xx} or/and .stops ([85e49a1](https://github.com/iTowns/itowns/commit/85e49a1))


### Examples

* **COG:** Set maxSubdivisionLevel to 10 (default is 5) ([1de7124](https://github.com/iTowns/itowns/commit/1de7124))


### Code Refactoring

* **3dTilesDebug:** add properties hasPnts for pnts fields in GUI ([ff0ff3d](https://github.com/iTowns/itowns/commit/ff0ff3d))
* **3dTiles:** supp unused parameter in debug set up ([5bf62f2](https://github.com/iTowns/itowns/commit/5bf62f2))
* move loaders with little to no dependency to own directory ([1bca2e3](https://github.com/iTowns/itowns/commit/1bca2e3))
* **PointCloudDebug:** fix SizeMode gui ([bf87dd6](https://github.com/iTowns/itowns/commit/bf87dd6))
* **points:** material as superset of three PointsMaterial ([63af9e2](https://github.com/iTowns/itowns/commit/63af9e2))
* **points:** remove compressed normal support in material ([24b3641](https://github.com/iTowns/itowns/commit/24b3641))
* **points:** remove support of oriented images ([c93a2cd](https://github.com/iTowns/itowns/commit/c93a2cd))
* **PotreeDebug:** rename PotreeDebug to PointCloudDebug ([d1eb374](https://github.com/iTowns/itowns/commit/d1eb374))
* **style:** clean up style and test/style.js ([982b908](https://github.com/iTowns/itowns/commit/982b908))
* **test-functional:** reworks on hooks-functional.js: better gestion of errors and save initial camera position only once ([488d6a1](https://github.com/iTowns/itowns/commit/488d6a1))
* **test:** setFromVectorTileLayer() with icon ([565472b](https://github.com/iTowns/itowns/commit/565472b))


### Workflow and chores

* release v2.44.0 ([d667129](https://github.com/iTowns/itowns/commit/d667129))
* add threads dependency for web workers ([1976481](https://github.com/iTowns/itowns/commit/1976481))
* **babel:** modernize config and clean webpack ([048eaec](https://github.com/iTowns/itowns/commit/048eaec))
* **CONTRIBUTORS.md:** add name ([ad67a6b](https://github.com/iTowns/itowns/commit/ad67a6b))
* **deps-dev:** bump braces from 3.0.2 to 3.0.3 ([936bc22](https://github.com/iTowns/itowns/commit/936bc22))
* **deps-dev:** bump webpack from 5.93.0 to 5.94.0 ([9b59bd3](https://github.com/iTowns/itowns/commit/9b59bd3))
* **deps:** bump [@mapbox](https://github.com/mapbox)/vector-tile from 1.3.1 to 2.0.3 ([de9d16c](https://github.com/iTowns/itowns/commit/de9d16c))
* **deps:** bump [@tweenjs](https://github.com/tweenjs)/tween.js from 18.6.4 to 23.1.2 ([52c0b6c](https://github.com/iTowns/itowns/commit/52c0b6c))
* **deps:** bump developer dependencies ([ff70c47](https://github.com/iTowns/itowns/commit/ff70c47))
* **deps:** bump earcut from 2.2.4 to 3.0.0 ([620e91c](https://github.com/iTowns/itowns/commit/620e91c))
* **deps:** bump pbf from 3.2.1 to 4.0.1 ([544b4a7](https://github.com/iTowns/itowns/commit/544b4a7))
* **deps:** bump shpjs from 4.0.4 to 6.0.1 ([7c904ff](https://github.com/iTowns/itowns/commit/7c904ff))
* **deps:** bump ws and puppeteer ([02d141f](https://github.com/iTowns/itowns/commit/02d141f))
* **deps:** remove unused marked devDependencies ([0c4d101](https://github.com/iTowns/itowns/commit/0c4d101))
* **devDeps:** remove unused babel-register-esm ([43a3c14](https://github.com/iTowns/itowns/commit/43a3c14))
* **eslint:** use babel resolver instead of webpack ([4c98e9e](https://github.com/iTowns/itowns/commit/4c98e9e))
* **issues:** update issue templates ([e6bc462](https://github.com/iTowns/itowns/commit/e6bc462))
* **test:** add web worker polyfill ([cec42ad](https://github.com/iTowns/itowns/commit/cec42ad))
* use node hooks to fix coverage issues ([50e785c](https://github.com/iTowns/itowns/commit/50e785c))


### Documentation

* Add link to governance repo in the README ([d3a317b](https://github.com/iTowns/itowns/commit/d3a317b))
* **COPC:** expose doc for COPCLayer and COPCSource ([48fb9df](https://github.com/iTowns/itowns/commit/48fb9df))


### BREAKING CHANGES

* **points:** * Remove overlayColor property (replaced by the standard diffuse property)
* **points:** * Remove non-tested and non-documented orientedImageMaterial property



<a name="2.43.1"></a>
## [2.43.1](https://github.com/iTowns/itowns/compare/v2.43.0...v2.43.1) (2024-04-30)


### Bug Fixes

* **LASLoader:** fix default CDN URL ([4d029ef](https://github.com/iTowns/itowns/commit/4d029ef))
* **PointCloud:** correct some issues after refacto ([65c4008](https://github.com/iTowns/itowns/commit/65c4008))


### Workflow and chores

* release v2.43.1 ([719d9e3](https://github.com/iTowns/itowns/commit/719d9e3))



<a name="2.43.0"></a>
# [2.43.0](https://github.com/iTowns/itowns/compare/v2.42.0...v2.43.0) (2024-04-02)


### Features

* ESM distribution ([ab36885](https://github.com/iTowns/itowns/commit/ab36885))
* **gltf:** add a GLTFParser to parse gltf 1.0 and 2.0 files ([e6eb4cf](https://github.com/iTowns/itowns/commit/e6eb4cf))
* Remove WebGL1 support ([5bd5c32](https://github.com/iTowns/itowns/commit/5bd5c32))
* **TiledGeometryLayer:** layer can now hide skirt ([06c7181](https://github.com/iTowns/itowns/commit/06c7181))
* **VectorTileSource:** add support for multiple source ([c51e64a](https://github.com/iTowns/itowns/commit/c51e64a))


### Bug Fixes

* **3dtiles:** fix tiles disappearing when zooming in and out ([c04e784](https://github.com/iTowns/itowns/commit/c04e784))
* **elevation:** Fix elevation layer removal from view ([4f361c3](https://github.com/iTowns/itowns/commit/4f361c3))
* **example:** migrate sources to IGN geoplateforme ([f6baf69](https://github.com/iTowns/itowns/commit/f6baf69))
* **examples:** fix new IGN VT style url ([17124ec](https://github.com/iTowns/itowns/commit/17124ec))
* **examples:** fix some issues with entwine planar example ([7d05a0f](https://github.com/iTowns/itowns/commit/7d05a0f))
* **examples:** migrate ign and grandlyon urls ([3f3ed82](https://github.com/iTowns/itowns/commit/3f3ed82))
* **Feature2Mesh:** fix proj on base alti ([49e48b5](https://github.com/iTowns/itowns/commit/49e48b5))
* **PointCloud:** fix precision error for entwinePointTileLayer ([bf38a72](https://github.com/iTowns/itowns/commit/bf38a72))
* **PotreeDebug:** fix oversight ([e5810d7](https://github.com/iTowns/itowns/commit/e5810d7))
* **RasterTile:** Fix RasterTile removeEvent when view.dispose is called ([33d0e8d](https://github.com/iTowns/itowns/commit/33d0e8d))
* **tutorials:** migrate urls to IGN geoplateforme ([5d324ca](https://github.com/iTowns/itowns/commit/5d324ca))


### Performance Improvements

* **3dtiles:** fix loading time overhead due to internal structures pre-filling ([5d2f384](https://github.com/iTowns/itowns/commit/5d2f384))


### Examples

* **ept:** Allow navigation on the pointcloud ([ec7ae6c](https://github.com/iTowns/itowns/commit/ec7ae6c))


### Code Refactoring

* **babelrc:** add geojson and remove gltf from import extension ([dd3f80d](https://github.com/iTowns/itowns/commit/dd3f80d))
* **example:** entwine_simple_loader add use of param in url ([89d6fbd](https://github.com/iTowns/itowns/commit/89d6fbd))
* **Fetcher:** supp extent in parsed file ([1240db6](https://github.com/iTowns/itowns/commit/1240db6))
* **PointCloudLayer:** add new scheme and gradients to generate texture for use in the shader ([a557914](https://github.com/iTowns/itowns/commit/a557914))
* **source:** supp supportedFetchers and add Fetcher.get(format) ([9fa4cde](https://github.com/iTowns/itowns/commit/9fa4cde))
* **test:** add CanvasGradient in bootstrap.js ([99be96e](https://github.com/iTowns/itowns/commit/99be96e))
* **test:** add tests for Fetcher.js ([2fb3298](https://github.com/iTowns/itowns/commit/2fb3298))
* **test:** unit test clean up ([f6b6bf4](https://github.com/iTowns/itowns/commit/f6b6bf4))
* **test:** use sinon for multisource ([3b0709b](https://github.com/iTowns/itowns/commit/3b0709b))
* **unitTests:** use sinon to mock hidden itowns.Fetcher and add json file localy ([9dcfed3](https://github.com/iTowns/itowns/commit/9dcfed3))


### Workflow and chores

* release v2.43.0 ([066e4e5](https://github.com/iTowns/itowns/commit/066e4e5))
* **coverage:** replace nyc by c8 ([f55ee06](https://github.com/iTowns/itowns/commit/f55ee06))
* **deps-dev:** bump express from 4.18.2 to 4.19.2 ([9be39b7](https://github.com/iTowns/itowns/commit/9be39b7))
* **deps-dev:** bump follow-redirects from 1.15.4 to 1.15.6 ([3163f5f](https://github.com/iTowns/itowns/commit/3163f5f))
* **deps-dev:** bump ip from 1.1.8 to 1.1.9 ([5d84b37](https://github.com/iTowns/itowns/commit/5d84b37))
* **deps-dev:** bump webpack-dev-middleware from 5.3.3 to 5.3.4 ([d53c1a5](https://github.com/iTowns/itowns/commit/d53c1a5))
* **deps:** bump copc and remove unecessary ignore of fs ([d4779cc](https://github.com/iTowns/itowns/commit/d4779cc))
* npm install [@xmldom](https://github.com/xmldom)/xmldom --save-dev ([1c8256c](https://github.com/iTowns/itowns/commit/1c8256c))
* npm install sinon --save-dev ([4d21c1e](https://github.com/iTowns/itowns/commit/4d21c1e))
* replace the CDN from unpkg to jsdelivr ([c7ff763](https://github.com/iTowns/itowns/commit/c7ff763))
* **scripts:** mark cjs scripts explicitely ([c6bae49](https://github.com/iTowns/itowns/commit/c6bae49))


### Documentation

* **tutorials:** minor typo and syntax fixes ([7680ccf](https://github.com/iTowns/itowns/commit/7680ccf))
* **tutorials:** replace deprecated callback ([c6ba5fb](https://github.com/iTowns/itowns/commit/c6ba5fb))


### Tests

* **wfs:** fix wfs to 25d example test ([1cb36a7](https://github.com/iTowns/itowns/commit/1cb36a7))


### BREAKING CHANGES

* - WebGL1 context is no longer supported.
* The itowns library drops the CommonJS distribution in favor of
a standard ECMAScript module (ESM) distribution.
* **3dtiles:** * C3DTFeature constructor parameters changed from
(tileId, batchId, groups, info, userData, object3d) to
(tileId, batchId, groups, userData, object3d)
* C3DTilesLayer.findBatchTable() is not exposed in the API anymore



<a name="2.42.0"></a>
# [2.42.0](https://github.com/iTowns/itowns/compare/v2.41.0...v2.42.0) (2024-02-05)


### Features

* Add bboxUrlPrecision parameter ([09a037d](https://github.com/iTowns/itowns/commit/09a037d))
* Add Cloud Optimized GeoTIFF (COG) sample ([#2250](https://github.com/iTowns/itowns/issues/2250)) ([f707e26](https://github.com/iTowns/itowns/commit/f707e26))
* **controls:** add meta key support in state controls ([74f8b50](https://github.com/iTowns/itowns/commit/74f8b50))
* **Coordinates:** add toArray method. ([ebadc9c](https://github.com/iTowns/itowns/commit/ebadc9c))
* **deps:** Update proj4 from 2.9.0 to 2.9.2 ([24eac28](https://github.com/iTowns/itowns/commit/24eac28))
* **deps:** Update three from 0.154.0 to 0.159.0 ([a2f9105](https://github.com/iTowns/itowns/commit/a2f9105))
* drop support of old browsers ([e81e117](https://github.com/iTowns/itowns/commit/e81e117))
* **Feature2Mesh:** Stylize points mesh. ([b7538b0](https://github.com/iTowns/itowns/commit/b7538b0))
* **LASParser:** change lasparser package from loaders.gl to copc ([aa9d97e](https://github.com/iTowns/itowns/commit/aa9d97e))
* **View:** add getters for threejs renderer and camera ([57ed8d3](https://github.com/iTowns/itowns/commit/57ed8d3))
* **view:** add WebXR support. ([1d10290](https://github.com/iTowns/itowns/commit/1d10290))


### Bug Fixes

* **C3DTilesLayer:** handle tileContent with several child containing C3DTFeature. ([219e015](https://github.com/iTowns/itowns/commit/219e015))
* **ColorLayer:** Fix rendering issue on white to invisible effect ([04cad6c](https://github.com/iTowns/itowns/commit/04cad6c)), closes [#2236](https://github.com/iTowns/itowns/issues/2236)
* **examples:** change watercolor tile url ([1bfd639](https://github.com/iTowns/itowns/commit/1bfd639))
* **examples:** Fix stereo effects example ([3919b72](https://github.com/iTowns/itowns/commit/3919b72)), closes [/github.com/mrdoob/three.js/wiki/Migration-Guide#147--148](https://github.com//github.com/mrdoob/three.js/wiki/Migration-Guide/issues/147--148)
* **package-lock.json:** Restore resolved and integrity properties ([6737c93](https://github.com/iTowns/itowns/commit/6737c93)), closes [npm/cli#4263](https://github.com/npm/cli/issues/4263)
* **pointcloud:** Add SSE calculation for orthographic projections ([cae9463](https://github.com/iTowns/itowns/commit/cae9463))
* **points:** Correct orthographic vertex projection ([e6e1d80](https://github.com/iTowns/itowns/commit/e6e1d80))
* **StateControl:** use uncaught key event ([7fae54c](https://github.com/iTowns/itowns/commit/7fae54c))
* **tests:** prevent overwriting `navigator.userAgent` ([f146262](https://github.com/iTowns/itowns/commit/f146262))
* **VectorTile:** loading texture on VectorTile when node.pendingSubdivision  !need improvement! ([e464bdc](https://github.com/iTowns/itowns/commit/e464bdc))


### Performance Improvements

* **3dtiles:** Transform 3d tiles region bounding volumes to spheres ([f0eaf96](https://github.com/iTowns/itowns/commit/f0eaf96))


### Code Refactoring

* **bboxDigits:** Apply code review ([b118942](https://github.com/iTowns/itowns/commit/b118942))
* **Feature2Mesh:** add gestion feature with variable size ([4d44cd3](https://github.com/iTowns/itowns/commit/4d44cd3))
* **FeatureContext:** use Context on LabelLayer and Feature2Texture ([4abab9b](https://github.com/iTowns/itowns/commit/4abab9b))
* **FeatureCtx:** move class FeatureContext to Style and rename ([2428d56](https://github.com/iTowns/itowns/commit/2428d56))
* **Feature:** remove geometry.properties.style -> use style fct at Feature level ([b736f72](https://github.com/iTowns/itowns/commit/b736f72))
* **FeatureToolTip:** update with new gestion of Style ([356e695](https://github.com/iTowns/itowns/commit/356e695))
* **points:** Uniformize naming with three's points shader ([d46cd44](https://github.com/iTowns/itowns/commit/d46cd44))
* **Style:** change setFromGeojsonProperties() to static ([8cf99b6](https://github.com/iTowns/itowns/commit/8cf99b6))
* **style:** change Style.drawingFromContext(ctx) to Style.getFromContext(ctx) for hierarchization of style properties ([17bbe88](https://github.com/iTowns/itowns/commit/17bbe88))
* **Style:** change Style.setFromVectorTileLayer to static ([5f22009](https://github.com/iTowns/itowns/commit/5f22009))
* **StyleContext:** add setFeature to access feature.type ([6b44ef9](https://github.com/iTowns/itowns/commit/6b44ef9))
* **Style:** fuse drawStylefromContext() and symbolStylefromContext() into applyContext() ([db3e455](https://github.com/iTowns/itowns/commit/db3e455))
* **Style:** homogenize gestion fill.pattern between all existing ([396edfb](https://github.com/iTowns/itowns/commit/396edfb))
* **Style:** Style hierachisation in Layer.Style instanciation ([55849f6](https://github.com/iTowns/itowns/commit/55849f6))
* **Style:** supp collection.style and delete notion of style.parent ([40f83b3](https://github.com/iTowns/itowns/commit/40f83b3))
* **Style:** supp getTextFromProperties() ad it's done with getContext() ([565dd63](https://github.com/iTowns/itowns/commit/565dd63))


### Workflow and chores

* release v2.42.0 ([ec812b4](https://github.com/iTowns/itowns/commit/ec812b4))
* **babel:** remove nullish coalescing operator transform ([691a859](https://github.com/iTowns/itowns/commit/691a859))
* **deps-dev:** bump [@babel](https://github.com/babel)/traverse from 7.22.5 to 7.23.2 ([66171c7](https://github.com/iTowns/itowns/commit/66171c7))
* **deps-dev:** bump follow-redirects from 1.15.2 to 1.15.4 ([9761d58](https://github.com/iTowns/itowns/commit/9761d58))
* **deps-dev:** Update conventional-changelog from 3.0.0 to 4.1.0 ([5f084bf](https://github.com/iTowns/itowns/commit/5f084bf))
* **deps-dev:** Update eslint and its plugins ([1e9371e](https://github.com/iTowns/itowns/commit/1e9371e))
* **deps-dev:** Update some developer dependencies ([4d74d4a](https://github.com/iTowns/itowns/commit/4d74d4a))
* **deps-dev:** Update webpack and its loaders ([cdaf12f](https://github.com/iTowns/itowns/commit/cdaf12f))
* **deps:** add copc.js dependency ([f89df8c](https://github.com/iTowns/itowns/commit/f89df8c))
* **deps:** supp package loaders.gl/las ([14884f3](https://github.com/iTowns/itowns/commit/14884f3))
* **deps:** Update [@loaders](https://github.com/loaders).gl/las from 3.4.4 to 4.0.4 ([30ded56](https://github.com/iTowns/itowns/commit/30ded56))
* **deps:** Update [@tmcw](https://github.com/tmcw)/togeojson from 5.6.2 to 5.8.1 ([e52fba6](https://github.com/iTowns/itowns/commit/e52fba6))
* **deps:** Update regenerator-runtime from 0.13.11 to 0.14.0 ([878a256](https://github.com/iTowns/itowns/commit/878a256))
* **dev-deps:** Update puppeteer from 19.4.0 to 21.6.0 ([a681103](https://github.com/iTowns/itowns/commit/a681103))
* **dev-deps:** Update semver due to moderate vulnerability ([5a6c7e3](https://github.com/iTowns/itowns/commit/5a6c7e3))
* **examples:** ESMify collada example ([b82622d](https://github.com/iTowns/itowns/commit/b82622d))
* **examples:** ESMify multiple 2.5D maps ([ac9cea4](https://github.com/iTowns/itowns/commit/ac9cea4))
* **Feature:** rename base_altitudeDefault to camelCase ([658992d](https://github.com/iTowns/itowns/commit/658992d))
* **polyfills:** remove polyfill for async/await ([abc6bbb](https://github.com/iTowns/itowns/commit/abc6bbb))
* **polyfills:** remove polyfill for TextDecoder ([356811e](https://github.com/iTowns/itowns/commit/356811e))
* **README:** add browser support notice ([f31fec9](https://github.com/iTowns/itowns/commit/f31fec9))
* **test:** fix bootstrap to follow ES semantics ([4d4e28f](https://github.com/iTowns/itowns/commit/4d4e28f))
* **webpack:** remove fetch polyfill on bundle ([96b870a](https://github.com/iTowns/itowns/commit/96b870a))
* **webpack:** remove URL polyfill on bundle ([1928986](https://github.com/iTowns/itowns/commit/1928986))
* **webpack:** stop watching node modules in dev mode ([47d0c7c](https://github.com/iTowns/itowns/commit/47d0c7c))


### Documentation

* **ColorLayer:** Update doc on effect_type and effect_parameter ([d508831](https://github.com/iTowns/itowns/commit/d508831))
* **README:** remove typo ([6329129](https://github.com/iTowns/itowns/commit/6329129))
* **style:** specify features supported with labels ([de88737](https://github.com/iTowns/itowns/commit/de88737))
* **View:** document View properties ([ef8d3f4](https://github.com/iTowns/itowns/commit/ef8d3f4))


### BREAKING CHANGES

* iTowns now officially supports only the two last
versions + versions with >0.5% market share of popular browsers as
well as the lastest version of Firefox ESR. WebGL2.0 support is also
mandatory.
* **3dtiles:** Remove region, box and sphere properties of C3DTBoundingVolume.
They have been replaced by volume property which contains a THREE.Box3 (for
box) or a THREE.Sphere (for sphere or region). Initial bounding volume type
can be retrieved with the initialVolumeType property.
* **C3DTilesLayer:** C3DTFeature constructor changed from (tileId, batchId, groups, info, userData) to (tileId, batchId, groups, info, userData, object3d)



<a name="2.41.0"></a>
# [2.41.0](https://github.com/iTowns/itowns/compare/v2.40.0...v2.41.0) (2023-10-16)


### Features

* **3dtiles:** add method to enable ktx2 loader for gltf ([a260109](https://github.com/iTowns/itowns/commit/a260109))
* **points:** Add attenuated mode for points size rendering ([6db3c5e](https://github.com/iTowns/itowns/commit/6db3c5e))
* **points:** Add option to render points in shape square or circle ([363f137](https://github.com/iTowns/itowns/commit/363f137))
* **VectorTile:** add coordProj in pushCoordinatesValues() to get access to position when using style.base_altitude. ([451e5d6](https://github.com/iTowns/itowns/commit/451e5d6))


### Bug Fixes

* **example:** fix example Gpx 3d and functional test ([781a47d](https://github.com/iTowns/itowns/commit/781a47d))
* fix Glob error when lauching npm install on windows ([e56bf65](https://github.com/iTowns/itowns/commit/e56bf65))
* **picking:** Fix point reference of picking ([#2192](https://github.com/iTowns/itowns/issues/2192)) ([1cd4db9](https://github.com/iTowns/itowns/commit/1cd4db9))


### Examples

* **VectorTile:** new example using official mapbox flux, showing buildings placed at ground level. ([cefebce](https://github.com/iTowns/itowns/commit/cefebce))


### Code Refactoring

* **Feature:** Feature.pushCoordinates() change in arguments order ([44e9532](https://github.com/iTowns/itowns/commit/44e9532))
* **VectorTile:** Code clean up ([284c46b](https://github.com/iTowns/itowns/commit/284c46b))
* **View:** Deprecate WebGL 1.0 support ([1cf7075](https://github.com/iTowns/itowns/commit/1cf7075))


### Workflow and chores

* release v2.41.0 ([d47e36c](https://github.com/iTowns/itowns/commit/d47e36c))
* add commit message checker ([9370312](https://github.com/iTowns/itowns/commit/9370312))
* **integration:** add release commit to message check ([b88de83](https://github.com/iTowns/itowns/commit/b88de83))
* **release:** add npm install to npm bump command ([cc6239d](https://github.com/iTowns/itowns/commit/cc6239d))
* separate build and test jobs ([c3bc003](https://github.com/iTowns/itowns/commit/c3bc003))
* **workflow:** add npm provenance to npm package ([cb29ab6](https://github.com/iTowns/itowns/commit/cb29ab6))
* **workflow:** fix publish rights with npm provenance ([63f70be](https://github.com/iTowns/itowns/commit/63f70be))
* **workflow:** update github actions to node 18 ([5143c25](https://github.com/iTowns/itowns/commit/5143c25))


### Documentation

* **CONTRIBUTING.md:** add commits type list ([b91404a](https://github.com/iTowns/itowns/commit/b91404a))
* **CONTRIBUTING.md:** fix typo ([ac6c328](https://github.com/iTowns/itowns/commit/ac6c328))
* **WebGL1:** Remove tutorial "Getting Started - WebGL 1.0/2.0" ([57f7b59](https://github.com/iTowns/itowns/commit/57f7b59))


### BREAKING CHANGES

* **VectorTile:** Feature.pushCoordinatesValues() signature change from pushCoordinatesValues(feature, long, lat, normal) to pushCoordinatesValues(feature, coordIn, coordProj)
* **Feature:** Feature.pushCoordinates() change in arguments order from pushCoordinates(coordIn, feature) to pushCoordinates(feature, coordIn)



<a name="2.40.0"></a>
# [2.40.0](https://github.com/iTowns/itowns/compare/v2.38.2...v2.40.0) (2023-07-28)


### Features

* **3dtiles:** add classification for rendering pointscloud ([b924cd7](https://github.com/iTowns/itowns/commit/b924cd7))
* **3DTiles:** add style API + C3DTFeature ([864268a](https://github.com/iTowns/itowns/commit/864268a))
* **3dtiles:** add support for 3d tiles from cesium ion server ([e9793a3](https://github.com/iTowns/itowns/commit/e9793a3))
* **3DTiles:** add C3DTILES_LAYER_EVENTS.ON_TILE_REQUESTED ([ec837c7](https://github.com/iTowns/itowns/commit/ec837c7))
* **Coordinates:** Add a setCrs method ([606b6b8](https://github.com/iTowns/itowns/commit/606b6b8))
* **elevationLayers:** Add config.clampValues for clamping values of the elevation dataset ([1985078](https://github.com/iTowns/itowns/commit/1985078))
* **instancing:** use instancing for large number of 3d objects ([619a611](https://github.com/iTowns/itowns/commit/619a611))
* **LabelLayer:** add option to clamp labels to terrain. ([f46ca97](https://github.com/iTowns/itowns/commit/f46ca97))
* **Parser:** detect if original source have elevation data. ([17aaa8b](https://github.com/iTowns/itowns/commit/17aaa8b))
* **picking:** Add distance and point position to returned object by points picking ([97a5e6a](https://github.com/iTowns/itowns/commit/97a5e6a))
* **planarcontrols:** add enabled attribute ([f13a060](https://github.com/iTowns/itowns/commit/f13a060))
* **Style:** add icon.color and icon.opacity ([4fd5dc4](https://github.com/iTowns/itowns/commit/4fd5dc4))
* **typescript:** Add devDeps on three's definitions ([2fbbcc3](https://github.com/iTowns/itowns/commit/2fbbcc3))
* **typescript:** Add tsconfig.json configuration ([3c8c5f5](https://github.com/iTowns/itowns/commit/3c8c5f5))
* **typescript:** Add typescript dependency ([71a2370](https://github.com/iTowns/itowns/commit/71a2370))
* **view:** allow to pass an array of layers for picking ([9b6d59f](https://github.com/iTowns/itowns/commit/9b6d59f))
* **Widget:** add C3DTilesStyle widget ([7862bc1](https://github.com/iTowns/itowns/commit/7862bc1))
* **WMTS:** Support vendor specific parameters ([cff042c](https://github.com/iTowns/itowns/commit/cff042c))
* **XbilParser:** gestion nodata in elevation layer (elevation set to 0) ([20075b8](https://github.com/iTowns/itowns/commit/20075b8))


### Bug Fixes

* **3dTiles:** addEventListener onTileContentLoaded constructor ([6f9a9d2](https://github.com/iTowns/itowns/commit/6f9a9d2))
* **3dtiles:** fix batchtable reading ([b245301](https://github.com/iTowns/itowns/commit/b245301))
* **3dtiles:** improve 3D Tiles cache cleaning ([284be24](https://github.com/iTowns/itowns/commit/284be24))
* **3DTiles:** tileId == 0 can update style ([11582c9](https://github.com/iTowns/itowns/commit/11582c9))
* **controls:** keyboard events are now on the domElement on the view instead of window ([d5c80f4](https://github.com/iTowns/itowns/commit/d5c80f4))
* **CRS:** more robust parameter tests ([a2e0f5c](https://github.com/iTowns/itowns/commit/a2e0f5c))
* **Debug:** fix 3dTiles bbox visibility ([cd8d106](https://github.com/iTowns/itowns/commit/cd8d106))
* **example:** change config file linked with the clampValues config ([2a4e911](https://github.com/iTowns/itowns/commit/2a4e911))
* **example:** invert order of the ElevationLayer addition when using 2 ([c6800c9](https://github.com/iTowns/itowns/commit/c6800c9))
* **examples:** Fix  cesium ion token ([7f86d26](https://github.com/iTowns/itowns/commit/7f86d26))
* **examples:** Replace Lyon's deprecated MNT sources ([7490590](https://github.com/iTowns/itowns/commit/7490590))
* **examples:** Replace Lyon's deprecated Ortho2009 sources ([8dbb3d6](https://github.com/iTowns/itowns/commit/8dbb3d6))
* **examples:** Update Lyon bus source options ([0881b2d](https://github.com/iTowns/itowns/commit/0881b2d))
* **Feature2Texture:** prevent empty style ([ab5713a](https://github.com/iTowns/itowns/commit/ab5713a))
* **GeoJsonParser:** fix firstCoordinates when empty ([e54f352](https://github.com/iTowns/itowns/commit/e54f352))
* **GlobeLayer, PlanarLayer:** fix too much tiles subdivision due to wrong param name ([c726f25](https://github.com/iTowns/itowns/commit/c726f25))
* **Label:** catch no data elevation. ([e1e3b1d](https://github.com/iTowns/itowns/commit/e1e3b1d))
* **ObjectRemovalHelper:** linked objects are not removed. ([05a0768](https://github.com/iTowns/itowns/commit/05a0768))
* **Parser:** detect if original source have elevation data with multi-features. ([9d509da](https://github.com/iTowns/itowns/commit/9d509da))
* **Source:** Validate crs in Source constructor ([195bef3](https://github.com/iTowns/itowns/commit/195bef3))
* **typescript:** Add annotation to unblock typechecking ([25619f3](https://github.com/iTowns/itowns/commit/25619f3))
* **view:** improve resource disposal by removing textures and allow to remove cache ([2497d00](https://github.com/iTowns/itowns/commit/2497d00))
* **view:** improve view disposal by removing resize listener ([6f4ec34](https://github.com/iTowns/itowns/commit/6f4ec34))


### Performance Improvements

* **LabelLayer:** add automatic label filtering to reduce rendering calls. ([e7dde10](https://github.com/iTowns/itowns/commit/e7dde10))


### Examples

* **3dtiles:** add an example to display OSM buildings from cesium ion server ([9e9acb0](https://github.com/iTowns/itowns/commit/9e9acb0))
* **3dtiles:** rename some 3D tiles examples ([e032bf2](https://github.com/iTowns/itowns/commit/e032bf2))
* **3dtiles:** update 3d tiles dataset on 3dtiles_25d example to a textured one ([15b438c](https://github.com/iTowns/itowns/commit/15b438c))
* **Collada:** clean and update ([08dbd3d](https://github.com/iTowns/itowns/commit/08dbd3d))
* **potree_25d_map:** declare map projection code ([604b6ac](https://github.com/iTowns/itowns/commit/604b6ac))
* **SourceFileGeoJson:** geojson raster file -> add new example for planarView ([2d6abcd](https://github.com/iTowns/itowns/commit/2d6abcd))
* **SourceFileKML:** add new kml raster file from official source ([58734ee](https://github.com/iTowns/itowns/commit/58734ee))


### Code Refactoring

* **c3DEngine:** deleting the unused method getUniqueThreejsLayer. ([9664006](https://github.com/iTowns/itowns/commit/9664006))
* **Camera:** remove camera argument from CameraRig ([2af65b7](https://github.com/iTowns/itowns/commit/2af65b7))
* **example:** update with new gestion of Style ([955722c](https://github.com/iTowns/itowns/commit/955722c))
* **Extent:** move calculation of Extent intersection to static Extent.intersectsExtent(ExtentA,ExtentB) ([4ca93a9](https://github.com/iTowns/itowns/commit/4ca93a9))
* **FeatureGeometryLayer:** cleanup -> remove extra line break ([4cef6ba](https://github.com/iTowns/itowns/commit/4cef6ba))
* **FeatureToolTip:** update for official kml and geojson flux ([6e2a98c](https://github.com/iTowns/itowns/commit/6e2a98c))
* **GlobeControls:** remove three layer for helpers. ([a1a8391](https://github.com/iTowns/itowns/commit/a1a8391))
* **GlobeLayer:** pass in static the method horizonCulling. ([18af800](https://github.com/iTowns/itowns/commit/18af800))
* **GlobeView:** move sun light, from tileLayer to main scene. ([68b78f0](https://github.com/iTowns/itowns/commit/68b78f0))
* **LabeLayer:** change label node culling mechanism. ([b833744](https://github.com/iTowns/itowns/commit/b833744))
* **LabelLayer:** apply architecture node and simplify process. ([aff7964](https://github.com/iTowns/itowns/commit/aff7964))
* **Label:** optimize elevation update. ([7492c8e](https://github.com/iTowns/itowns/commit/7492c8e))
* **Layer:** instanciate new Style at Layer instead of at examples ([d26f29e](https://github.com/iTowns/itowns/commit/d26f29e))
* **LayerUpdateState:** add hasFinished method. ([3767b0a](https://github.com/iTowns/itowns/commit/3767b0a))
* **OBB:** remove OBB from node's children. ([0440bb6](https://github.com/iTowns/itowns/commit/0440bb6))
* **pickFeaturesAt:** avoid picking twice the same featureGeometry ([d5e5f7e](https://github.com/iTowns/itowns/commit/d5e5f7e))
* **RasterTile:** emit event when raster elevation changed. ([ea52ee1](https://github.com/iTowns/itowns/commit/ea52ee1))
* **Style:** instantiate canvas when no document ([b20916f](https://github.com/iTowns/itowns/commit/b20916f))
* **test:** add a npm run test in develpment mode -> run test-dev ([9ca1d5f](https://github.com/iTowns/itowns/commit/9ca1d5f))
* **test:** commenting failing test in test/unit/CameraUtils ([b39edf8](https://github.com/iTowns/itowns/commit/b39edf8))
* **test:** handling assert fail messages in tests ([1131abe](https://github.com/iTowns/itowns/commit/1131abe))
* **test:** handling fail messages in test with promise ([48b9750](https://github.com/iTowns/itowns/commit/48b9750))
* **THREE:** Remove Three.js layers using. ([971f175](https://github.com/iTowns/itowns/commit/971f175))
* **TileMesh:** add change visibility event. ([90ada88](https://github.com/iTowns/itowns/commit/90ada88))
* **TileMesh:** new structuring of the data linked to the node. ([05eb368](https://github.com/iTowns/itowns/commit/05eb368))
* **view:** rename pickCoordinates to pickTerrainCoordinates ([9c701db](https://github.com/iTowns/itowns/commit/9c701db))
* **Widget:** expose Widget in API ([ca77fc8](https://github.com/iTowns/itowns/commit/ca77fc8))


### Workflow and chores

* release v2.40.0 ([20a80eb](https://github.com/iTowns/itowns/commit/20a80eb))
* add coding rules ([1ec89f2](https://github.com/iTowns/itowns/commit/1ec89f2))
* add name to contributors ([2f81334](https://github.com/iTowns/itowns/commit/2f81334))
* **contributors:** update contributors and maintainers ([b5123f5](https://github.com/iTowns/itowns/commit/b5123f5))
* **deployment:** prevent deploying potree bundle since it is not used yet ([8f7ae1a](https://github.com/iTowns/itowns/commit/8f7ae1a))
* **deps-dev:** bump webpack from 5.72.1 to 5.76.0 ([0bf309b](https://github.com/iTowns/itowns/commit/0bf309b))
* **deps-dev:** bump word-wrap from 1.2.3 to 1.2.5 ([64794b1](https://github.com/iTowns/itowns/commit/64794b1))
* **deps:** bump dns-packet from 5.3.1 to 5.4.0 ([96987fd](https://github.com/iTowns/itowns/commit/96987fd))
* don't watch git hash modification ([f19973e](https://github.com/iTowns/itowns/commit/f19973e))
* **examples:** update draco to work with THREE r153 ([00b6db5](https://github.com/iTowns/itowns/commit/00b6db5))
* **integration:** differentiate deployment for LTS and current version ([470e306](https://github.com/iTowns/itowns/commit/470e306))
* **integration:** fix next version publication ([fdb4813](https://github.com/iTowns/itowns/commit/fdb4813))
* **integration:** publish latest and next npm packages ([f8996b3](https://github.com/iTowns/itowns/commit/f8996b3))
* **integration:** update actions in integration script ([c83bfcf](https://github.com/iTowns/itowns/commit/c83bfcf))
* replace variable declaration by const or let ([36ce64d](https://github.com/iTowns/itowns/commit/36ce64d))
* update packages ([a841343](https://github.com/iTowns/itowns/commit/a841343))
* update three to 0.153.0 ([728f473](https://github.com/iTowns/itowns/commit/728f473))
* update three to r154 ([85c9b78](https://github.com/iTowns/itowns/commit/85c9b78))


### Documentation

* **3dtiles:** add documentation for 3d tiles source ([eb7c8ca](https://github.com/iTowns/itowns/commit/eb7c8ca))
* add coding conventions and other rules for PR. ([5001c8d](https://github.com/iTowns/itowns/commit/5001c8d))
* **examples:** Add documentation on some test cases ([cba2146](https://github.com/iTowns/itowns/commit/cba2146))
* **layers:** improve raster layers doc ([c53436a](https://github.com/iTowns/itowns/commit/c53436a))
* **style:** JSDoc for StyleOptions ([3adbf39](https://github.com/iTowns/itowns/commit/3adbf39))
* **tutorials:** fix tutorials source API keys ([0c10d82](https://github.com/iTowns/itowns/commit/0c10d82))
* **tutorials:** update with new gestion of Style ([d76f92f](https://github.com/iTowns/itowns/commit/d76f92f))
* **WMTSSource:** Change the link and the extend to TMSSource ([23c16d2](https://github.com/iTowns/itowns/commit/23c16d2))


### Tests

* **3dtiles:** test 3d tiles sources and 3d tiles ion example ([47db4c7](https://github.com/iTowns/itowns/commit/47db4c7))
* **examples:** add new functional tests ([8e14fe8](https://github.com/iTowns/itowns/commit/8e14fe8))
* **LabelLayer:** add and modify LabelLayer tests. ([a8dfb36](https://github.com/iTowns/itowns/commit/a8dfb36))
* **style:** add tests for applyToHTML() and getImage() ([8e04cd8](https://github.com/iTowns/itowns/commit/8e04cd8))


### BREAKING CHANGES

* **view:** View.pickCoordinates has been renamed to View.pickTerrainCoordinates and returns the coordinates in the referenceCrs of the view instead of in the crs of the tiledLayer extent.



<a name="2.39.0"></a>
# [2.39.0](https://github.com/iTowns/itowns/compare/v2.38.2...v2.39.0) (2023-01-04)


### Features

* **3dtiles:** add support for binary batch table ([47325ab](https://github.com/iTowns/itowns/commit/47325ab))
* add a npm build task creating a non minified version ([48a24fa](https://github.com/iTowns/itowns/commit/48a24fa))
* **debug:** add altitude to displayed coordinates. ([e1fea9f](https://github.com/iTowns/itowns/commit/e1fea9f))
* **globeControls:** add configuration parameters and documentation ([cdd865c](https://github.com/iTowns/itowns/commit/cdd865c))
* **globeView:** allow to configure globeControls when creating a globeView ([821e522](https://github.com/iTowns/itowns/commit/821e522))


### Bug Fixes

* **3dtiles:** fix and document 3d tiles material overriding ([8ade709](https://github.com/iTowns/itowns/commit/8ade709))
* **3dtiles:** fix layer opacity and visibility change for 3d tiles pnts ([059fe5e](https://github.com/iTowns/itowns/commit/059fe5e))
* **3dtiles:** handle tilesets with cesium specific uniforms in shaders ([04f8b40](https://github.com/iTowns/itowns/commit/04f8b40))
* **3dtiles:** use correct batch table constructor for pnts tiles ([e1dbd63](https://github.com/iTowns/itowns/commit/e1dbd63))
* change THREE.Math to THREE.MathUtils ([826b5bd](https://github.com/iTowns/itowns/commit/826b5bd))
* **Feature2Texture:** prevent drawing points if they lack style ([5706e6f](https://github.com/iTowns/itowns/commit/5706e6f))
* **gltf:** fix parsing of khr_binary_extension in gltf 1.0 files ([2bf9d2d](https://github.com/iTowns/itowns/commit/2bf9d2d))
* **LayeredMaterial:** fix opacity when initialized to 0 ([deac41e](https://github.com/iTowns/itowns/commit/deac41e))
* **picking:** fix picking on multiple layers ([5c2f578](https://github.com/iTowns/itowns/commit/5c2f578))
* **Scheduler:** replace url subdomains alternatives ([91fd9ec](https://github.com/iTowns/itowns/commit/91fd9ec))
* **view:** fix view resize when width or height is 0 ([dbd9ee3](https://github.com/iTowns/itowns/commit/dbd9ee3))
* **wfs, wms, wmts:** support urls ending with or without ? character ([f44dfb2](https://github.com/iTowns/itowns/commit/f44dfb2))


### Performance Improvements

* **demutils:** texture data read optimization in elevation measurement ([9ee991c](https://github.com/iTowns/itowns/commit/9ee991c))
* **picking:** don't pick atmosphere layer ([069b2dd](https://github.com/iTowns/itowns/commit/069b2dd))


### Examples

* **3dtiles_25d:** change data url ([52a412f](https://github.com/iTowns/itowns/commit/52a412f))
* **Camera animation:** cleanup example code ([2bfe4e6](https://github.com/iTowns/itowns/commit/2bfe4e6))
* **GuiTools:** fix opacity slider by adding step ([3b205bc](https://github.com/iTowns/itowns/commit/3b205bc))
* **DSM:** add an example of Digital Surface Model ([2f9d558](https://github.com/iTowns/itowns/commit/2f9d558))


### Code Refactoring

* **feature:** use feature crs property for instance center property. ([e455bdb](https://github.com/iTowns/itowns/commit/e455bdb))


### Workflow and chores

* release v2.39.0 ([dd1d251](https://github.com/iTowns/itowns/commit/dd1d251))
* add a script to start an https local session with webpack ([e99bf15](https://github.com/iTowns/itowns/commit/e99bf15))
* **deps:** bump loader-utils from 2.0.2 to 2.0.3 ([fd0f01b](https://github.com/iTowns/itowns/commit/fd0f01b))
* **deps:** bump loader-utils from 2.0.3 to 2.0.4 ([cccacae](https://github.com/iTowns/itowns/commit/cccacae))
* **deps:** bump terser from 5.13.1 to 5.14.2 ([7134b26](https://github.com/iTowns/itowns/commit/7134b26))
* **integration:** add option to launch integration workflow manually ([db05ed6](https://github.com/iTowns/itowns/commit/db05ed6))
* **integration:** update potree repository ([39fbdd7](https://github.com/iTowns/itowns/commit/39fbdd7))
* up chalk to 5.0.1 ([1a30d66](https://github.com/iTowns/itowns/commit/1a30d66))
* update CONTRIBUTORS.md ([ba33056](https://github.com/iTowns/itowns/commit/ba33056))
* update packages. ([3dac8b9](https://github.com/iTowns/itowns/commit/3dac8b9))
* update three.js to 0.146.0 ([55e7016](https://github.com/iTowns/itowns/commit/55e7016))


### Documentation

* **RasterTile:** fix faulty link ([7cf4fcf](https://github.com/iTowns/itowns/commit/7cf4fcf))
* **README:** Typo in the readme redirecting to a 404 error ([04122a8](https://github.com/iTowns/itowns/commit/04122a8))
* **tutorials:** Improve tutorial and add two tutorials for 3D tiles ([3063925](https://github.com/iTowns/itowns/commit/3063925))


### Tests

* **3dtiles:** add 3D Tiles batch table parsing tests ([f3bd6c7](https://github.com/iTowns/itowns/commit/f3bd6c7))


### BREAKING CHANGES

* **3dtiles:** `C3DTBatchTable` constructor signature has changed from
C3DTBatchTable(buffer, binaryLength, batchLength, registeredExtensions) to
C3DTBatchTable(buffer, jsonLength, binaryLength, batchLength, registeredExtensions)



<a name="2.38.2"></a>
## [2.38.2](https://github.com/iTowns/itowns/compare/v2.38.1...v2.38.2) (2022-05-11)


### Features

* **View:** Add option viewer to enable/disable focus on start. ([88d7c93](https://github.com/iTowns/itowns/commit/88d7c93))


### Workflow and chores

* release v2.38.2 ([36213cc](https://github.com/iTowns/itowns/commit/36213cc))



<a name="2.38.1"></a>
## [2.38.1](https://github.com/iTowns/itowns/compare/v2.38.0...v2.38.1) (2022-04-13)


### Examples

* **Navigation:** fix addButton method call ([c53ae71](https://github.com/iTowns/itowns/commit/c53ae71))


### Workflow and chores

* release v2.38.1 ([2ea8b0a](https://github.com/iTowns/itowns/commit/2ea8b0a))



<a name="2.38.0"></a>
# [2.38.0](https://github.com/iTowns/itowns/compare/v2.37.0...v2.38.0) (2022-04-13)


### Features

* **FeatureGeometryLayer:** introduce FeatureMesh, they are added to layer.object3d. ([0d777ce](https://github.com/iTowns/itowns/commit/0d777ce))
* **Widgets:** add a searchbar widget ([164b6ee](https://github.com/iTowns/itowns/commit/164b6ee))
* **Widgets:** add a widget to display a scale ([d3a0154](https://github.com/iTowns/itowns/commit/d3a0154))
* **Widgets:** add show and hide methods ([59ac32c](https://github.com/iTowns/itowns/commit/59ac32c))
* **widgets:** Navigation tooltips can be parametrized ([094803f](https://github.com/iTowns/itowns/commit/094803f))
* **Widgets:** placeholder for searchbar can be modified ([9bd81ce](https://github.com/iTowns/itowns/commit/9bd81ce))


### Bug Fixes

* **Feature2Mesh:** fix wrong computing of clockwise polygon. ([bad5e34](https://github.com/iTowns/itowns/commit/bad5e34))
* **GeoidLayer:** transformation error on tileMesh. ([472e39c](https://github.com/iTowns/itowns/commit/472e39c))
* **parser:** GeoJsonParser add legacy identifier to fct readCRS() ([a0195c6](https://github.com/iTowns/itowns/commit/a0195c6))
* **VectorTileParser:** clock wise polygon wasn't calculated. ([135ee7a](https://github.com/iTowns/itowns/commit/135ee7a))
* **View:** fix pickCoordinates undefined parameter ([0ec49f4](https://github.com/iTowns/itowns/commit/0ec49f4))
* **Widgets:** fix focus policy and event propagation on widgets ([7775a04](https://github.com/iTowns/itowns/commit/7775a04))
* **Widgets:** fix in Navigation css ([a85f8b4](https://github.com/iTowns/itowns/commit/a85f8b4))


### Examples

* change view source button style ([e593237](https://github.com/iTowns/itowns/commit/e593237))
* **FeatureGeometryLayer:** add vector tile to 3d object. ([53a42a6](https://github.com/iTowns/itowns/commit/53a42a6))
* **view 3d:** updates on widgets ([30bee5f](https://github.com/iTowns/itowns/commit/30bee5f))
* **Widgets:** use minimap widget in view 3D example ([5042ba7](https://github.com/iTowns/itowns/commit/5042ba7))


### Code Refactoring

* **Feature:** move properties to private fields. ([02604b9](https://github.com/iTowns/itowns/commit/02604b9))
* **Feature:** simplify normals data. ([0914834](https://github.com/iTowns/itowns/commit/0914834))
* **GeometryLayer:** reference to material properties from Layer properties. ([23a0269](https://github.com/iTowns/itowns/commit/23a0269))
* **label:** render only object with labels. ([c317a8a](https://github.com/iTowns/itowns/commit/c317a8a))
* **MainLoop:** use class for MainLoop. ([25a48fd](https://github.com/iTowns/itowns/commit/25a48fd))
* **PlanarControls:** change focus policy ([99fadc0](https://github.com/iTowns/itowns/commit/99fadc0))
* **view_3d_map:** simplify example ([3786dcf](https://github.com/iTowns/itowns/commit/3786dcf))
* **View:** move View properties to private fields. ([51f5508](https://github.com/iTowns/itowns/commit/51f5508))
* **Widgets:** add onClick property in Navigation ([8d9f69e](https://github.com/iTowns/itowns/commit/8d9f69e))
* **Widgets:** simplify Navigation usage ([7c2bc89](https://github.com/iTowns/itowns/commit/7c2bc89))


### Workflow and chores

* release v2.38.0 ([34ae0f3](https://github.com/iTowns/itowns/commit/34ae0f3))
* add support ecma 2022 ([25080d9](https://github.com/iTowns/itowns/commit/25080d9))
* **deps:** bump deps to fix security vulnerability. ([1db1ae7](https://github.com/iTowns/itowns/commit/1db1ae7))
* **deps:** bump minimist from 1.2.5 to 1.2.6 ([09e047a](https://github.com/iTowns/itowns/commit/09e047a))
* **deps:** bump node-forge from 1.2.1 to 1.3.0 ([e536532](https://github.com/iTowns/itowns/commit/e536532))
* **submodule:** use submodule for widgets. ([44cc7d0](https://github.com/iTowns/itowns/commit/44cc7d0))
* update packages. ([e19809f](https://github.com/iTowns/itowns/commit/e19809f))


### Documentation

* **core:** Add doc for local execution ([faf58be](https://github.com/iTowns/itowns/commit/faf58be))
* **Widgets:** specify GlobeView support for navigation ([c209fdc](https://github.com/iTowns/itowns/commit/c209fdc))
* **Widgets:** specify resources needed to use widgets ([b65c081](https://github.com/iTowns/itowns/commit/b65c081))


### Tests

* **Feature2Mesh:** add test to calculate the difference with and without proj4. ([1527c64](https://github.com/iTowns/itowns/commit/1527c64))



<a name="2.37.0"></a>
# [2.37.0](https://github.com/iTowns/itowns/compare/v2.36.2...v2.37.0) (2022-01-31)


### Features

* **Geoid:** add support for geoid heights ([38569f6](https://github.com/iTowns/itowns/commit/38569f6))
* **Parser:** add parsers for GTX, ISG and GDF file formats ([a55b154](https://github.com/iTowns/itowns/commit/a55b154))
* **View:** add a method to pick world coordinates ([91ccfe3](https://github.com/iTowns/itowns/commit/91ccfe3))
* **View:** add support for ortho camera in getScale method ([06eb805](https://github.com/iTowns/itowns/commit/06eb805))
* **View:** dispatch an event when camera is moved ([37cfb90](https://github.com/iTowns/itowns/commit/37cfb90))
* **Widget:** add a minimap widget ([6d82c74](https://github.com/iTowns/itowns/commit/6d82c74))


### Bug Fixes

* **GlobeControl:** stop damping when launching new animation ([dad7641](https://github.com/iTowns/itowns/commit/dad7641))
* **test:** fetch local laz files behind proxy. ([b732c0a](https://github.com/iTowns/itowns/commit/b732c0a))
* **View:** fix picking radius with polygons ([b7be8e9](https://github.com/iTowns/itowns/commit/b7be8e9))


### Examples

* **Compass:** add an example of a compass in a GlobeView ([3290820](https://github.com/iTowns/itowns/commit/3290820))
* **FileSource:** add exemples of FileSource instantiation ([7db9bcb](https://github.com/iTowns/itowns/commit/7db9bcb))
* **Potree:** add an example of Potree intgration within iTowns ([4bbc772](https://github.com/iTowns/itowns/commit/4bbc772))
* **Potree:** fix minor issues on the example ([1ee50c8](https://github.com/iTowns/itowns/commit/1ee50c8))
* **source / file:** simplify FileSource usage ([21317b4](https://github.com/iTowns/itowns/commit/21317b4))
* **Widget:** add an example of minimap widget ([2b89f83](https://github.com/iTowns/itowns/commit/2b89f83))
* **Widgets:** add a plugin to display widgets ([ec56fa9](https://github.com/iTowns/itowns/commit/ec56fa9))
* add GeoidLayer implementation example ([5df8cc5](https://github.com/iTowns/itowns/commit/5df8cc5))


### Code Refactoring

* **TileMesh:** refactorize bbox update method ([18196b6](https://github.com/iTowns/itowns/commit/18196b6))
* **Widgets:** rename widgets to navigation ([509a042](https://github.com/iTowns/itowns/commit/509a042))


### Workflow and chores

* release v2.37.0 ([97e59b6](https://github.com/iTowns/itowns/commit/97e59b6))
* **deps-dev:** bump marked from 4.0.8 to 4.0.10 ([cfc9100](https://github.com/iTowns/itowns/commit/cfc9100))
* add potree repo and symbolic link to gitignore ([d7bb92c](https://github.com/iTowns/itowns/commit/d7bb92c))
* change itowns.github.io deploying ([870299f](https://github.com/iTowns/itowns/commit/870299f))
* deploy itowns and potree bundle. ([b104fd5](https://github.com/iTowns/itowns/commit/b104fd5))
* fix eslint rules. ([6fff078](https://github.com/iTowns/itowns/commit/6fff078))
* update CONTRIBUTING.md ([96cfb21](https://github.com/iTowns/itowns/commit/96cfb21))
* update packages. ([eb7c8d5](https://github.com/iTowns/itowns/commit/eb7c8d5))



<a name="2.36.2"></a>
## [2.36.2](https://github.com/iTowns/itowns/compare/v2.36.1...v2.36.2) (2021-11-29)


### Bug Fixes

* **VectorTileSource:** error if vector tile layer style is undefined. ([b535583](https://github.com/iTowns/itowns/commit/b535583))


### Code Refactoring

* **Coordinates/Extent:** rename dimension and distance methods. ([6a436ac](https://github.com/iTowns/itowns/commit/6a436ac))
* **examples:** replace geoservice keys. ([b81738c](https://github.com/iTowns/itowns/commit/b81738c))
* **Feature:** defaults buildExtent parameter to true for 2d structure ([3182075](https://github.com/iTowns/itowns/commit/3182075))


### Workflow and chores

* release v2.36.2 ([54c2128](https://github.com/iTowns/itowns/commit/54c2128))



<a name="2.36.1"></a>
## [2.36.1](https://github.com/iTowns/itowns/compare/v2.36.0...v2.36.1) (2021-11-22)


### Bug Fixes

* **View:** wrong calculate pick radius with distance/zoom. ([d5efa03](https://github.com/iTowns/itowns/commit/d5efa03))


### Workflow and chores

* release v2.36.1 ([b0cf534](https://github.com/iTowns/itowns/commit/b0cf534))



<a name="2.36.0"></a>
# [2.36.0](https://github.com/iTowns/itowns/compare/v2.35.0...v2.36.0) (2021-11-18)


### Features

* **Coordinates:** add methods to calculate distance between coordinates. ([acdf643](https://github.com/iTowns/itowns/commit/acdf643))
* **Crs:** add isGeocentric method. ([1ab76c8](https://github.com/iTowns/itowns/commit/1ab76c8))
* **Extent:** add methods to calculate extent dimensions. ([ed583d9](https://github.com/iTowns/itowns/commit/ed583d9))
* **Label:** add parameter to change labels padding property ([33f8680](https://github.com/iTowns/itowns/commit/33f8680))


### Bug Fixes

* **ColorLayer:** fix shader when transparent is true ([1a4f44d](https://github.com/iTowns/itowns/commit/1a4f44d))
* **ElevationLayer:** scale elevation isn't updated ([26d72da](https://github.com/iTowns/itowns/commit/26d72da))
* **Ellipsoid:** wrong geodesic distance. ([4d462f2](https://github.com/iTowns/itowns/commit/4d462f2))
* **Extent:** fix wrong calculating when apply matrix. ([04abdd2](https://github.com/iTowns/itowns/commit/04abdd2))
* **Feature:** wrong altitude and altitude limits. ([4746e86](https://github.com/iTowns/itowns/commit/4746e86))
* **Feature2Mesh:** set scale transformation from FeatureCollection. ([0f5cd07](https://github.com/iTowns/itowns/commit/0f5cd07))
* **FirstPersonControls:** prevent context menu from poping ([94bfd57](https://github.com/iTowns/itowns/commit/94bfd57))
* **GlobeControls:** fix black screen when zooming outside globe ([3e0f23f](https://github.com/iTowns/itowns/commit/3e0f23f))
* **label2DRenderer:** add frustum culling in global labels culling. ([5ba4e9d](https://github.com/iTowns/itowns/commit/5ba4e9d))
* **Point/3Dtiles:** wrong geographical extent property for points cloud and 3Dtiles. ([c663ce4](https://github.com/iTowns/itowns/commit/c663ce4))
* **Style:** copy order property when copying style ([cab78ba](https://github.com/iTowns/itowns/commit/cab78ba))
* **VectorTileSource:** set style parent with style Layer ([aba0743](https://github.com/iTowns/itowns/commit/aba0743))


### Examples

* **3dtiles_basic:** update 3dtiles sources url ([50d6733](https://github.com/iTowns/itowns/commit/50d6733))


### Code Refactoring

* **debug:** remove id text in OBB helper. ([d033279](https://github.com/iTowns/itowns/commit/d033279))
* **examples:** add wfs labels in 2.5d examples. ([944e412](https://github.com/iTowns/itowns/commit/944e412))
* **Extent:** throw error if the projection is geocentric. ([e0048f7](https://github.com/iTowns/itowns/commit/e0048f7))
* **Extent:** use Extent.planarDimensions instead of Extent.dimensions ([023d5fa](https://github.com/iTowns/itowns/commit/023d5fa))
* **OBBHelper:** remove OBBHelper text. ([1e2fc31](https://github.com/iTowns/itowns/commit/1e2fc31))
* **TerrainMaterial:** rename fogDepth -> vFogDepth ([7d162ec](https://github.com/iTowns/itowns/commit/7d162ec))
* **View:** change label margin default. ([8c6edf5](https://github.com/iTowns/itowns/commit/8c6edf5))


### Workflow and chores

* release v2.36.0 ([091c59b](https://github.com/iTowns/itowns/commit/091c59b))
* add contributor. ([323b046](https://github.com/iTowns/itowns/commit/323b046))
* update packages. ([ef204f9](https://github.com/iTowns/itowns/commit/ef204f9))


### Documentation

* **Ellipsoid:** minor fix on geodesicDistance doc ([a0cd2a3](https://github.com/iTowns/itowns/commit/a0cd2a3))



<a name="2.35.0"></a>
# [2.35.0](https://github.com/iTowns/itowns/compare/v2.34.0...v2.35.0) (2021-09-16)


### Features

* **AnimationPlayer:** add a callback ran at each animation frame ([1280ce0](https://github.com/iTowns/itowns/commit/1280ce0))


### Bug Fixes

* **c3DEngine:** fix error when input renderer.domElement is a canvas ([14567c1](https://github.com/iTowns/itowns/commit/14567c1))
* **CameraUtils:** CameraTransformOptions parameter stopPlaceOnGroundAtEnd is no longer overriden ([7f3a542](https://github.com/iTowns/itowns/commit/7f3a542))
* **CameraUtils:** compute precise altitude when setting CameraRig ([011fcbc](https://github.com/iTowns/itowns/commit/011fcbc))
* **Feature2Mesh:** addapt indices array type from the size of polygon ([378c092](https://github.com/iTowns/itowns/commit/378c092))
* **GlobeControls:** fix jittering move globe when devtool is open ([825841c](https://github.com/iTowns/itowns/commit/825841c))
* **Label:** clamp labels altitude over 0 ([ddd59e0](https://github.com/iTowns/itowns/commit/ddd59e0))
* **Label:** enforce Labels div top position to 0 ([08528d7](https://github.com/iTowns/itowns/commit/08528d7))
* **ShapefileParser:** prevent ignoring input crs wen given ([d2b90b7](https://github.com/iTowns/itowns/commit/d2b90b7))


### Examples

* **camera traveling:** add an example where user can pick points and have camera traveling between those points ([6e79ff3](https://github.com/iTowns/itowns/commit/6e79ff3))


### Code Refactoring

* **Controls:** change deprecated mouseWheel event to wheel event ([923d10c](https://github.com/iTowns/itowns/commit/923d10c))
* **Controls:** handle mouse events in StateControls ([ae1c30b](https://github.com/iTowns/itowns/commit/ae1c30b))
* **Controls:** switch context menu management in StateControl ([5fa010b](https://github.com/iTowns/itowns/commit/5fa010b))
* **Controls:** switch enabled property from GlobeControls to StateControl ([76130b4](https://github.com/iTowns/itowns/commit/76130b4))
* **Controls:** switch keyboard management to StateControls ([a392a7b](https://github.com/iTowns/itowns/commit/a392a7b))
* **Controls:** switch wheel management to StateControl ([4e64b75](https://github.com/iTowns/itowns/commit/4e64b75))
* **StateControl:** factorise handleMouse in pointer methods ([0e626d8](https://github.com/iTowns/itowns/commit/0e626d8))
* **StateControls:** simplify setFromOptions method ([a7d175f](https://github.com/iTowns/itowns/commit/a7d175f))


### Workflow and chores

* release v2.35.0 ([ade35e8](https://github.com/iTowns/itowns/commit/ade35e8))
* **examples:** change geoportail key. ([36f0f40](https://github.com/iTowns/itowns/commit/36f0f40))
* move babel preset-env options to .babelrc ([ad22bcc](https://github.com/iTowns/itowns/commit/ad22bcc))
* remove import three examples polyfill. ([48d52ae](https://github.com/iTowns/itowns/commit/48d52ae))
* up three 131.2 ([aed4dbc](https://github.com/iTowns/itowns/commit/aed4dbc))
* up to webpack 5. ([ea36982](https://github.com/iTowns/itowns/commit/ea36982))
* update packages. ([909e96e](https://github.com/iTowns/itowns/commit/909e96e))


### Documentation

* minor update on Controls documentation ([5f4ace1](https://github.com/iTowns/itowns/commit/5f4ace1))
* **Controls:** minor doc fixes ([d7c2ffa](https://github.com/iTowns/itowns/commit/d7c2ffa))



<a name="2.34.0"></a>
# [2.34.0](https://github.com/iTowns/itowns/compare/v2.33.0...v2.34.0) (2021-07-30)


### Features

* **GlobeControls:** add support for travel out animation ([9db6ecb](https://github.com/iTowns/itowns/commit/9db6ecb))
* **Label:** add support to pass custom domElements to labels ([b560005](https://github.com/iTowns/itowns/commit/b560005))
* **Layer:** add FeatureGeometryLayer. ([0961787](https://github.com/iTowns/itowns/commit/0961787))
* **StateControl:** add a method to modify class properties ([1e2e11e](https://github.com/iTowns/itowns/commit/1e2e11e))
* **Style:** add support for custom icon in labels ([7f355c4](https://github.com/iTowns/itowns/commit/7f355c4))
* **Style:** add support for custom label anchor ([fe2a2d9](https://github.com/iTowns/itowns/commit/fe2a2d9))
* **TMSSource:** add support for specific TileMatrix identifier ([e394255](https://github.com/iTowns/itowns/commit/e394255))
* **View:** add double right-click event ([9ce7213](https://github.com/iTowns/itowns/commit/9ce7213))


### Bug Fixes

* **3Dtiles:** remove debugger command. ([0a06614](https://github.com/iTowns/itowns/commit/0a06614))
* **eventToViewCoord:** check if event.offset properties are defined ([26f459a](https://github.com/iTowns/itowns/commit/26f459a))
* **example:** generate correct URL when sharing EPT example ([8ef0b34](https://github.com/iTowns/itowns/commit/8ef0b34))
* **FeatureToolTip:** fix tooltip legend icon ([f632308](https://github.com/iTowns/itowns/commit/f632308))
* **Label:** fix occlusion between icons and label text ([29b6435](https://github.com/iTowns/itowns/commit/29b6435))
* **Label:** fix Style.text.offset parameter ([26b970b](https://github.com/iTowns/itowns/commit/26b970b))
* **Label:** rounds the projected coordinates of labels ([5d0ca6f](https://github.com/iTowns/itowns/commit/5d0ca6f))
* **LayeredMaterialNodeProcessing:** checks for source cache with the layer crs for command cancellation ([7570cad](https://github.com/iTowns/itowns/commit/7570cad))
* **tutorial:** fix internal link in tutorials ([ce8029c](https://github.com/iTowns/itowns/commit/ce8029c))


### Examples

* add an example where user can define custom controls ([00e62c2](https://github.com/iTowns/itowns/commit/00e62c2))
* **GeoJSON raster:** center the camera initial position on the displayed features ([8d8ac2c](https://github.com/iTowns/itowns/commit/8d8ac2c))
* **geojson-file:** refactor example to illustrate two ways of displaying data from a file ([4bc0774](https://github.com/iTowns/itowns/commit/4bc0774))
* **vectorTile:** replace expired source in vector tile examples ([8ccc1a3](https://github.com/iTowns/itowns/commit/8ccc1a3))


### Code Refactoring

* **GlobeControls:** switch travel animation to StateControl ([d99827d](https://github.com/iTowns/itowns/commit/d99827d))
* **View:** eventToViewCoords returns middle view coords by default ([2e501c3](https://github.com/iTowns/itowns/commit/2e501c3))


### Workflow and chores

* release v2.34.0 ([4fe8baa](https://github.com/iTowns/itowns/commit/4fe8baa))
* expose 3dtiles process methods. ([7a94570](https://github.com/iTowns/itowns/commit/7a94570))
* update packages. ([50cd744](https://github.com/iTowns/itowns/commit/50cd744))


### Documentation

* **FeatureGeometryLayer:** add jsdoc to documentation config ([e77f102](https://github.com/iTowns/itowns/commit/e77f102))
* **README:** update deprecated link ([b483e0d](https://github.com/iTowns/itowns/commit/b483e0d))
* **README:** update integration badge to github action ([4c77adf](https://github.com/iTowns/itowns/commit/4c77adf))
* **Style:** add precision on doc ([bcee39f](https://github.com/iTowns/itowns/commit/bcee39f))
* **tutorials:** add support to sort tutorials in sections ([e9c8510](https://github.com/iTowns/itowns/commit/e9c8510))


### Others

* **Fundamentals:** add links to documentation ([cf30e37](https://github.com/iTowns/itowns/commit/cf30e37))
* **Fundamentals:** change section titles ([296206f](https://github.com/iTowns/itowns/commit/296206f))
* **Fundamentals:** change tutorial links appearance ([ac167ec](https://github.com/iTowns/itowns/commit/ac167ec))
* add tutorials on how to use iTowns ([5916ac9](https://github.com/iTowns/itowns/commit/5916ac9))
* resize tutorial images ([bbb91e7](https://github.com/iTowns/itowns/commit/bbb91e7))
* update html titles in some examples ([7ea6538](https://github.com/iTowns/itowns/commit/7ea6538))



<a name="2.33.0"></a>
# [2.33.0](https://github.com/iTowns/itowns/compare/v2.32.0...v2.33.0) (2021-05-28)


### Features

* **ColorLayer:** add custom shader to ColorLayer. ([2d32888](https://github.com/iTowns/itowns/commit/2d32888))
* **ColorLayer:** add option to filtering textures Layer. ([da245f9](https://github.com/iTowns/itowns/commit/da245f9))
* **Coordinates:** add applyMatrix4 method. ([061eda0](https://github.com/iTowns/itowns/commit/061eda0))


### Bug Fixes

* **CameraUtils:** count heading in clockwise direction ([880c67d](https://github.com/iTowns/itowns/commit/880c67d))
* **CameraUtils:** fix rotation animation when start heading is 0 ([1ca0c17](https://github.com/iTowns/itowns/commit/1ca0c17))
* **CameraUtils:** the camera rotation animation take the shortest angle ([ae194d3](https://github.com/iTowns/itowns/commit/ae194d3))
* **Controls:** replace deprecated THREE.Quaternion.slerp. ([2e27408](https://github.com/iTowns/itowns/commit/2e27408))
* **debug:** update coordinates event on mouse move ([9b62770](https://github.com/iTowns/itowns/commit/9b62770))
* **Feature:** wrong condition to choose extent crs projection. ([73198c7](https://github.com/iTowns/itowns/commit/73198c7))
* **FeatureToolTip:** avoid undefined layer on move. ([6ae7305](https://github.com/iTowns/itowns/commit/6ae7305))
* **FileSource:** transform extent source if is needed. ([0177503](https://github.com/iTowns/itowns/commit/0177503))
* **GeojsonParser:** store geojson properties within a separate property ([121b796](https://github.com/iTowns/itowns/commit/121b796))
* **LabelLayer:** init LabelLayer visibility with attached ColorLayer. ([67f25a1](https://github.com/iTowns/itowns/commit/67f25a1))
* **LayeredMaterialNodeProcessing:** prevent errors in layer update when removing layer ([d9fda75](https://github.com/iTowns/itowns/commit/d9fda75))
* **PlanarControls:** prevent freezing zoom when clicking while zooming with an orthographic camera ([b0f0a2d](https://github.com/iTowns/itowns/commit/b0f0a2d))
* **test:** use Extent.applyMatrix4 and Coordinates.applyMatrix4. ([bdf50ab](https://github.com/iTowns/itowns/commit/bdf50ab))


### Examples

* add custom shader effect example. ([15163d9](https://github.com/iTowns/itowns/commit/15163d9))
* change buildings id for coloring ([3f7ccd0](https://github.com/iTowns/itowns/commit/3f7ccd0))


### Code Refactoring

* **ColorLayer:** add effect type ColorLayer parameter. ([19d58c6](https://github.com/iTowns/itowns/commit/19d58c6))
* **ColorLayer:** remove useless features in ColorLayer command. ([66ee340](https://github.com/iTowns/itowns/commit/66ee340))
* **example:** remove unuseless variable. ([041b62a](https://github.com/iTowns/itowns/commit/041b62a))
* **Feature:** compute and apply local transform matrix in Feature. ([e244f55](https://github.com/iTowns/itowns/commit/e244f55))
* **Feature:** declare constant in file begining. ([f44c29e](https://github.com/iTowns/itowns/commit/f44c29e))
* **Feature:** FeatureCollection extends by Object3D and use local transform matrix. ([8d20315](https://github.com/iTowns/itowns/commit/8d20315))
* **Feature:** normalize crs projection. ([f9df7ff](https://github.com/iTowns/itowns/commit/f9df7ff))
* **Feature:** remove optionsFeature from FeatureCollection. ([b15c642](https://github.com/iTowns/itowns/commit/b15c642))
* **Feature:** replace parsing option withNormal and withAltitude by structure. ([420ba1a](https://github.com/iTowns/itowns/commit/420ba1a))
* **Feature:** simplify build extent check. ([0091a5a](https://github.com/iTowns/itowns/commit/0091a5a))
* **Layer:** deprecate labelEnable option Layer and replace by addLabelLayer. ([082d22c](https://github.com/iTowns/itowns/commit/082d22c))
* **ShaderChunk:** introduce shader chunk manager class to instance ShaderChunk. ([e93ed76](https://github.com/iTowns/itowns/commit/e93ed76))
* **Source:** avoid to cache raster data in Source. ([521ca74](https://github.com/iTowns/itowns/commit/521ca74))
* **Style/Convert:** move options from Converter to Style. ([23de259](https://github.com/iTowns/itowns/commit/23de259))
* **VectorTileParser:** remove unnecessary parameters. ([860d748](https://github.com/iTowns/itowns/commit/860d748))


### Workflow and chores

* release v2.33.0 ([b1cb970](https://github.com/iTowns/itowns/commit/b1cb970))
* **chart.js:** update chart.js to 3.0. ([6953e01](https://github.com/iTowns/itowns/commit/6953e01))
* update packages. ([0f54e2e](https://github.com/iTowns/itowns/commit/0f54e2e))


### Documentation

* **FeatureCollection:** clarify FeatureCollection.extent projection. ([f612eb3](https://github.com/iTowns/itowns/commit/f612eb3))
* **View:** add diffuse parameter documentation. ([fcc16da](https://github.com/iTowns/itowns/commit/fcc16da))


### Tests

* **unit:** update unit tests with feature refactoring. ([cbe3e68](https://github.com/iTowns/itowns/commit/cbe3e68))


### BREAKING CHANGES

* **Style/Convert:** * `GeometryLayer.convert` options are moved in Style properties. Use
  * `Style.xxx.color`
  * `Style.xxx.base_altitude`
  * `Style.fill.extrusion_height`
  * `Style.stroke.width`
  * `Style.point.radius`
* `overrideAltitudeInToZero` layer options is removed use `Style.xxx.base_altitude` instead.
* **CameraUtils:** The headings used in CameraUtils are now counted clockwise (they were
previously counted counter-clockwise).
* **Feature:** FeatureCollection and Feature signature constructor are changed.



<a name="2.32.0"></a>
# [2.32.0](https://github.com/iTowns/itowns/compare/v2.31.0...v2.32.0) (2021-04-09)


### Features

* **PlanarControls:** add max and min resolution parameters to limit zoom ([ad17590](https://github.com/iTowns/itowns/commit/ad17590))
* **PlanarControls:** Add property 'Cursor' and method 'setCursor' for cursor modification ([0870ede](https://github.com/iTowns/itowns/commit/0870ede))
* **Style:** support mapbox expression. ([0581d3d](https://github.com/iTowns/itowns/commit/0581d3d))


### Bug Fixes

* **Atmosphere:** avoid several realistic atmosphere initializations. ([b949f75](https://github.com/iTowns/itowns/commit/b949f75))
* **Camera:** resize preserves the scale ([e44de7f](https://github.com/iTowns/itowns/commit/e44de7f))
* **extent:** forget copy zoom in Extent#transformedCopy. ([1a607ea](https://github.com/iTowns/itowns/commit/1a607ea))
* **Extent:** forgetting zoom property copy, in Extent.as(). ([3efea0e](https://github.com/iTowns/itowns/commit/3efea0e))
* **Label:** wrong div translate. ([5ef7197](https://github.com/iTowns/itowns/commit/5ef7197))
* **PlanarControls:** fix drag when moving out of view domElement ([a4f0a3f](https://github.com/iTowns/itowns/commit/a4f0a3f))
* **PlanarControls:** prevent triggering new movement when already moving ([66256bb](https://github.com/iTowns/itowns/commit/66256bb))
* **test:** apply async icon label loading. ([76d732a](https://github.com/iTowns/itowns/commit/76d732a))
* **test:** update label test with default icon size. ([72a98d4](https://github.com/iTowns/itowns/commit/72a98d4))
* **test:** update vector tile style test with context expression. ([c9fc662](https://github.com/iTowns/itowns/commit/c9fc662))
* **VectorTileSource:** failing to open mapbox url format. ([b6dd383](https://github.com/iTowns/itowns/commit/b6dd383))


### Examples

* **Orthographic:** add resolution limit parameters in orthographic examples ([aafd37b](https://github.com/iTowns/itowns/commit/aafd37b))
* add atmosphere mars example. ([27e28ad](https://github.com/iTowns/itowns/commit/27e28ad))
* update irrelevant titles in some examples ([2914286](https://github.com/iTowns/itowns/commit/2914286))


### Code Refactoring

* **Atmosphere:** move realistic atmosphere options to Atmosphere constructor. ([234a8ee](https://github.com/iTowns/itowns/commit/234a8ee))
* **Source:** remove extentsInsideLimit. ([035701b](https://github.com/iTowns/itowns/commit/035701b))
* **VectorTilesSource:** remove useless styles by zoom. ([baabbae](https://github.com/iTowns/itowns/commit/baabbae))


### Workflow and chores

* release v2.32.0 ([95c6f37](https://github.com/iTowns/itowns/commit/95c6f37))
* update packages. ([e9ae835](https://github.com/iTowns/itowns/commit/e9ae835))


### Documentation

* **GeometryLayer:** fix example and typo regarding Object3D ([d77c8d6](https://github.com/iTowns/itowns/commit/d77c8d6))
* **TMSSource:** add example in doc ([dce0032](https://github.com/iTowns/itowns/commit/dce0032))



<a name="2.31.0"></a>
# [2.31.0](https://github.com/iTowns/itowns/compare/v2.30.0...v2.31.0) (2021-03-02)


### Bug Fixes

* **GlobeLayer:** doesn't subdivise the pole tile mesh. ([53a9f6f](https://github.com/iTowns/itowns/commit/53a9f6f))
* **PlanarControls:** fix pan movement ([5be30b7](https://github.com/iTowns/itowns/commit/5be30b7))
* **PlanarControls:** standardize zoom factors for perspective and orthographic camera ([c65bbab](https://github.com/iTowns/itowns/commit/c65bbab))
* **Points:** remove THREE.Geometry. ([6ff3b3d](https://github.com/iTowns/itowns/commit/6ff3b3d))
* **RasterColorTile:** wrong getter name. ([1f7eb05](https://github.com/iTowns/itowns/commit/1f7eb05))


### Examples

* correct zoom factor parameter in examples ([a86e3f8](https://github.com/iTowns/itowns/commit/a86e3f8))


### Code Refactoring

* **Debug:** simplified point debug code. ([c99fb09](https://github.com/iTowns/itowns/commit/c99fb09))
* **GlobeControls:** refactor zoom speed management ([57f6666](https://github.com/iTowns/itowns/commit/57f6666))
* **Immersive:** replace Matrix4.makeBasisFromMatrix by Matrix4.setFromMatrix3. ([d442602](https://github.com/iTowns/itowns/commit/d442602))
* **MaterialLayer:** MaterialLayer to RasterNode. ([46b19f1](https://github.com/iTowns/itowns/commit/46b19f1))
* **PlanarControls:** refactor zoom speed management ([ca47389](https://github.com/iTowns/itowns/commit/ca47389))
* **points:** avoid clone point material. ([174a60f](https://github.com/iTowns/itowns/commit/174a60f))
* **RasterTile:** rename file. ([c73fc38](https://github.com/iTowns/itowns/commit/c73fc38))
* **View:** remove useless getParentLayer method ([6f0b545](https://github.com/iTowns/itowns/commit/6f0b545))
* **View:** simplify getLayerById method. ([58874ec](https://github.com/iTowns/itowns/commit/58874ec))


### Workflow and chores

* release v2.31.0 ([c3f5e47](https://github.com/iTowns/itowns/commit/c3f5e47))
* update package-lock.json. ([b3e81fc](https://github.com/iTowns/itowns/commit/b3e81fc))
* **deps-dev:** bump marked from 1.2.9 to 2.0.0 ([46bc3f9](https://github.com/iTowns/itowns/commit/46bc3f9))
* update packages. ([09f12c9](https://github.com/iTowns/itowns/commit/09f12c9))


### Tests

* **MaterialLayer:** update tests with the MaterialLayer refactoring. ([0fa3c06](https://github.com/iTowns/itowns/commit/0fa3c06))



<a name="2.30.0"></a>
# [2.30.0](https://github.com/iTowns/itowns/compare/v2.29.2...v2.30.0) (2021-02-05)


### Features

* **CameraUtils:** add possibility to set camera placement from an extent ([d6b2ab4](https://github.com/iTowns/itowns/commit/d6b2ab4))
* **VectorTilesSource:** store parsed vector tile style as class property ([bb581fb](https://github.com/iTowns/itowns/commit/bb581fb))


### Bug Fixes

* **Camera:** rename intersectSphere to intersectsSphere ([f5e1004](https://github.com/iTowns/itowns/commit/f5e1004))
* **examples:** rename smartZoom param in vector_tile_raster_2d ([ca7aaeb](https://github.com/iTowns/itowns/commit/ca7aaeb))
* **examples:** update three version in view_mutli_25d ([7778a4d](https://github.com/iTowns/itowns/commit/7778a4d))
* **Terrain:** use exact method to compute min and max elevation node; ([6297c09](https://github.com/iTowns/itowns/commit/6297c09))


### Examples

* **OrthographicCamera:** set camera initial position from an extent ([6c10ba2](https://github.com/iTowns/itowns/commit/6c10ba2))


### Code Refactoring

* **Camera:** refactor Camera as an ES6 class ([596cee6](https://github.com/iTowns/itowns/commit/596cee6))
* **Camera:** remove matrixProjectionNeedsUpdate. ([a501c92](https://github.com/iTowns/itowns/commit/a501c92))
* **debug:** remove three r124 warning. ([9c2406f](https://github.com/iTowns/itowns/commit/9c2406f))
* **layer:** introduce RasterLayer. ([e7b2653](https://github.com/iTowns/itowns/commit/e7b2653))
* **Layer:** Layer constructor parameter needs Source. ([11b8645](https://github.com/iTowns/itowns/commit/11b8645))


### Workflow and chores

* release v2.30.0 ([e69e170](https://github.com/iTowns/itowns/commit/e69e170))
* update packages. ([a5d2cad](https://github.com/iTowns/itowns/commit/a5d2cad))



<a name="2.29.2"></a>
## [2.29.2](https://github.com/iTowns/itowns/compare/v2.29.1...v2.29.2) (2021-01-26)


### Bug Fixes

* **3dTile:** don't overload the b3dm material. ([d7f14b6](https://github.com/iTowns/itowns/commit/d7f14b6))
* **PlanarControls:** fix zoom movement with an orthographic camera ([999851a](https://github.com/iTowns/itowns/commit/999851a))


### Code Refactoring

* **view:** add vector target viewToNormalizedCoords. ([b83a9c8](https://github.com/iTowns/itowns/commit/b83a9c8))


### Workflow and chores

* release v2.29.2 ([62365ea](https://github.com/iTowns/itowns/commit/62365ea))



<a name="2.29.1"></a>
## [2.29.1](https://github.com/iTowns/itowns/compare/v2.29.0...v2.29.1) (2021-01-22)


### Bug Fixes

* **PlanarControls:** fix issues related to cameraOrtho feature ([475c788](https://github.com/iTowns/itowns/commit/475c788))


### Workflow and chores

* release v2.29.1 ([3c71abc](https://github.com/iTowns/itowns/commit/3c71abc))


### Documentation

* update some deprecated doc ([d16c796](https://github.com/iTowns/itowns/commit/d16c796))
* **Camera:** modify camera.adjustAltitudeToAvoidCollisionWithLayer doc ([aabe814](https://github.com/iTowns/itowns/commit/aabe814))
* **GlobeControl:** update class constructor doc ([6fb3d28](https://github.com/iTowns/itowns/commit/6fb3d28))
* **GlobeControls:** minor correction ([7230b53](https://github.com/iTowns/itowns/commit/7230b53))
* **View:** update doc of View.getMeterToPixel method ([cc2385c](https://github.com/iTowns/itowns/commit/cc2385c))



<a name="2.29.0"></a>
# [2.29.0](https://github.com/iTowns/itowns/compare/v2.28.1...v2.29.0) (2021-01-21)


### Features

* **controls:** add damping factor property. ([22d962d](https://github.com/iTowns/itowns/commit/22d962d))
* **controls:** add option enable smart travel in planarControls ([a31873d](https://github.com/iTowns/itowns/commit/a31873d))
* **orthographic camera:** add support for an orthographic camera ([de0dba6](https://github.com/iTowns/itowns/commit/de0dba6))
* **points:** apply opacity classification on others MODE. ([e411425](https://github.com/iTowns/itowns/commit/e411425))
* **webgl:** support pick position from depth buffer with ortho ([05fb79f](https://github.com/iTowns/itowns/commit/05fb79f))


### Bug Fixes

* **ColorLayer:** wrong white to opacity effect. ([9666822](https://github.com/iTowns/itowns/commit/9666822))
* **controls:** moving camera after disabling collision. ([2dd8e06](https://github.com/iTowns/itowns/commit/2dd8e06))
* **controls:** remove prevent default in mouseDown. ([c866807](https://github.com/iTowns/itowns/commit/c866807))
* **examples:** fix key events in examples ([c187616](https://github.com/iTowns/itowns/commit/c187616))
* **PlanarControls:** remove previously instantiated controls associated ([2726101](https://github.com/iTowns/itowns/commit/2726101))
* **PlanarControls:** reset focus policy default parameters ([b56aaaf](https://github.com/iTowns/itowns/commit/b56aaaf))
* **test:** update a deprecated method call ([497d55e](https://github.com/iTowns/itowns/commit/497d55e))
* **workflow:** wrong path to build docs link. ([066f54a](https://github.com/iTowns/itowns/commit/066f54a))


### Examples

* **orthographic camera:** add examples of PlanarView with an orthographic camera ([d58c1b6](https://github.com/iTowns/itowns/commit/d58c1b6))


### Code Refactoring

* **Three:** remove deprecated matrix method. ([fffef40](https://github.com/iTowns/itowns/commit/fffef40))
* **Three:** remove deprecated quaternion method. ([f435fef](https://github.com/iTowns/itowns/commit/f435fef))


### Workflow and chores

* release v2.29.0 ([8c69ef6](https://github.com/iTowns/itowns/commit/8c69ef6))
* add action github to release and npm publish. ([eef3d53](https://github.com/iTowns/itowns/commit/eef3d53))
* add bump script. ([9e0f7b6](https://github.com/iTowns/itowns/commit/9e0f7b6))
* add changelog script. ([f7f6c40](https://github.com/iTowns/itowns/commit/f7f6c40))
* add github action to continuous integration ([e8e4f01](https://github.com/iTowns/itowns/commit/e8e4f01))
* add script to unit tests coverage. ([7c128ab](https://github.com/iTowns/itowns/commit/7c128ab))
* prepare migrating to webpack 5. ([9a549d4](https://github.com/iTowns/itowns/commit/9a549d4))
* refactoring debug npm script. ([b56f8b0](https://github.com/iTowns/itowns/commit/b56f8b0))
* **example:** rename start zoom to smart travel in key bindings description ([24c7c2b](https://github.com/iTowns/itowns/commit/24c7c2b))
* remove deprecated babel-polyfill ([2e3de03](https://github.com/iTowns/itowns/commit/2e3de03))
* remove useless integration files. ([349e1b4](https://github.com/iTowns/itowns/commit/349e1b4))
* update actions/setup-node to v2. ([e3e31c0](https://github.com/iTowns/itowns/commit/e3e31c0))
* upgrade and update lock file version to 2.0. ([537345b](https://github.com/iTowns/itowns/commit/537345b))
* **deps:** bump ini from 1.3.5 to 1.3.7 ([fd46fd1](https://github.com/iTowns/itowns/commit/fd46fd1))
* update packages. ([34ee221](https://github.com/iTowns/itowns/commit/34ee221))


### Documentation

* **workflow:** bump and changelog scripts. ([01bf159](https://github.com/iTowns/itowns/commit/01bf159))


### Others

* Update LICENSE.md ([28be05c](https://github.com/iTowns/itowns/commit/28be05c))
* Change comment on workflow remove old artifact ([7fcbb3a](https://github.com/iTowns/itowns/commit/7fcbb3a))
* Update actions checkout to v2 ([9094edc](https://github.com/iTowns/itowns/commit/9094edc))
* Update remove-old-artifacts.yml ([0a9911f](https://github.com/iTowns/itowns/commit/0a9911f))
* Create remove-old-artifacts.yml ([617326c](https://github.com/iTowns/itowns/commit/617326c))
