//= require "shaders/functions/lights"

shared attribute vec4 VERTEX_POSITION, VERTEX_COLOR;
shared attribute vec3 VERTEX_NORMAL;
shared attribute vec2 VERTEX_TEXCOORDS;

void main()
{
  // zero out values so we don't have undefined vectors all over the place
  hatchWeight1 = hatchWeight2 = vec4(0);
  texCoord = vec2(0);

  texCoord = VERTEX_TEXCOORDS;
  texCoord.t = texCoord.t * 0.5;
	gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;
	
	vec3 normal = normalize(nMatrix * VERTEX_NORMAL);
	vec4 vertex = mvMatrix * VERTEX_POSITION;
  vec3 light;
  float att = calcAttenuation(vertex.xyz, light);
  light = normalize(light);
	
	float diffuseValue = max(dot(normal, light), 0.0);// * att;
	
	float hatchLevel = diffuseValue * 6.0;
	
	if (hatchLevel >= 6.0)
	{
		hatchWeight1.x = 1.0;
	}
	else if (hatchLevel >= 4.0)
	{
		hatchWeight1.x = 1.0 - (5.0 - hatchLevel);
		hatchWeight1.y = 1.0 - hatchWeight1.x;
	}
	else if (hatchLevel >= 3.0)
	{
		hatchWeight1.y = 1.0 - (4.0 - hatchLevel);
		hatchWeight1.z = 1.0 - hatchWeight1.y;
	}
	else if (hatchLevel >= 2.0)
	{
		hatchWeight1.z = 1.0 - (3.0 - hatchLevel);
		hatchWeight2.x = 1.0 - hatchWeight1.z;
	}
	else if (hatchLevel >= 1.0)
	{
		hatchWeight2.x = 1.0 - (2.0 - hatchLevel);
		hatchWeight2.y = 1.0 - hatchWeight2.x;
	}
	else
	{
		hatchWeight2.y = 1.0 - (1.0 - hatchLevel);
		hatchWeight2.z = 1.0 - hatchWeight1.y;
	}	
}
