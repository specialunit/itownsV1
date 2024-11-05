#define USE_COLOR_ALPHA

#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

uniform vec3 diffuse;
uniform float opacity;

uniform bool picking;
uniform int shape;

void main() {

// Early discard (clipping planes and shape)
#include <clipping_planes_fragment>
    if (shape == PNTS_SHAPE_CIRCLE) {
        //circular rendering in glsl
        if ((length(gl_PointCoord - 0.5) > 0.5)) {
            discard;
        }
    }

#include <logdepthbuf_fragment>

    vec4 diffuseColor = vec4(diffuse, opacity);
#include <map_particle_fragment>
#include <color_fragment>

#include <alphatest_fragment>
#include <alphahash_fragment>

    vec3 outgoingLight = diffuseColor.rgb;
#include <opaque_fragment> // gl_FragColor
#include <tonemapping_fragment>
#include <fog_fragment>
#include <premultiplied_alpha_fragment>

}
