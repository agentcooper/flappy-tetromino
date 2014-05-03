/*
 * @example
 *   random(0, 5)            // => random integer between 0 and 5
 *   random(['a', 'b', 'c']) // => random array item
 *   ranomd(1.0, 9.0, true)  // => random float between 1.0 and 9.0
 */
function random(from, to, floats) {
    if (Array.isArray(from)) {
        return from[ random(0, from.length - 1) ];
    }

    if (floats) {
        return (Math.random() * (to - from) + from);
    }

    return Math.floor(Math.random() * (to - from + 1)) + from;
}

/*
 * @param {THREE.Geometry} blockGeometry Block geometry (box, sphere, etc.)
 * @param {Number}         offset        Size of the block
 * @param {Array}          grid          2D-Array of 0's and 1's
 * @param {THREE.Material} material
 */
function renderGrid(blockGeometry, offset, grid, material) {
    var model,
        geometry = new THREE.Geometry();

    for (var j = 0; j < grid.length; j++) {
        for (var i = 0; i < grid[0].length; i++) {

            if (grid[j][i]) {
                var block = new THREE.Mesh(blockGeometry);

                block.position.set(offset * i, offset * j, 0);

                THREE.GeometryUtils.merge(geometry, block);
                
            }
        }
    }

    geometry.mergeVertices();

    THREE.GeometryUtils.center(geometry);

    model = new THREE.Mesh(geometry, material);

    removeInternalFaces(model);

    return model;
}

/*
 * Centroid property is removed from THREE.Face in r67,
 */
function getCentroid(geometry, face) {
    var v = new THREE.Vector3(0, 0, 0);

    v.add(geometry.vertices[face.a]);
    v.add(geometry.vertices[face.b]);
    v.add(geometry.vertices[face.c]);
    
    return v.divideScalar(3);
}

// @TODO: optimize face deletions
function removeInternalFaces(block) {
    var geometry = block.geometry;
    var face;
    var toDelete = [];
    var blockRaycaster = new THREE.Raycaster();

    // raycast itself from the center of each face (negated normal),
    // and whichever face gets intersected is an inner face
    for (i = 0; i < geometry.faces.length; i++) {
        face = geometry.faces[i];
        if (face) {
            normal = face.normal.clone();
            normal.negate();
            
            blockRaycaster.set(getCentroid(geometry, face), normal);
            intersects = blockRaycaster.intersectObject(block);
            
            for (j = 0; j < intersects.length; j++) {
                toDelete.push(intersects[j].faceIndex);
            }
        }
    }

    // actually delete them
    for (i = 0; i < toDelete.length; i++) {
        delete geometry.faces[toDelete[i]];
    }

    geometry.faces = geometry.faces.filter(function(v) { return v; });
    geometry.elementsNeedUpdate = true;
}
