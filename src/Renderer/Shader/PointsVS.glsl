#include <common>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec4 vColor; // color_pars_vertex

#ifdef USE_POINTS_UV
    varying vec2 vUv;
    uniform mat3 uvTransform;
#endif

#define SOURCE_ID_GROUP 8.

uniform float size;
uniform float scale;

uniform bool picking;
uniform int mode;

uniform vec2 elevationRange;
uniform vec2 intensityRange;
uniform vec2 angleRange;

uniform sampler2D classificationTexture;
uniform sampler2D discreteTexture;
uniform sampler2D gradientTexture;
uniform sampler2D visiTexture;

uniform int sizeMode;
uniform float minAttenuatedSize;
uniform float maxAttenuatedSize;

attribute vec4 unique_id;
attribute float intensity;
attribute float classification;
attribute float pointSourceID;

attribute float returnNumber;
attribute float numberOfReturns;
attribute float scanAngle;

void main() {
    vec2 uv = vec2(classification/255., 0.5);

    vColor = vec4(1.0);
    if (picking) {
        vColor = unique_id;
    } else {
        if (mode == PNTS_MODE_CLASSIFICATION) {
            vColor = texture2D(classificationTexture, uv);
        } else if (mode == PNTS_MODE_NORMAL) {
            vColor.rgb = abs(normal);
        } else if (mode == PNTS_MODE_COLOR) {
#if defined(USE_COLOR)
            vColor.rgb = color.rgb;
#elif defined(USE_COLOR_ALPHA)
            vColor = color;
#endif
        } else if (mode == PNTS_MODE_RETURN_NUMBER) {
            vec2 uv = vec2(returnNumber/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_RETURN_TYPE) {
            float returnType;
            if (returnNumber > numberOfReturns) {
                returnType = 4.;
            } else if (returnNumber == 1.) {
                if (numberOfReturns == 1.) {
                    // single
                    returnType = 0.;
                } else {
                    // first
                    returnType = 1.;
                }
            } else {
                if (returnNumber == numberOfReturns) {
                    // last
                    returnType = 3.;
                } else {
                    // intermediate
                    returnType = 2.;
                }
            }
            vec2 uv = vec2(returnType/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_RETURN_COUNT) {
            vec2 uv = vec2(numberOfReturns/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_POINT_SOURCE_ID) {
            vec2 uv = vec2(mod(pointSourceID, SOURCE_ID_GROUP)/255., 0.5);
            vColor = texture2D(discreteTexture, uv);
        } else if (mode == PNTS_MODE_SCAN_ANGLE) {
            float i = (scanAngle - angleRange.x) / (angleRange.y - angleRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        } else if (mode == PNTS_MODE_INTENSITY) {
            float i = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        } else if (mode == PNTS_MODE_ELEVATION) {
            float z = (modelMatrix * vec4(position, 1.0)).z;
            float i = (z - elevationRange.x) / (elevationRange.y - elevationRange.x);
            vec2 uv = vec2(i, (1. - i));
            vColor = texture2D(gradientTexture, uv);
        }
    }

    if (texture2D(visiTexture, uv).r == 0.) {
        vColor.a = 0.;
    }

#define USE_COLOR_ALPHA
#include <morphcolor_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <project_vertex>

    gl_PointSize = size;

    if (sizeMode == PNTS_SIZE_MODE_ATTENUATED) {
        bool isPerspective = isPerspectiveMatrix(projectionMatrix);

        if (isPerspective) {
            gl_PointSize *= scale / -mvPosition.z;
            gl_PointSize = clamp(gl_PointSize, minAttenuatedSize, maxAttenuatedSize);
        }
    }

#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
#include <worldpos_vertex>
#include <fog_vertex>
}
