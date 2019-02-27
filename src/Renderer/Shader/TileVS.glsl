#include <itowns/precision_qualifier>
#include <itowns/project_pars_vertex>
#include <itowns/elevation_pars_vertex>
#include <logdepthbuf_pars_vertex>
attribute float     uv_pm;
attribute vec2      uv_wgs84;
attribute vec3      normal;

uniform mat4 modelMatrix;
uniform bool lightingEnabled;

#if MODE == MODE_FINAL
#include <fog_pars_vertex>
varying vec3        vUv;
varying vec3        vNormal;
#endif
void main() {
        vec2 uv = vec2(uv_wgs84.x, 1.0 - uv_wgs84.y);

        #include <begin_vertex>
        #include <itowns/elevation_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
#if MODE == MODE_FINAL
        #include <fog_vertex>
        vUv = vec3(uv_wgs84, (uv_pm > 0.) ? uv_pm : uv_wgs84.y); // set pm=wgs84 if pm=0 (not computed)
        vNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
        fogDepth = length(mvPosition.xyz);
#endif
}
