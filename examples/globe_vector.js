/* global itowns, document, renderer, setupLoadingScreen */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 3.5, latitude: 44, altitude: 1000000 };
var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
setupLoadingScreen(viewerDiv, globeView);

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(globeView.addLayer('./layers/JSONLayers/Ortho.json'));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(globeView.addLayer('./layers/JSONLayers/WORLD_DTM.json'));
promises.push(globeView.addLayer('./layers/JSONLayers/IGN_MNT_HIGHRES.json'));

promises.push(globeView.addLayer({
    type: 'color',
    url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/croquis.kml',
    protocol: 'rasterizer',
    id: 'Kml',
    name: 'kml',
    transparent: true,
}));

promises.push(globeView.addLayer({
    type: 'color',
    url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/ULTRA2009.gpx',
    protocol: 'rasterizer',
    id: 'Gpx',
    name: 'Ultra 2009',
    transparent: true,
}));

promises.push(globeView.addLayer({
    type: 'color',
    url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
    protocol: 'rasterizer',
    id: 'ariege',
    name: 'ariege',
    transparent: true,
    style: {
        fill: 'orange',
        fillOpacity: 0.5,
        stroke: 'white',
    },
}));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
