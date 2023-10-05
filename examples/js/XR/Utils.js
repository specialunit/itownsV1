const XRUtils = {};

XRUtils.showPosition = function(name, coordinates, color, radius = 50) {
    var existingChild = findExistingRef(name);

    if(existingChild) {
        existingChild.position.copy(coordinates);
    }
    else {
        const previousPos = new itowns.THREE.Mesh(
            new itowns.THREE.SphereGeometry( radius, 16, 8 ),
            new itowns.THREE.MeshBasicMaterial( { color: color, wireframe: true } )
        );
        previousPos.name = name;
        previousPos.position.copy(coordinates);
        view.scene.add(previousPos);
        existingChild = previousPos;
    }
    return existingChild;
}

XRUtils.removeReference = function(name) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        view.scene.remove(existingChild);
    } else {
        console.log('no object to remove:', name);
    }
}

/**
 * 
 * @param {String} name 
 * @param {Vector3} coordinates 
 * @param {String} color hexa color
 */
XRUtils.addPositionPoints = function(name, coordinates, color, size) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        var verticesUpdated = existingChild.geometry.attributes.position.array.values().toArray();
        verticesUpdated.push(coordinates.x, coordinates.y, coordinates.z);
        existingChild.geometry.setAttribute( 'position', new itowns.THREE.Float32BufferAttribute(verticesUpdated, 3));
    }
    else {
        const geometry = new itowns.THREE.BufferGeometry();
        const vertices = [];
        vertices.push(coordinates.x, coordinates.y, coordinates.z);
        const material = new itowns.THREE.PointsMaterial({ size: size, color: color });
        geometry.setAttribute( 'position', new itowns.THREE.Float32BufferAttribute(vertices, 3));
        var particle = new itowns.THREE.Points( geometry, material );
        particle.name = name;
        view.scene.add(particle);
    }
}

XRUtils.showPositionVerticalLine = function(name, coordinates, color, upSize) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        existingChild.position.copy(coordinates);
        existingChild.lookAt(new itowns.THREE.Vector3(0, 0, 1));
    }
    else {
        const points = [];
        points.push(new itowns.THREE.Vector3(0,0,0));
        // upward direction
        points.push(new itowns.THREE.Vector3(0, 0, -upSize));
        const line = new itowns.THREE.Line(
            new itowns.THREE.BufferGeometry().setFromPoints(points),
            new itowns.THREE.LineBasicMaterial({ color: color }));
        line.position.copy(coordinates);
        //necessary to "look" vertically
        line.lookAt(new itowns.THREE.Vector3(0, 0, 1));
        line.name = name;
        view.scene.add(line);
    }
}

XRUtils.renderdirectionArrow = function(name, originVector3, directionVector3, scale, color) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        existingChild.setDirection(directionVector3);
        existingChild.position.copy(originVector3);
    }
    else {
        const arrow = new itowns.THREE.ArrowHelper(directionVector3, originVector3, scale, color);
        arrow.name = name;
        view.scene.add(arrow);
    }
}

function findExistingRef(name) {
    var existingChild = undefined;
    view.scene.children.forEach((child) => {if(child.name === name) { existingChild = child;} });
    return existingChild;
}
