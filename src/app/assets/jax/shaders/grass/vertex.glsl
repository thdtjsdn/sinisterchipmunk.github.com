//= require "shaders/functions/perlin_height_map"
//= require "shaders/functions/noise"

uniform mat4 imvMatrix;
uniform vec3 objSpaceCamPos;

shared attribute vec2 VERTEX_TEXCOORDS;
shared attribute vec3 VERTEX_NORMAL;
shared attribute vec4 VERTEX_POSITION, VERTEX_COLOR, VERTEX_TANGENT;

attribute vec3 OBJECT_POSITION;
uniform float TIME;

vec3 WIND_DIRECTION = vec3(1,0,0);
float WIND_STRENGTH = 1.0;

vec3 CalcTranslation(in vec3 vpos) {
  vec3 rpos = findRealPosition(OBJECT_POSITION), preferred = vpos;
  
  float blade_length = length(vpos - rpos);
  
  float s = (snoise(vec3(rpos.xz / 5.0, TIME*0.25))) + 0.5;
  preferred += WIND_DIRECTION * WIND_STRENGTH * s * (VERTEX_TEXCOORDS.y*VERTEX_TEXCOORDS.y);
  
  preferred = normalize(preferred - rpos) * blade_length + rpos;
  
  return preferred;
}

void main(void) {
  vBaseColor = VERTEX_COLOR;
  vTexCoords = VERTEX_TEXCOORDS;
  vColorVariance = (cnoise(OBJECT_POSITION.xz*10.0)+1.0)/1.0;

  vec4 vpos = vec4(findRealPosition(VERTEX_POSITION.xyz), VERTEX_POSITION.w);
  vec3 norm = VERTEX_NORMAL;

  if (VERTEX_TEXCOORDS.y <= 0.1) {
    
    // hold the bottom vertex stationary
    
    vNormal = nMatrix * norm;
    vSurfacePos = (mvMatrix * vpos).xyz;
    gl_Position = pMatrix * mvMatrix * vpos;
  } else {

    // animate the upper vertices
    
    vec3 objtrns = CalcTranslation(vpos.xyz);
    vec3 tpos = objtrns;
    vec3 tnrm = normalize(norm * 1.0 + objtrns - vpos.xyz);

    vNormal = nMatrix * tnrm;
    vSurfacePos = (mvMatrix * vec4(tpos, vpos.w)).xyz;
    gl_Position = pMatrix * mvMatrix * vec4(tpos, vpos.w);
  }
}
