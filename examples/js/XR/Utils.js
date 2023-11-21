/**
 * Reads parameter contextXR.showDebug
 */
const XRUtils = {};

XRUtils.objects = [];

XRUtils.updateDebugVisibilities = (showDebugValue) => {
    XRUtils.objects.forEach((obj) => { obj.visible = showDebugValue; });
    if (contextXR.visibleBbox) {
        contextXR.visibleBbox.visible = showDebugValue;
    }
    view.notifyChange();
};

XRUtils.showPosition = (name, coordinates, color, radius = 50, isDebug = false) => {
    let existingChild = findExistingRef(name);

    if (existingChild) {
        existingChild.position.copy(coordinates);
        existingChild.scale.copy(new itowns.THREE.Vector3(1, 1, 1)).multiplyScalar(radius);
    } else {
        const previousPos = new itowns.THREE.Mesh(
            new itowns.THREE.SphereGeometry(1, 16, 8),
            new itowns.THREE.MeshBasicMaterial({ color: color, wireframe: true }),
        );
        previousPos.name = name;
        previousPos.position.copy(coordinates);
        previousPos.scale.multiplyScalar(radius);
        XRUtils.addToScene(previousPos, isDebug);
        existingChild = previousPos;
    }
    return existingChild;
};

XRUtils.removeReference = (name) => {
    const existingChild = findExistingRef(name);
    if (existingChild) {
        view.scene.remove(existingChild);
        let indexToRemove = null;
        XRUtils.objects.forEach((child, index) => { if (child.name === name) { indexToRemove = index; } });
        XRUtils.objects.splice(indexToRemove, 1);
    } 
};

/**
 * 
 * @param {*} name 
 * @param {*} coordinates 
 * @param {*} color hexa color
 * @param {*} size 
 * @param {*} isDebug 
 */
XRUtils.addPositionPoints = (name, coordinates, color, size, isDebug = false) => {
    const existingChild = findExistingRef(name);
    if (existingChild) {
        const verticesUpdated = existingChild.geometry.attributes.position.array.values().toArray();
        verticesUpdated.push(coordinates.x, coordinates.y, coordinates.z);
        existingChild.geometry.setAttribute('position', new itowns.THREE.Float32BufferAttribute(verticesUpdated, 3));
    } else {
        const geometry = new itowns.THREE.BufferGeometry();
        const vertices = [];
        vertices.push(coordinates.x, coordinates.y, coordinates.z);
        const material = new itowns.THREE.PointsMaterial({ size: size, color: color });
        geometry.setAttribute('position', new itowns.THREE.Float32BufferAttribute(vertices, 3));
        const particle = new itowns.THREE.Points(geometry, material);
        particle.name = name;
        XRUtils.addToScene(particle, isDebug);
    }
};

/**
 * 
 * @param {*} name 
 * @param {*} coordinates 
 * @param {*} color hexa color
 * @param {*} upSize 
 * @param {*} isDebug 
 */
XRUtils.showPositionVerticalLine = (name, coordinates, color, upSize, isDebug = false) => {
    const existingChild = findExistingRef(name);
    if (existingChild) {
        existingChild.position.copy(coordinates);
        existingChild.lookAt(new itowns.THREE.Vector3(0, 0, 1));
    } else {
        const points = [];
        points.push(new itowns.THREE.Vector3(0, 0, 0));
        // upward direction
        points.push(new itowns.THREE.Vector3(0, 0, -upSize));
        const line = new itowns.THREE.Line(
            new itowns.THREE.BufferGeometry().setFromPoints(points),
            new itowns.THREE.LineBasicMaterial({ color: color }));
        line.position.copy(coordinates);
        // necessary to "look" vertically
        line.lookAt(new itowns.THREE.Vector3(0, 0, 1));
        line.name = name;
        XRUtils.addToScene(line, isDebug);
    }
};

/**
 * 
 * @param {*} name 
 * @param {*} originVector3 
 * @param {*} directionVector3 
 * @param {*} scale 
 * @param {*} color hexa color
 * @param {*} isDebug 
 */
XRUtils.renderdirectionArrow = (name, originVector3, directionVector3, scale, color, isDebug = false) => {
    const existingChild = findExistingRef(name);
    if (existingChild) {
        existingChild.setDirection(directionVector3);
        existingChild.position.copy(originVector3);
    } else {
        const arrow = new itowns.THREE.ArrowHelper(directionVector3, originVector3, scale, color);
        arrow.name = name;
        XRUtils.addToScene(arrow, isDebug);
    }
};

/**
 * 
 * @param {Object3D} object 
 * @returns {Object3D}
 */
XRUtils.generateVRBox = (object) => {
    const objectBbox = new itowns.THREE.Box3();
    // better than object.geometry.computeBoundingBox(); as it copy parent position.
    objectBbox.setFromObject(object);
    object.VRBbox = objectBbox;
    object.VRBbox = new itowns.THREE.Box3Helper(object.VRBbox, 0xffff00);

    object.VRBbox.name = (object.name || object.uuid) + '_VRBbox';
    // console.log('adding VRBbox to scene : ', object.VRBbox.name);
    // no need to add each bbox to the Utils memory
    view.scene.add(object.VRBbox);
    object.VRBbox.visible = false;
    return object.VRBbox;
};

/**
 * 
 * @param {Object3D} object 
 * @returns 
 */
XRUtils.updateBboxVisibility = (object) => {
    if (!contextXR.showDebug) {
        return;
    }
    if (contextXR.visibleBbox && contextXR.visibleBbox === object.VRBbox) {
        return;
    }
    // proper to box3Helper
    if (object.box) { 
        if (!object.visible) {
            resetPreviousVisibleeBbox();
            contextXR.visibleBbox = object;
            object.visible = true;
        }
    } else if (object.geometry) {
        if (!object.VRBbox) {
            XRUtils.generateVRBox(object);
        }
        if (!object.VRBbox.visible) {
            resetPreviousVisibleeBbox();
            contextXR.visibleBbox = object.VRBbox;
            object.VRBbox.visible = true;
        }
    } else if (contextXR.visibleBbox) {
        resetPreviousVisibleeBbox();
    }

    function resetPreviousVisibleeBbox() {
        if (contextXR.visibleBbox) {
            contextXR.visibleBbox.visible = false;
            contextXR.visibleBbox = undefined;
        }
    }
};

/**
 * 
 * @param {Object3D} object 
 * @param {boolean} isDebug 
 */
XRUtils.addToScene = (object, isDebug) => {
    console.log('adding object to scene : ', object.name);
    object.visible = !isDebug || (isDebug && contextXR.showDebug);
    view.scene.add(object);
    XRUtils.objects.push(object);
};

function findExistingRef(name) {
    let existingChild;
    view.scene.children.forEach((child) => { if (child.name === name) { existingChild = child; } });
    return existingChild;
}


