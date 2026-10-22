shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec4 shallow_color : source_color = vec4(0.08, 0.46, 0.50, 1.0);
uniform vec4 deep_color : source_color = vec4(0.02, 0.19, 0.31, 1.0);
uniform float wave_height : hint_range(0.0, 0.3) = 0.085;
uniform float wave_speed : hint_range(0.0, 3.0) = 0.8;

varying float wave_value;

void vertex() {
    float w1 = sin(VERTEX.x * 0.13 + TIME * wave_speed);
    float w2 = cos(VERTEX.z * 0.18 - TIME * wave_speed * 0.74);
    float w3 = sin((VERTEX.x + VERTEX.z) * 0.085 + TIME * 0.45);
    wave_value = (w1 + w2 + w3) / 3.0;
    VERTEX.y += wave_value * wave_height;
}

void fragment() {
    float tint = clamp(0.42 + wave_value * 0.24, 0.0, 1.0);
    ALBEDO = mix(deep_color.rgb, shallow_color.rgb, tint);
    ROUGHNESS = 0.22;
    METALLIC = 0.04;
    SPECULAR = 0.7;
}
