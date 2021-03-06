//= require "shaders/functions/noise"

uniform float time;
uniform sampler2D Flame, FlameMask, FlameNoise;

void main() {
  float t = time * 0.25;
  vec2 texCoords = vTexCoords.xy;
  
  vec4 mask = texture2D(FlameMask, vTexCoords);
  vec4 flame = texture2D(Flame, vTexCoords);
  
  texCoords.y -= t;
  vec4 noise1 = texture2D(FlameNoise, texCoords) * 2.0 - 1.0;
  texCoords.y -= t;
  vec4 noise2 = texture2D(FlameNoise, texCoords * 2.0) * 2.0 - 1.0;
  texCoords.y -= t;
  vec4 noise3 = texture2D(FlameNoise, texCoords * 3.0) * 2.0 - 1.0;
  
  vec4 finalNoise = noise1 + noise2 + noise3;
  float perturb = ((1.0 - vTexCoords.y) * 0.1) + 0.01;
  vec2 noiseCoords = finalNoise.xy * perturb + vTexCoords.xy;
  
  vec4 fireColor   = texture2D(Flame, noiseCoords);
  vec4 alphaColor  = texture2D(FlameMask, noiseCoords);
  fireColor.a = alphaColor.r;
  
  gl_FragColor = fireColor;
}
