/*
============
== POTREE ==
============

http://potree.org

Copyright (c) 2011-2020, Markus Schütz
All rights reserved.

    Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
    either expressed or implied, of the FreeBSD Project.
 */

import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Potree2Node from 'Core/Potree2Node';

import { PointAttribute, Potree2PointAttributes, PointAttributeTypes } from 'Core/Potree2PointAttributes';

const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

const typeNameAttributeMap = {
    double: PointAttributeTypes.DATA_TYPE_DOUBLE,
    float: PointAttributeTypes.DATA_TYPE_FLOAT,
    int8: PointAttributeTypes.DATA_TYPE_INT8,
    uint8: PointAttributeTypes.DATA_TYPE_UINT8,
    int16: PointAttributeTypes.DATA_TYPE_INT16,
    uint16: PointAttributeTypes.DATA_TYPE_UINT16,
    int32: PointAttributeTypes.DATA_TYPE_INT32,
    uint32: PointAttributeTypes.DATA_TYPE_UINT32,
    int64: PointAttributeTypes.DATA_TYPE_INT64,
    uint64: PointAttributeTypes.DATA_TYPE_UINT64,
};

function parseAttributes(jsonAttributes) {
    const attributes = new Potree2PointAttributes();

    const replacements = {
        rgb: 'rgba',
    };

    for (const jsonAttribute of jsonAttributes) {
        const { name, numElements, min, max } = jsonAttribute;

        const type = typeNameAttributeMap[jsonAttribute.type];

        const potreeAttributeName = replacements[name] ? replacements[name] : name;

        const attribute = new PointAttribute(potreeAttributeName, type, numElements);

        if (numElements === 1) {
            attribute.range = [min[0], max[0]];
        } else {
            attribute.range = [min, max];
        }

        if (name === 'gps-time') { // HACK: Guard against bad gpsTime range in metadata, see potree/potree#909
            if (attribute.range[0] === attribute.range[1]) {
                attribute.range[1] += 1;
            }
        }

        attribute.initialRange = attribute.range;

        attributes.add(attribute);
    }

    {
        // check if it has normals
        const hasNormals =
            attributes.attributes.find(a => a.name === 'NormalX') !== undefined &&
            attributes.attributes.find(a => a.name === 'NormalY') !== undefined &&
            attributes.attributes.find(a => a.name === 'NormalZ') !== undefined;

        if (hasNormals) {
            const vector = {
                name: 'NORMAL',
                attributes: ['NormalX', 'NormalY', 'NormalZ'],
            };
            attributes.addVector(vector);
        }
    }

    return attributes;
}

/**
 * @property {boolean} isPotreeLayer - Used to checkout whether this layer
 * is a Potree2Layer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 */
class Potree2Layer extends PointCloudLayer {
    /**
     * Constructs a new instance of Potree2 layer.
     *
     * @constructor
     * @extends PointCloudLayer
     *
     * @example
     * // Create a new point cloud layer
     * const points = new Potree2Layer('points',
     *  {
     *      source: new Potree2Source({
     *          url: 'https://pointsClouds/',
     *          file: 'metadata.json',
     *      }
     *  });
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} config - Configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     * @param {string} [config.crs=ESPG:4326] - The CRS of the {@link View} this
     * layer will be attached to. This is used to determine the extent of this
     * layer.  Default to `EPSG:4326`.
     */
    constructor(id, config) {
        super(id, config);
        this.isPotreeLayer = true;

        const resolve = this.addInitializationStep();

        this.root = [];
        this.source.whenReady
            .then((metadata) => {
                this.scale = new THREE.Vector3(1, 1, 1);
                this.metadata = metadata;
                this.pointAttributes = parseAttributes(metadata.attributes);
                this.spacing = metadata.spacing;

                const normal = Array.isArray(this.pointAttributes.attributes) &&
                this.pointAttributes.attributes.find(elem => elem.name.startsWith('NORMAL'));
                if (normal) {
                    this.material.defines[normal.name] = 1;
                }

                const min = new THREE.Vector3(...metadata.boundingBox.min);
                const max = new THREE.Vector3(...metadata.boundingBox.max);
                const boundingBox = new THREE.Box3(min, max);

                const root = new Potree2Node(0, 0, this);
                root.bbox = boundingBox;
                root.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());

                root.id = 'r';
                root.depth = 0;
                root.nodeType = 2;
                root.hierarchyByteOffset = 0n;
                root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);

                root.byteOffset = 0;

                this.root.push(root);

                return root.loadOctree().then(resolve);
            });
    }
}

export default Potree2Layer;
