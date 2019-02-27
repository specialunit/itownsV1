#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/pitUV>
#include <itowns/color_layers_pars_fragment>
#if MODE == MODE_FINAL
#include <itowns/fog_pars_fragment>
#include <itowns/overlay_pars_fragment>
#include <itowns/lighting_pars_fragment>
#endif
#include <itowns/mode_pars_fragment>

uniform vec3        diffuse;
uniform float       opacity;
uniform float       horizonDistance;
varying vec3        vUv; // WGS84.x/PM.x, WGS84.y, PM.y

void main() {
    #include <logdepthbuf_fragment>

#if MODE == MODE_ID

    #include <itowns/mode_id_fragment>

#elif MODE == MODE_DEPTH

    #include <itowns/mode_depth_fragment>

#else

    gl_FragColor = vec4(diffuse, opacity);

    uvs[CRS_WGS84] = vec3(vUv.xy, 0.);
    uvs[CRS_PM]    = vec3(vUv.x, fract(vUv.z), floor(vUv.z));

    vec4 color;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_FS_TEXTURES; i ++ ) {
        color = getLayerColor( i , colorTextures[ i ], colorOffsetScales[ i ], colorLayers[ i ]);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
    }

  #if defined(DEBUG)
    if (showOutline) {
        #pragma unroll_loop
        for ( int i = 0; i < NUM_CRS; i ++) {
            color = getOutlineColor( outlineColors[ i ], uvs[ i ].xy);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
        }
    }
  #endif

    #include <itowns/fog_fragment>
    #include <itowns/lighting_fragment>
    #include <itowns/overlay_fragment>

    float a = horizonDistance / ( 800.0 * 6378137.0);
    float factor = 10.0 / (1.0 + exp(-a*(fogDepth - horizonDistance)));

    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), factor);


    // if (fogDepth > horizonDistance && fogDepth < (horizonDistance + 20000.0)) {
    //     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // }

#endif
}
