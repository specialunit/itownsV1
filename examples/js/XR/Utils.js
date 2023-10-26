/**
 * Reads parameter contextXR.showDebug
 */
const XRUtils = {};

XRUtils.objects = [];

XRUtils.updateDebugVisibilities = function(showDebugValue) {
    XRUtils.objects.forEach((obj) => { obj.visible = showDebugValue;});
    contextXR.visibleBbox.visible = showDebugValue;
    view.notifyChange();
}

XRUtils.showPosition = function(name, coordinates, color, radius = 50, isDebug = false) {
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
        XRUtils.addToScene(previousPos, isDebug);
        existingChild = previousPos;
    }
    return existingChild;
}

XRUtils.removeReference = function(name) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        view.scene.remove(existingChild);
        var indexToRemove = null;
        XRUtils.objects.forEach((child, index) => {if(child.name === name) { indexToRemove = index;} });
        XRUtils.objects.splice(indexToRemove, 1);
    } 
}

/**
 * 
 * @param {String} name 
 * @param {Vector3} coordinates 
 * @param {String} color hexa color
 */
XRUtils.addPositionPoints = function(name, coordinates, color, size, isDebug = false) {
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
        XRUtils.addToScene(particle, isDebug);
    }
}

XRUtils.showPositionVerticalLine = function(name, coordinates, color, upSize, isDebug = false) {
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
        XRUtils.addToScene(line, isDebug);
    }
}

XRUtils.renderdirectionArrow = function(name, originVector3, directionVector3, scale, color, isDebug = false) {
    var existingChild = findExistingRef(name);
    if(existingChild) {
        existingChild.setDirection(directionVector3);
        existingChild.position.copy(originVector3);
    }
    else {
        const arrow = new itowns.THREE.ArrowHelper(directionVector3, originVector3, scale, color);
        arrow.name = name;
        XRUtils.addToScene(arrow, isDebug);
    }
}

XRUtils.generateVRBox = function(object) {
    const objectBbox = new itowns.THREE.Box3();
    // better than object.geometry.computeBoundingBox(); as it copy parent position.
    objectBbox.setFromObject(object);
    object.VRBbox = objectBbox;
    object.VRBbox = new itowns.THREE.Box3Helper(object.VRBbox, 0xffff00);

    object.VRBbox.name = object.name +'_VRBbox';
    console.log('adding VRBbox to scene : ', object.name);
    // no need to add each bbox to the Utils memory
    view.scene.add(object.VRBbox);
    object.VRBbox.visible = false;
    return object.VRBbox;
}

XRUtils.updateBboxVisibility = function(object) {
    if(!contextXR.showDebug){
        return;
    }
    if(contextXR.visibleBbox && contextXR.visibleBbox === object.VRBbox){
        return;
    }
    // proper to box3Helper
    if(object.box) { 
        if (!object.visible) {
            resetPreviousVisibleeBbox();
            contextXR.visibleBbox = object;
            object.visible = true;
        }
    }
    else if(object.geometry) {
        if(!object.VRBbox) {
            XRUtils.generateVRBox(object);
        }
        if (!object.VRBbox.visible) {
            resetPreviousVisibleeBbox();
            contextXR.visibleBbox = object.VRBbox;
            object.VRBbox.visible = true;
        }
    } else if(contextXR.visibleBbox) {
        resetPreviousVisibleeBbox();
    }

    function resetPreviousVisibleeBbox() {
        if(contextXR.visibleBbox) {
            contextXR.visibleBbox.visible = false;
            contextXR.visibleBbox = undefined;
        }
    }
}

XRUtils.addToScene = function(object, isDebug) {
    console.log('adding object to scene : ', object.name);
    object.visible = !isDebug || (isDebug && contextXR.showDebug);
    view.scene.add(object);
    XRUtils.objects.push(object);
}

function findExistingRef(name) {
    var existingChild = undefined;
    view.scene.children.forEach((child) => {if(child.name === name) { existingChild = child;} });
    return existingChild;
}


