Jax.environment = Jax.PRODUCTION;


Jax.Material.Depthmap = Jax.Class.create(Jax.Material, {
  initialize: function($super) {
    $super({shader:"depthmap"});
  }
});
Jax.LINEAR = 1;
Jax.EXPONENTIAL = 2;
Jax.EXP2 = 3;

Jax.Material.Fog = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    options = Jax.Util.normalizeOptions(options, {
      shader: "fog",
      algorithm: Jax.EXP2,
      start: 10.0,
      end: 100.0,
      density: 0.0015,
      color:[1,1,1,1]
    });
    options.color = Jax.Util.colorize(options.color);
    options.color = [options.color[0],options.color[1],options.color[2],options.color[3]];
    if (typeof(options.algorithm) == "string") {
      var name = options.algorithm;
      options.algorithm = Jax[name];
      if (!options.algorithm) throw new Error("Jax: Fog algorithm must be one of LINEAR, EXPONENTIAL, or EXP2");
    }
    $super(options);
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    uniforms.set('End', this.end);
    uniforms.set('Scale', 1.0 / (this.end - this.start));
    uniforms.set('Algorithm', this.algorithm);
    uniforms.set('Density', this.density);
    uniforms.set('FogColor', this.color);
  }
});
Jax.Material.Lighting = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    $super(Jax.Util.normalizeOptions(options, {shader: "lighting"}));
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    var light = context.world.lighting.getLight();
    uniforms.set({
      LIGHTING_ENABLED: context.world.lighting.isEnabled() && !(options.unlit),
      LIGHT_POSITION: light.getPosition(),
      LIGHT_DIRECTION: light.getDirection(),
      LIGHT_AMBIENT: light.getAmbientColor(),
      LIGHT_DIFFUSE: light.getDiffuseColor(),
      LIGHT_SPECULAR: light.getSpecularColor(),
      LIGHT_ATTENUATION_CONSTANT: light.getConstantAttenuation(),
      LIGHT_ATTENUATION_LINEAR: light.getLinearAttenuation(),
      LIGHT_ATTENUATION_QUADRATIC: light.getQuadraticAttenuation(),
      LIGHT_SPOT_EXPONENT: light.getSpotExponent(),
      LIGHT_SPOT_COS_CUTOFF: light.getSpotCosCutoff(),
      LIGHT_ENABLED: light.isEnabled(),
      LIGHT_TYPE: light.getType()
    });
  }
});
Jax.Material.NormalMap = Jax.Class.create(Jax.Material, {
  initialize: function($super, map) {
    this.map = Jax.Material.Texture.normalizeTexture(map);
    $super({shader:"normal_map"});
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);
    uniforms.texture('NormalMap', this.map, context);
  },

  setAttributes: function($super, context, mesh, options, attributes) {
    $super(context, mesh, options, attributes);
    attributes.set('VERTEX_TANGENT', mesh.getTangentBuffer());
  }
});
Jax.Material.Paraboloid = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    $super(Jax.Util.normalizeOptions(options, {shader:"paraboloid"}));
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    uniforms.set({
      DP_SHADOW_NEAR: 0.1, //c.world.lighting.getLight().getDPShadowNear() || 0.1;}},
      DP_SHADOW_FAR:  500,//c.world.lighting.getLight().getDPShadowFar() || 500;}},
      DP_DIRECTION: options && options.direction || 1
    });
  }
});
Jax.Material.Picking = Jax.Class.create(Jax.Material, {
  initialize: function($super) {
    $super({shader:"picking"});
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    model_index = options.model_index;
    if (model_index == undefined) model_index = -1;

    uniforms.set('INDEX', model_index);
  }
});
Jax.Material.ShadowMap = Jax.Class.create(Jax.Material, {
  initialize: function($super) {
    $super({shader:"shadow_map"});
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    uniforms.set({
      DP_SHADOW_NEAR: 0.1, //c.world.lighting.getLight().getDPShadowNear() || 0.1;}},
      DP_SHADOW_FAR: 500,//c.world.lighting.getLight().getDPShadowFar() || 500;}},

      SHADOWMAP_PCF_ENABLED: false,
      SHADOWMAP_MATRIX: context.world.lighting.getLight().getShadowMatrix(),
      SHADOWMAP_ENABLED: context.world.lighting.getLight().isShadowMapEnabled()
    });

    var light = context.world.lighting.getLight(), front, back;

    front = light.getShadowMapTextures(context)[0];
    back  = light.getShadowMapTextures(context)[1];

    if (front) uniforms.texture('SHADOWMAP0', front, context);
    if (back)  uniforms.texture('SHADOWMAP1', back,  context);
  }
});
Jax.Material.Texture = Jax.Class.create(Jax.Material, {
  initialize: function($super, texture) {
    this.texture = Jax.Material.Texture.normalizeTexture(texture);
    $super({shader:"texture"});
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);
    uniforms.texture('Texture', this.texture, context);
    uniforms.set('TextureScaleX', this.texture.options.scale_x || this.texture.options.scale || 1);
    uniforms.set('TextureScaleY', this.texture.options.scale_y || this.texture.options.scale || 1);
  }
});

Jax.Material.Texture.normalizeTexture = function(tex) {
  if (tex.isKindOf && tex.isKindOf(Jax.Texture)) return tex;
  return new Jax.Texture(tex);
};
var BlenderModel = (function() {
  return Jax.Model.create({
    after_initialize: function() {
      var self = this;
      self.color = Jax.Util.colorize(self.color);
      self.mesh = new Jax.Mesh({
        material: self.material,
        color: self.color,
        lit: self.lit,

        init: function(vertices, colors, texCoords, normals, indices) {
          if (self.data) {
            function push(source, dest, scale) {
              if (!scale) scale = 1.0;
              for (i = 0; source && i < source.length; i++)
                dest.push(source[i] * scale);
            }

            var i, j;
            for (var meshName in self.data)
            {
              var meshData = self.data[meshName];
              push(meshData.vertices, vertices, self.scale);
              push(meshData.indices, indices);
              push(meshData.normals, normals);

              self.mesh.default_material = new Jax.Material({
                layers:[
                  {type:"Lighting"}
                ]
              });

              if (self.isLit())
                self.mesh.default_material.addLayer(new Jax.Material.ShadowMap());

              self.dataRegion = new Jax.DataRegion();
              self.mesh.colorLayers = [];
              for (i = 0; meshData.colors && i < meshData.colors.length; i++) {
                self.mesh.colorLayers[i] = self.dataRegion.map(Float32Array, meshData.colors[i]);
                var buffer = new Jax.DataBuffer(GL_ARRAY_BUFFER, self.mesh.colorLayers[i], 3);
                self.mesh.default_material.addLayer(new Jax.Material.BlenderColorLayer({dataBuffer:buffer}));
              }
            }
          }
        }
      });

      if (self.path) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status == 200) { // success
              self.data(JSON.parse(xhr.responseText));
            } else { // error
              self.xhrError = xhr.status+" ("+self.method+" "+self.path+" - async: "+self.async+")";
            }
          }
        };
        xhr.open(self.method, self.path, self.async);
        xhr.send(null);
      }
    },

    render: function($super, context, options) {
      if (typeof(this.unlit) != "undefined")
        options = Jax.Util.normalizeOptions(options, {unlit:this.unlit});
      if (this.data)
        $super(context, options);
      if (this.xhrError) {
        throw new Error("AJAX error: "+this.xhrError);
        this.xhrError = null;
      }
    },

    data: function(data) {
      this.data = data;
      this.mesh.rebuild();
    }
  });
})();
Jax.Material.BlenderColorLayer = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    options = Jax.Util.normalizeOptions(options, {
      shader: "blender_color_layer"
    });
    if (!options.dataBuffer) throw new Error("Data buffer is required");
    $super(options);
  },

  setAttributes: function($super, context, mesh, options, attributes) {
    attributes.set('COLOR', this.dataBuffer);
  }
});
var Box = (function() {
  var bufs = {};

  return Jax.Class.create({
    initialize: function() {
      /*
      this.position = vec3.create();
      */
      this.halfSize = vec3.create();
      this.center = vec3.create();

      switch(arguments.length) {
        case 0: break;
        case 6:
          this.center[0] = arguments[0];
          this.center[1] = arguments[1];
          this.center[2] = arguments[2];
          this.halfSize[0] = arguments[3];
          this.halfSize[1] = arguments[4];
          this.halfSize[2] = arguments[5];
          break;
        case 2:
          vec3.set(arguments[0], this.center);
          vec3.set(arguments[1], this.halfSize);
          break;
        case 1:
          vec3.set(arguments[0].getCenter(), this.center);
          vec3.set(arguments[0].getHalfSize(), this.halfSize);
          break;
        default: throw new Error("invalid arguments");
      }
    },

    toString: function() {
      return "[Box center:"+this.center+"; half-size:"+this.halfSize+"]";
    },

    getHalfSize: function() { return this.halfSize; },
    getCenter: function() { return this.center; },
    getVolume: function() { return this.halfSize[0] * this.halfSize[1] * this.halfSize[2] * 8; },

    intersectRay: function(O, D, segmax) {
      if (segmax != undefined) return this.intersectLineSegment(O, D, segmax);

      var abs_segdir = vec3.create();
      var abs_cross = vec3.create();
      var f;
      var diff = vec3.create();
      var size = vec3.scale(this.halfSize, 2, vec3.create());
      var cross = vec3.create();

      vec3.subtract(O, this.center, diff);

      for(i=0;i<3;i++)
      {
        abs_segdir[i] = Math.abs(D[i]);
        if (Math.abs(diff[i]) > size[i] && diff[i]*D[i] >= 0)
          return false;
      }

      vec3.cross(D, diff, cross);

      abs_cross[0] = Math.abs(cross[0]);
      f = size[1]*abs_segdir[2] + size[2]*abs_segdir[1];
      if (abs_cross[0] > f)
          return false;

      abs_cross[1] = Math.abs(cross[1]);
      f = size[0]*abs_segdir[2] + size[2]*abs_segdir[0];
      if (abs_cross[1] > f)
          return false;

      abs_cross[2] = Math.abs(cross[2]);
      f = size[0]*abs_segdir[1] + size[1]*abs_segdir[0];
      if (abs_cross[2] > f)
          return false;

      return true;
    },

    intersectLineSegment: function(O, D, segmax) {
      var tmp = vec3.create();

      if (segmax != undefined) {
        if (!isFinite(segmax)) return intersect(O,D); // infinite ray
        vec3.scale(D, segmax, tmp);
      } else {
        vec3.subtract(D, O, tmp);
        vec3.create();
        D = vec3.normalize(D, vec3.create());
      }

      var a0, a1, b0, b1;
      for (var i = 0; i < 3; i++) {
        a0 = this.center[i] - this.halfSize[i];
        a1 = this.center[i] + this.halfSize[i];
        b0 = O[i];
        b1 = O[i] + tmp[i];
        var c;

        if (b0 < a0) { if (a0 >= b1) return false; }
        else           if (b0 >= a1) return false;
      }
      return true;
    },

    intersectSphere: function(O, radius) {
      var mx = vec3.create();
      vec3.add(this.center, this.halfSize, mx);

      var dist = 0, d, ci;
      for(var i=0;i<3;i++)
      {
        ci = this.center[i] - this.halfSize[i];
        if (O[i] < ci)
        {
          d = O[i] - ci;
          dist += d*d;
        }
        else
        if (O[i] > mx[i])
        {
          d = O[i] - mx[i];
          dist += d*d;
        }
      }
      return (dist <= (radius*radius));
    },

    intersectPoint: function(p) {
      var pos = this.center;
      var s = this.halfSize;
      if (p[0] < pos[0] - s[0] || p[0] > pos[0] + s[0]) return false;
      if (p[1] < pos[1] - s[1] || p[1] > pos[1] + s[1]) return false;
      if (p[2] < pos[2] - s[2] || p[2] > pos[2] + s[2]) return false;
      return true;
    },

    intersectAABB: function(b) {
      var t1 = this.center;
      var t2 = vec3.create();
      var p1 = b.getCenter();
      var p2 = vec3.create();
      var bhs = b.getHalfSize();
      vec3.add(t1, this.halfSize, t2);
      vec3.add(p1, bhs, p2);

      return (Math.max(p1[0] - bhs[0], t1[0] - this.halfSize[0]) <= Math.min(p2[0], t2[0]) &&
              Math.max(p1[1] - bhs[1], t1[1] - this.halfSize[1]) <= Math.min(p2[1], t2[1]) &&
              Math.max(p1[2] - bhs[2], t1[2] - this.halfSize[2]) <= Math.min(p2[2], t2[2]));
    },

    intersectOBB: function(b, matrix) {

      var Pa = bufs.Pa = bufs.Pa || vec3.create(),
          Ax = vec3.UNIT_X, Ay = vec3.UNIT_Y, Az = vec3.UNIT_Z,
          Wa = this.halfSize[0], Ha = this.halfSize[1], Da = this.halfSize[2];

      var Pb = bufs.Pb = bufs.Pb || vec3.create(),
          Bx = bufs.Bx = bufs.Bx || vec3.create(),
          By = bufs.By = bufs.By || vec3.create(),
          Bz = bufs.Bz = bufs.Bz || vec3.create(),
          Wb = b.halfSize[0], Hb = b.halfSize[1], Db = b.halfSize[2];

      vec3.set(this.center, Pa);
      vec3.set(b.center, Pb);
      vec3.set(vec3.UNIT_X, Bx);
      vec3.set(vec3.UNIT_Y, By);
      vec3.set(vec3.UNIT_Z, Bz);

      mat4.multiplyVec3(matrix, Pb, Pb);

      var nm = bufs.nm = bufs.nm || mat3.create();
      mat4.toInverseMat3(matrix, nm);
      mat3.transpose(nm);
      mat3.multiplyVec3(nm, Bx, Bx);
      mat3.multiplyVec3(nm, By, By);
      mat3.multiplyVec3(nm, Bz, Bz);

      var T = bufs.T = bufs.T || vec3.create();
      vec3.subtract(Pb, Pa, T);

      var Rxx = vec3.dot(Ax, Bx), Rxy = vec3.dot(Ax, By), Rxz = vec3.dot(Ax, Bz);
      if (Math.abs(vec3.dot(T, Ax)) > Wa + Math.abs(Wb * Rxx) + Math.abs(Hb * Rxy) + Math.abs(Db * Rxz))
        return false;

      var Ryx = vec3.dot(Ay, Bx), Ryy = vec3.dot(Ay, By), Ryz = vec3.dot(Ay, Bz);
      if (Math.abs(vec3.dot(T, Ay)) > Ha + Math.abs(Wb * Ryx) + Math.abs(Hb * Ryy) + Math.abs(Db * Ryz))
        return false;

      var Rzx = vec3.dot(Az, Bx), Rzy = vec3.dot(Az, By), Rzz = vec3.dot(Az, Bz);
      if (Math.abs(vec3.dot(T, Az)) > Da + Math.abs(Wb * Rzx) + Math.abs(Hb * Rzy) + Math.abs(Db * Rzz))
        return false;

      if (Math.abs(vec3.dot(T, Bx)) > Wb + Math.abs(Wa * Rxx) + Math.abs(Ha * Ryx) + Math.abs(Da * Rzx))
        return false;

      if (Math.abs(vec3.dot(T, By)) > Hb + Math.abs(Wa * Rxy) + Math.abs(Ha * Ryy) + Math.abs(Da * Rzy))
        return false;

      if (Math.abs(vec3.dot(T, Bz)) > Db + Math.abs(Wa * Rxz) + Math.abs(Ha * Ryz) + Math.abs(Da * Rzz))
        return false;

      if (Math.abs(vec3.dot(T, Az) * Ryx - vec3.dot(T, Ay) * Rzx) > Math.abs(Ha * Rzx) + Math.abs(Da * Ryx) + Math.abs(Hb * Rxz) + Math.abs(Db * Rxy))
        return false;

      if (Math.abs(vec3.dot(T, Az) * Ryy - vec3.dot(T, Ay) * Rzy) > Math.abs(Ha * Rzy) + Math.abs(Da * Ryy) + Math.abs(Wb * Rxz) + Math.abs(Db * Rxx))
        return false;

      if (Math.abs(vec3.dot(T, Az) * Ryz - vec3.dot(T, Ay) * Rzz) > Math.abs(Ha * Rzz) + Math.abs(Da * Ryz) + Math.abs(Wb * Rxy) + Math.abs(Hb * Rxx))
        return false;

      if (Math.abs(vec3.dot(T, Ax) * Rzx - vec3.dot(T, Az) * Rxx) > Math.abs(Wa * Rzx) + Math.abs(Da * Rxx) + Math.abs(Hb * Ryz) + Math.abs(Db * Ryy))
        return false;

      if (Math.abs(vec3.dot(T, Ax) * Rzy - vec3.dot(T, Az) * Rxy) > Math.abs(Wa * Rzy) + Math.abs(Da * Rxy) + Math.abs(Wb * Ryz) + Math.abs(Db * Ryx))
        return false;

      if (Math.abs(vec3.dot(T, Ax) * Rzz - vec3.dot(T, Az) * Rxz) > Math.abs(Wa * Rzz) + Math.abs(Da * Rxz) + Math.abs(Wb * Ryy) + Math.abs(Hb * Ryx))
        return false;

      if (Math.abs(vec3.dot(T, Ay) * Rxx - vec3.dot(T, Ax) * Ryx) > Math.abs(Wa * Ryx) + Math.abs(Ha * Rxx) + Math.abs(Hb * Rzz) + Math.abs(Db * Rzy))
        return false;

      if (Math.abs(vec3.dot(T, Ay) * Rxy - vec3.dot(T, Ax) * Ryy) > Math.abs(Wa * Ryy) + Math.abs(Ha * Rxy) + Math.abs(Wb * Rzz) + Math.abs(Db * Rzx))
        return false;

      if (Math.abs(vec3.dot(T, Ay) * Rxz - vec3.dot(T, Ax) * Ryz) > Math.abs(Wa * Ryz) + Math.abs(Ha * Rxz) + Math.abs(Wb * Rzy) + Math.abs(Hb * Rzx))
        return false;

      return true;
    }
  });
})();
var BSP = (function() {
  function buildLevel(level) {
    var nextLevel = [];
    var plane = new Jax.Geometry.Plane();
    while (level.length > 0) {
      var front = level.shift(), back = null;
      var dist = vec3.create();
      var closest = null, closest_index;

      var result = front;
      if (level.length > 0) {
        for (var j = 0; j < level.length; j++) {
          var len = vec3.length(vec3.subtract(front.center, level[j].center, dist));
          if (closest == null || closest > len) {
            closest = len;
            closest_index = j;
          }
        }
        back = level[closest_index];
        level.splice(closest_index, 1);


        if (front instanceof Jax.Geometry.Triangle)
          plane.set(front.a, front.b, front.c);
        else {
          var tri = front.front;
          while (tri instanceof BSP) tri = tri.front;
          plane.set(tri.a, tri.b, tri.c);
        }

        if (plane.whereis(back.center) == Jax.Geometry.Plane.FRONT)
          result = new BSP(back, front);
        else result = new BSP(front, back);
      }

      nextLevel.push(result);
    }

    for (var i = 0; i < nextLevel.length; i++)
      level.push(nextLevel[i]);
  }

  function calcTriangleExtents(tri) {
    var min = vec3.create(), max = vec3.create();

    vec3.min(vec3.min(tri.a, tri.b, min), tri.c, min);
    vec3.max(vec3.max(tri.a, tri.b, max), tri.c, max);
    min_size = 0.01;
    for (var i = 0; i < 3; i++) {
      if (max[i] - min[i] < min_size * 2) {
        max[i] += min_size;
        min[i] -= min_size;
      }
    }

    return [min, max];
  }

  return Jax.Class.create({
    initialize: function(front, back) {
      this.front = null;
      this.back = null;
      this.triangles = [];
      if (front || back) this.set(front, back);
    },

    getRenderable: function(startDepth) {
      startDepth = startDepth || 0;

      var self = this;
      function p(n, v, c) {
        if (n.front instanceof BSP) p(n.front, v, c);
        if (n.back  instanceof BSP) p(n.back,  v, c);
        if (n.depth < startDepth) return;

        var _c = n.depth == 0 ? 1 : 1 / n.depth;
        for (var i = 0; i < 24; i++) c.push(_c,_c,_c,1);

        var hs = n.getHalfSize();

        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);

        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);
        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]-hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]-hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]-hs[1], n.center[2]+hs[2]);

        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]-hs[2]);
        v.push(n.center[0]+hs[0], n.center[1]+hs[1], n.center[2]+hs[2]);
      }
      return new Jax.Model({mesh: this.mesh = this.mesh || new Jax.Mesh({
        init: function(v, c) {
          this.draw_mode = GL_LINES;
          p(self, v, c);
        }
      })});
    },

    getClosestNode: function(point) {
      if (!this.front || !this.back) return this.front || this.back || this;
      var vec = vec3.create();
      var dist = vec3.length(vec3.subtract(this.front.center, point, vec));
      if (dist < vec3.length(vec3.subtract(this.back.center, point, vec)))
        return this.front;
      return this.back;
    },

    set: function(nodeFront, nodeBack) {
      this.front = nodeFront;
      this.back = nodeBack;
      this.calcBounds();
      this.box = new Box(this.center, this.halfSize);
    },

    collide: function(other, transform) {
      if (!this.finalized) this.finalize();
      if (!other.finalized) other.finalize();

      var checks = this.checks = this.checks || [{}];
      var check_id = 1;
      checks[0][0] = this;
      checks[0][1] = other;
      var tri = new Jax.Geometry.Triangle(), a = vec3.create(), b = vec3.create(), c = vec3.create();

      while (check_id > 0) {
        var check = checks[--check_id];
        var first = check[0], second = check[1];
        if (first instanceof BSP && second instanceof BSP) {
          if (first.box.intersectOBB(second.box, transform)) {
            while (checks.length - check_id < 4) checks.push([{}]);
            checks[check_id  ][0] = first.front;  checks[check_id  ][1] = second.front;
            checks[check_id+1][0] = first.back;   checks[check_id+1][1] = second.front;
            checks[check_id+2][0] = first.front;  checks[check_id+2][1] = second.back;
            checks[check_id+3][0] = first.back;   checks[check_id+3][1] = second.back;
            check_id += 4;
          }
        } else if (first instanceof Jax.Geometry.Triangle && second instanceof BSP) {
          while (checks.length - check_id < 2) checks.push([{}]);
          checks[check_id  ][0] = first; checks[check_id  ][1] = second.front;
          checks[check_id+1][0] = first; checks[check_id+1][1] = second.back;
          check_id += 2;
        } else if (first instanceof BSP && second instanceof Jax.Geometry.Triangle) {
          while (checks.length - check_id < 2) checks.push([{}]);
          checks[check_id  ][0] = first.front;  checks[check_id  ][1] = second;
          checks[check_id+1][0] = first.back;   checks[check_id+1][1] = second;
          check_id += 2;
        } else {
          mat4.multiplyVec3(transform, second.a, a);
          mat4.multiplyVec3(transform, second.b, b);
          mat4.multiplyVec3(transform, second.c, c);
          tri.set(a, b, c);

          if (first.intersectTriangle(tri)) {
            this.collision = {
              first: first,
              second: second,
              second_transformed: new Jax.Geometry.Triangle(tri.a, tri.b, tri.c)
            };
            return this.collision;
          }
        }
      }
      return false;
    },

    collideSphere: function(position, radius) {
      if (!this.finalized) this.finalize();

      var checks = this.checks = this.checks || [];
      var check_id = 1;
      checks[0] = this;

      while (check_id > 0) {
        var node = checks[--check_id];
        if (node instanceof BSP) {
          if (node.box.intersectSphere(position, radius)) {
            var d1 = this._dist1 = this._dist1 || vec3.create();

            var len1 = vec3.length(vec3.subtract(node.front.center, position, d1));
            var len2 = vec3.length(vec3.subtract(node.back.center, position, d1));

            if (len1 < len2) {
              checks[check_id  ] = node.front;
              checks[check_id+1] = node.back;
            } else {
              checks[check_id  ] = node.back;
              checks[check_id+1] = node.front;
            }

            check_id += 2;
          }
        } else {
          var collisionPoint = vec3.create();
          if (node.intersectSphere(position, radius, collisionPoint)) {
            var distance = vec3.length(vec3.subtract(collisionPoint, position, vec3.create()));
            this.collision = {
              triangle: node,
              collisionPoint: collisionPoint,
              penetration: radius - distance
            };
            return this.collision;
          }
        }
      }
      return false;
    },

    collideLineSegment: function(origin, direction, length) {
      if (!this.finalized) this.finalize();

      var checks = this.checks = this.checks || [];
      var check_id = 1;
      checks[0] = this;

      while (check_id > 0) {
        var node = checks[--check_id];
        if (node instanceof BSP) {
          if (node.box.intersectLineSegment(origin, direction, length)) {
            var d1 = this._dist1 = this._dist1 || vec3.create();

            var len1 = vec3.length(vec3.subtract(node.front.center, position, d1));
            var len2 = vec3.length(vec3.subtract(node.back.center, position, d1));

            if (len1 < len2) {
              checks[check_id  ] = node.front;
              checks[check_id+1] = node.back;
            } else {
              checks[check_id  ] = node.back;
              checks[check_id+1] = node.front;
            }

            check_id += 2;
          }
        } else {
          var collisionPoint = vec4.create();
          if (node.intersectRay(origin, direction, collisionPoint, length)) {
            this.collision = {
              triangle: node,
              collisionPoint: collisionPoint
            };
            return this.collision;
          }
        }
      }
      return false;
    },

    getCollision: function() { return this.collision; },

    getHalfSize: function() {
      return this.halfSize || this.calcBounds().halfSize;
    },

    calcBounds: function() {
      var min = vec3.create([ 0xffffffff,  0xffffffff,  0xffffffff]),
          max = vec3.create([-0xffffffff, -0xffffffff, -0xffffffff]);

      function calcSide(side) {
        var smin, smax;

        if (side instanceof Jax.Geometry.Triangle) {
          var v = calcTriangleExtents(side);
          smin = v[0];
          smax = v[1];
        } else {
          smin = vec3.subtract(side.center, side.getHalfSize(), vec3.create());
          smax = vec3.add(side.center, side.getHalfSize(), vec3.create());
        }

        vec3.min(min, smin, min);
        vec3.max(max, smax, max);
      }

      if (this.front) calcSide(this.front);
      if (this.back)  calcSide(this.back);

      this.size     = vec3.subtract(max, min, vec3.create());
      this.halfSize = vec3.scale(this.size, 0.5, vec3.create());
      this.center   = vec3.add(min, this.halfSize, vec3.create());

      return this;
    },

    getSize: function() {
      if (!this.halfSize) this.calcHalfSize();
      return this.size;
    },

    getCenter: function() {
      return this.center;
    },

    finalize: function() {
      var level = [];
      for (var i = 0; i < this.triangles.length; i++)
        level.push(this.triangles[i]);
      this.treeDepth = 1;
      while (level.length > 2) {
        buildLevel(level);
        this.treeDepth++;
      }
      this.set(level[0], level[1]);

      var depth = 0;
      var nodes = [this];
      this.depth = 0;
      while (nodes.length) {
        var x = nodes.shift();
        if (x.front) { x.front.depth = x.depth + 1; nodes.push(x.front); }
        if (x.back) { x.back.depth = x.depth + 1; nodes.push(x.back); }
      }

      this.finalized = true;
    },

    getDepth: function() { return this.depth; },

    getTreeDepth: function() { return this.treeDepth; },

    addTriangle: function(triangle) {
      this.triangles.push(triangle);
    },

    traverse: function(point, callback) {
      if (!this.front || !this.back) {
        var result = this.front || this.back;
        if (result instanceof BSP) result.traverse(point, callback);
        else callback(result);
        return;
      }

      var dist = vec3.create();
      vec3.subtract(this.front.center, point, dist);
      var frontLen = vec3.dot(dist, dist);
      vec3.subtract(this.back.center, point, dist);
      var backLen = vec3.dot(dist, dist);

      if (frontLen < backLen) {
        if (this.back instanceof BSP) this.back.traverse(point, callback);
        else callback(this.back);

        if (this.front instanceof BSP) this.front.traverse(point, callback);
        else callback(this.front);
      } else {
        if (this.front instanceof BSP) this.front.traverse(point, callback);
        else callback(this.front);

        if (this.back instanceof BSP) this.back.traverse(point, callback);
        else callback(this.back);
      }
    },

    addMesh: function(mesh) {
      var triangles = mesh.getTriangles();
      for (var i = 0; i < triangles.length; i++)
        this.addTriangle(triangles[i]);
    }
  });
})();
vec3.min = function(a, b, dest) {
  if (!dest) dest = vec3.create();

  dest[0] = Math.min(a[0], b[0]);
  dest[1] = Math.min(a[1], b[1]);
  dest[2] = Math.min(a[2], b[2]);

  return dest;
}

vec3.max = function(a, b, dest) {
  if (!dest) dest = vec3.create();

  dest[0] = Math.max(a[0], b[0]);
  dest[1] = Math.max(a[1], b[1]);
  dest[2] = Math.max(a[2], b[2]);

  return dest;
}
var ApplicationHelper = Jax.Helper.create({

});
var DungeonHelper = Jax.Helper.create({

});
var NoisyHelper = Jax.Helper.create({
  setupNoise: function(context, mesh, options, uniforms) {
    this.noise = this.noise || new Jax.Noise(context);
    uniforms.texture('permTexture', this.noise.perm, context);
    uniforms.texture('gradTexture', this.noise.grad, context);
    uniforms.texture('simplexTexture', this.noise.simplex, context);
    uniforms.set('TIME', Jax.uptime);
  }
});
var Dungeon = (function() {
  var DungeonMesh = Jax.Class.create(Jax.Mesh, {
    initialize: function($super, dungeon) {
      this.dungeon = dungeon;
      $super();
    },

    init: function(vertices, colors, texcoords, normals) {
      var ofs = 0.5; // offset from center of each grid node
      var map, row;

      function drawLeftWall(x, z) {
        vertices.push(x-ofs, -ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,0); normals.push( 1, 0, 0);
        vertices.push(x-ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 1, 0, 0);
        vertices.push(x-ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 1, 0, 0);
        vertices.push(x-ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 1, 0, 0);
        vertices.push(x-ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 1, 0, 0);
        vertices.push(x-ofs,  ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,1); normals.push( 1, 0, 0);

        /* ceiling - draw a half-arch in every direction that leads to a wall */
        var slices = 8, total_angle = Math.PI/2.0, s1, s2, t1, t2;
        for (var slice = 0; slice < slices; slice++) {
          s1 = s2 = t1 = t2 = 0;
          if (y < map.length-1 && x > 0 && map[y+1][x-1] != 'X') { t1 = t2 = 0.5; }
          if (y > 0 && x > 0 && map[y-1][x-1] != 'X') { s1 = s2 = 0.5; }

          var angle = total_angle/slices*slice, next_angle = total_angle/slices*(slice+1);
          var sin = Math.sin(angle), next_sin = Math.sin(next_angle),
              cos =-Math.cos(angle), next_cos =-Math.cos(next_angle);
          s1 *= 1+cos; t1 *= 1+cos; s2 *= 1+next_cos; t2 *= 1+next_cos;
          var v1 = 1/slices*slice, v2 = 1/slices*(slice+1);
          vertices.push(x-ofs+cos     *0.5+0.5,  ofs+sin,      z-ofs-s1); colors.push(1,1,1,1); texcoords.push(-s1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x-ofs+cos     *0.5+0.5,  ofs+sin,      z+ofs+t1); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x-ofs+next_cos*0.5+0.5,  ofs+next_sin, z-ofs-s2); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push(-next_cos, -next_sin, 0);
          vertices.push(x-ofs+next_cos*0.5+0.5,  ofs+next_sin, z-ofs-s2); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push(-next_cos, -next_sin, 0);
          vertices.push(x-ofs+cos     *0.5+0.5,  ofs+sin,      z+ofs+t1); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x-ofs+next_cos*0.5+0.5,  ofs+next_sin, z+ofs+t2); colors.push(1,1,1,1); texcoords.push(1+t2,v2); normals.push(-next_cos, -next_sin, 0);
        }
      }

      function drawFrontWall(x, z) {
        vertices.push(x-ofs, -ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,0); normals.push( 0, 0, 1);
        vertices.push(x+ofs, -ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 0, 0, 1);
        vertices.push(x-ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 0, 0, 1);
        vertices.push(x-ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 0, 0, 1);
        vertices.push(x+ofs, -ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 0, 0, 1);
        vertices.push(x+ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(1,1); normals.push( 0, 0, 1);

        /* ceiling - draw a half-arch in every direction that leads to a wall */
        var slices = 8, total_angle = Math.PI/2.0, s1, s2, t1, t2;
        for (var slice = 0; slice < slices; slice++) {
          s1 = s2 = t1 = t2 = 0;
          if (x < row.length-1 && y > 0 && map[y-1][x+1] != 'X') { t1 = t2 = 0.5; }
          if (x > 0 && y > 0 && map[y-1][x-1] != 'X') { s1 = s2 = 0.5; }

          var angle = total_angle/slices*slice, next_angle = total_angle/slices*(slice+1);
          var sin = Math.sin(angle), next_sin = Math.sin(next_angle),
              cos =-Math.cos(angle), next_cos =-Math.cos(next_angle);
          s1 *= 1+cos; t1 *= 1+cos; s2 *= 1+next_cos; t2 *= 1+next_cos;
          var v1 = 1/slices*slice, v2 = 1/slices*(slice+1);
          vertices.push(x-ofs-s1,  ofs+sin,      z-ofs+cos     *0.5+0.5); colors.push(1,1,1,1); texcoords.push(-s1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x+ofs+t1,  ofs+sin,      z-ofs+cos     *0.5+0.5); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x-ofs-s2,  ofs+next_sin, z-ofs+next_cos*0.5+0.5); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push( 0, -next_sin, -next_cos);
          vertices.push(x-ofs-s2,  ofs+next_sin, z-ofs+next_cos*0.5+0.5); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push( 0, -next_sin, -next_cos);
          vertices.push(x+ofs+t1,  ofs+sin,      z-ofs+cos     *0.5+0.5); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x+ofs+t2,  ofs+next_sin, z-ofs+next_cos*0.5+0.5); colors.push(1,1,1,1); texcoords.push(1+t2,v2); normals.push( 0, -next_sin, -next_cos);
        }
      }

      function drawRightWall(x, z) {
        vertices.push(x+ofs, -ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,0); normals.push(-1, 0, 0);
        vertices.push(x+ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push(-1, 0, 0);
        vertices.push(x+ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push(-1, 0, 0);
        vertices.push(x+ofs,  ofs, z-ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push(-1, 0, 0);
        vertices.push(x+ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push(-1, 0, 0);
        vertices.push(x+ofs,  ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,1); normals.push(-1, 0, 0);

        /* ceiling - draw a half-arch in every direction that leads to a wall */
        var slices = 8, total_angle = Math.PI/2.0, s1, s2, t1, t2;
        for (var slice = 0; slice < slices; slice++) {
          s1 = s2 = t1 = t2 = 0;
          if (y < map.length-1 && x < row.length-1 && map[y+1][x+1] != 'X') { t1 = t2 = 0.5; }
          if (y > 0 && x < row.length-1 && map[y-1][x+1] != 'X') { s1 = s2 = 0.5; }

          var angle = total_angle/slices*slice, next_angle = total_angle/slices*(slice+1);
          var sin = Math.sin(angle), next_sin = Math.sin(next_angle),
              cos = Math.cos(angle), next_cos = Math.cos(next_angle);
          s1 *= 1-cos; t1 *= 1-cos; s2 *= 1-next_cos; t2 *= 1-next_cos;
          var v1 = 1/slices*slice, v2 = 1/slices*(slice+1);
          vertices.push(x+ofs+cos     *0.5-0.5,  ofs+sin,      z-ofs-s1); colors.push(1,1,1,1); texcoords.push(-s1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x+ofs+cos     *0.5-0.5,  ofs+sin,      z+ofs+t1); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x+ofs+next_cos*0.5-0.5,  ofs+next_sin, z-ofs-s2); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push(-next_cos, -next_sin, 0);
          vertices.push(x+ofs+next_cos*0.5-0.5,  ofs+next_sin, z-ofs-s2); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push(-next_cos, -next_sin, 0);
          vertices.push(x+ofs+cos     *0.5-0.5,  ofs+sin,      z+ofs+t1); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push(-     cos, -     sin, 0);
          vertices.push(x+ofs+next_cos*0.5-0.5,  ofs+next_sin, z+ofs+t2); colors.push(1,1,1,1); texcoords.push(1+t2,v2); normals.push(-next_cos, -next_sin, 0);
        }
      }

      function drawBackWall(x, z) {
        vertices.push(x-ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(0,0); normals.push( 0, 0,-1);
        vertices.push(x+ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 0, 0,-1);
        vertices.push(x-ofs,  ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 0, 0,-1);
        vertices.push(x-ofs,  ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(0,1); normals.push( 0, 0,-1);
        vertices.push(x+ofs, -ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,0); normals.push( 0, 0,-1);
        vertices.push(x+ofs,  ofs, z+ofs); colors.push(1,1,1,1); texcoords.push(1,1); normals.push( 0, 0,-1);

        /* ceiling - draw a half-arch in every direction that leads to a wall */
        var slices = 8, total_angle = Math.PI/2.0, s1, s2, t1, t2;
        for (var slice = 0; slice < slices; slice++) {
          s1 = s2 = t1 = t2 = 0;
          if (x < row.length-1 && y < map.length-1 && map[y+1][x+1] != 'X') { t1 = t2 = 0.5; }
          if (x > 0 && y < map.length-1 && map[y+1][x-1] != 'X') { s1 = s2 = 0.5; }

          var angle = total_angle/slices*slice, next_angle = total_angle/slices*(slice+1);
          var sin = Math.sin(angle), next_sin = Math.sin(next_angle),
              cos = Math.cos(angle), next_cos = Math.cos(next_angle);
          s1 *= 1-cos; t1 *= 1-cos; s2 *= 1-next_cos; t2 *= 1-next_cos;
          var v1 = 1/slices*slice, v2 = 1/slices*(slice+1);
          vertices.push(x-ofs-s1,  ofs+sin,      z+ofs+cos     *0.5-0.5); colors.push(1,1,1,1); texcoords.push(-s1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x+ofs+t1,  ofs+sin,      z+ofs+cos     *0.5-0.5); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x-ofs-s2,  ofs+next_sin, z+ofs+next_cos*0.5-0.5); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push( 0, -next_sin, -next_cos);
          vertices.push(x-ofs-s2,  ofs+next_sin, z+ofs+next_cos*0.5-0.5); colors.push(1,1,1,1); texcoords.push(-s2,v2); normals.push( 0, -next_sin, -next_cos);
          vertices.push(x+ofs+t1,  ofs+sin,      z+ofs+cos     *0.5-0.5); colors.push(1,1,1,1); texcoords.push(1+t1,v1); normals.push( 0, -     sin, -     cos);
          vertices.push(x+ofs+t2,  ofs+next_sin, z+ofs+next_cos*0.5-0.5); colors.push(1,1,1,1); texcoords.push(1+t2,v2); normals.push( 0, -next_sin, -next_cos);
        }
      }

      map = this.dungeon.map;
      for (var y = 0; y < map.length; y++) {
        row = map[y];
        for (var x = 0; x < row.length; x++) {
          var ch = row[x];
          if (ch == 'X') {
          } else {
            /* walls */
            if (x == 0 || row[x-1] == 'X') drawLeftWall(x, y);
            if (y == 0 || map[y-1][x] == 'X') drawFrontWall(x, y);
            if (x == row.length-1 || row[x+1] == 'X') drawRightWall(x, y);
            if (y == map.length-1 || map[y+1][x] == 'X') drawBackWall(x, y);

            /* floor */
            vertices.push(x-0.5,-0.5,y+0.5,  x-0.5,-0.5,y-0.5,  x+0.5,-0.5,y-0.5);
            vertices.push(x-0.5,-0.5,y+0.5,  x+0.5,-0.5,y-0.5,  x+0.5,-0.5,y+0.5);
            colors.push(1,1,1,1,  1,1,1,1,  1,1,1,1); colors.push(1,1,1,1,  1,1,1,1,  1,1,1,1);
            texcoords.push(0,1,  0,0,  1,0);          texcoords.push(0,1,  1,0,  1,1);
            normals.push(0,1,0,  0,1,0,  0,1,0);      normals.push(0,1,0,  0,1,0,  0,1,0);

          }
        }
      }
    }
  });

  return Jax.Model.create({
    initialize: function($super) {
      this.torches = [];
      $super({mesh:new DungeonMesh(this)});
    },

    walk: function(oldPos, newPos) {
      /* NOT YET WORKING */
      return newPos;
      /*
      var x = Math.round(oldPos[0]), y = Math.round(oldPos[2]);
      var current = oldPos;
      var dx = Math.abs(Math.round(newPos[0])-x), dy = Math.abs(Math.round(newPos[2])-y);
      var sx, sy;
      if (oldPos[0] < newPos[0]) sx = 1; else sx = -1;
      if (oldPos[2] < newPos[2]) sy = 1; else sy = -1;
      var err = dx - dy;

      while (true) {
        current[0] = x;
        current[2] = y;
        if (x == Math.round(newPos[0]) && y == Math.round(newPos[2]))
          return newPos;
        var e2 = 2*err;
        if (e2 > -dy) {
          err = err - dy;
          x = x + sx;
        }
        if (e2 < dx) {
          err = err + dx;
          y = y + sy;
        }
        if (x < 0 || x == this.map[0].length-1 || y < 0 || y == this.map.length-1) {
          if (x < 0)                          vec3.add(current, [-0.48, 0, 0]);
          else if (x == this.map[0].length-1) vec3.add(current, [ 0.48, 0, 0]);
          if (y < 0)                          vec3.add(current, [ 0,    0, -0.48]);
          else if (y == this.map.length-1)    vec3.add(current, [ 0,    0,  0.48]);
          return current;
        }
      }
      */
    },

    orientPlayer: function(player) {
      var pos = this.player_start.position.split(/,\s*/);
      var dir = this.player_start.direction.split(/,\s*/);

      player.camera.setPosition([pos[0], 0.5, pos[1]]);
      player.camera.reorient([dir[0], 0, dir[1]]);
    },

    addTorches: function(name, world) {
      var map = this.map;
      var blenderTorch = BlenderModel.find("torch");
      var mesh = blenderTorch.mesh;
      var torchfire = this.torchfire = new Torchfire();

      for (var y = 0; y < map.length; y++) {
        for (var x = 0; x < map[y].length; x++) {
          if (map[y][x] == "'") {
            var torch = LightSource.find(name);
            torch.original_attenuation = torch.attenuation.quadratic;
            this.torches.push(torch);
            world.addLightSource(torch);

            var distance = 0.37;
            var _x = x, _y = y;
            var emitterOffset = [0, 0.325, 0];
            if (x == 0 || map[y][x-1] == 'X') { _x -= distance; emitterOffset[0] = 0.05; } // wall left
            else if (y == 0 || map[y-1][x] == 'X') { _y -= distance; emitterOffset[2] = 0.05; } // wall front
            else if (x == map[y].length-1 || map[y][x+1] == 'X') { _x += distance; emitterOffset[0] = -0.05; } // wall right
            else if (y == map.length-1 || map[y+1][x] == 'X') { _y += distance; emitterOffset[2] = -0.05; } // wall back
            else continue;

            var height = 0.5;
            var torchModel = world.addObject(new Jax.Model({mesh:mesh,position:[_x, height, _y]}));
            torchModel.camera.lookAt([x, height, y]);
            var emitterPosition = vec3.add([_x, height, _y], emitterOffset);
            torch.camera.setPosition(emitterPosition);
            torchfire.addEmitter(emitterPosition);
          }
        }
      }
    },

    update: function(tc) {
      for (var i = 0; i < this.torches.length; i++) {
        var torch = this.torches[i];
        if (!torch.targetAtten || torch.attenDirection * (torch.targetAtten - torch.attenuation.quadratic) <= Math.EPSILON) {
          var amount = Math.random() * torch.flicker - torch.flicker / 2;
          torch.targetAtten = torch.original_attenuation + amount;
          torch.attenSpeed = (torch.targetAtten - torch.attenuation.quadratic) * 10;
          torch.attenDirection = torch.attenSpeed / Math.abs(torch.attenSpeed);
        }
        torch.attenuation.quadratic += torch.attenSpeed * tc;
        if ((torch.attenuation.quadratic < torch.targetAtten && Math.equalish(torch.attenDirection, -1)) ||
            (torch.attenuation.quadratic > torch.targetAtten && Math.equalish(torch.attenDirection,  1)))
          torch.attenuation.quadratic = torch.targetAtten;
      }
    },

    after_initialize: function() {

    }
  });
})();
/* Particle generator to render torch fires. All torches in the scene will be rendered in 1 pass. */
var Torchfire = Jax.Class.create(Jax.Model, {
  after_initialize: function() {
    var self = this;
    this.emitters = [];
    this.mesh = new Jax.Mesh({
      material: "torchfire",

      init: function(vertices, colors, texcoords) {
        for (var i = 0; i < self.emitters.length; i++) {
          var p = self.emitters[i];
          var s = 0.05, sy = s * 2;
          vertices.push(p[0]-s, p[1]+sy, p[2]-s);
          vertices.push(p[0]-s, p[1]-s,  p[2]-s);
          vertices.push(p[0]+s, p[1]-s,  p[2]+s);
          vertices.push(p[0]-s, p[1]+sy, p[2]-s);
          vertices.push(p[0]+s, p[1]-s,  p[2]+s);
          vertices.push(p[0]+s, p[1]+sy, p[2]+s);

          texcoords.push(0, 1);
          texcoords.push(0, 0);
          texcoords.push(1, 0);
          texcoords.push(0, 1);
          texcoords.push(1, 0);
          texcoords.push(1, 1);

          vertices.push(p[0]+s, p[1]+sy, p[2]-s);
          vertices.push(p[0]+s, p[1]-s,  p[2]-s);
          vertices.push(p[0]-s, p[1]-s,  p[2]+s);
          vertices.push(p[0]+s, p[1]+sy, p[2]-s);
          vertices.push(p[0]-s, p[1]-s,  p[2]+s);
          vertices.push(p[0]-s, p[1]+sy, p[2]+s);

          texcoords.push(1, 1);
          texcoords.push(1, 0);
          texcoords.push(0, 0);
          texcoords.push(1, 1);
          texcoords.push(0, 0);
          texcoords.push(0, 1);
        }
      }
    });
  },

  render: function($super, context, options) {
    context.glEnable(GL_BLEND);
    context.glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    $super(context, Jax.Util.normalizeOptions(options, {material:"torchfire"}));
  },

  addEmitter: function(emitter) {
    this.emitters.push(emitter);
  }
});
var ApplicationController = (function() {
  return Jax.Controller.create("application", Jax.Controller, {
    error: function(e) {
      alert(e);
    },

  });
})();
var DungeonController = (function() {
var material;
  return Jax.Controller.create("dungeon", ApplicationController, {
    index: function() {
      var snd = this.snd = new Audio("/sfx/torch.ogg");
      snd.addEventListener('ended', function() {
        this.currentTime = 0;
      }, false);
      snd.play();
      snd.volume = 0.0;

      material = Jax.Material.find("rock");
      this.movement = { left: 0, right: 0, forward: 0, backward: 0 };

      this.dungeon = new Dungeon();
      this.dungeon.mesh.material = material;
      this.dungeon.orientPlayer(this.player);
      this.world.addObject(this.dungeon);
      this.dungeon.addTorches("torch", this.world);

      this.dungeon.bsp = new BSP();
      this.dungeon.bsp.addMesh(this.dungeon.mesh);
      this.dungeon.bsp.finalize();

      this.world.addLightSource(window.lantern = LightSource.find("lantern"));
    },

    update: function(timechange) {
      var speed = 1.5;

      var forward = this.movement.forward + this.movement.backward;
      var horiz = this.movement.left + this.movement.right;
      var pos;
      if (forward || horiz) {
        var previousPosition = this.player.camera.getPosition();
        this.player.camera.move(forward*timechange*speed);
        this.player.camera.strafe(horiz*timechange*speed);
        pos = this.player.camera.getPosition();
        this.player.camera.setPosition(previousPosition);

        var collision;
        function intersectRayPlane(origin, direction, pOrigin, pNormal) {
          var d = -vec3.dot(pNormal, pOrigin);
          var numer = vec3.dot(pNormal, origin) + d;
          var denom = vec3.dot(pNormal, direction);

          if (denom == 0)  // normal is orthogonal to vector, can't intersect
           return (-1.0);
          return -(numer / denom);
        }

        var self = this;
        var xform = self.player.camera.getTransformationMatrix();
        var spNormal = this.spNormal = this.spNormal || vec3.create();
        var spOrigin;
        function move() {
          if (collision = self.dungeon.bsp.collideSphere(pos, 0.35)) {
            spOrigin = collision.collisionPoint;
            vec3.normalize(vec3.subtract(pos, spOrigin, spNormal));
            var l = intersectRayPlane(pos, spNormal, spOrigin, spNormal);

            vec3.scale(spNormal, collision.penetration + (Math.EPSILON*2), pos);
            vec3.add(spOrigin, pos, pos);

            pos[0] = pos[0] - l * spNormal[0];
            pos[1] = pos[1] - l * spNormal[1];
            pos[2] = pos[2] - l * spNormal[2];

            return move();
          }
          return pos;
        }
        move();
        pos[1] = 0.3; // keep the player from being able to fly
        self.player.camera.setPosition(pos);
      }
      else pos = this.player.camera.getPosition();

      var torchDistance = null, buf = vec3.create();
      for (var i = 0; i < this.dungeon.torches.length; i++) {
        var dist = vec3.length(vec3.subtract(this.dungeon.torches[i].camera.getPosition(), pos, buf));
        if (torchDistance == null || dist < torchDistance)
          torchDistance = dist;
      }
      if (torchDistance != null) {
        var maxDistance = 0.65;
        var volume = maxDistance / torchDistance;
        if (volume > 1) volume = 1;
        this.snd.volume = volume;
      }

      if (window.lantern)
        window.lantern.camera.setPosition(vec3.add(this.player.camera.getPosition(), vec3.scale(this.player.camera.getViewVector(), 0.1)));
    },

    mouse_dragged: function(event) {
      this.player.camera.yaw(-0.01 * this.context.mouse.diffx);
      this.player.camera.pitch(0.01 * this.context.mouse.diffy);
    },

    key_pressed: function(event) {
      switch(event.keyCode) {
        case KeyEvent.DOM_VK_UP:
        case KeyEvent.DOM_VK_W:
          this.movement.forward = 1;
          break;
        case KeyEvent.DOM_VK_DOWN:
        case KeyEvent.DOM_VK_S:
          this.movement.backward = -1;
          break;
        case KeyEvent.DOM_VK_LEFT:
        case KeyEvent.DOM_VK_A:
          this.movement.left = -1;
          break;
        case KeyEvent.DOM_VK_RIGHT:
        case KeyEvent.DOM_VK_D:
          this.movement.right = 1;
          break;
      }
    },

    key_released: function(event) {
      switch(event.keyCode) {
        case KeyEvent.DOM_VK_UP:
        case KeyEvent.DOM_VK_W:
          this.movement.forward = 0;
          break;
        case KeyEvent.DOM_VK_DOWN:
        case KeyEvent.DOM_VK_S:
          this.movement.backward = 0;
          break;
        case KeyEvent.DOM_VK_LEFT:
        case KeyEvent.DOM_VK_A:
          this.movement.left = 0;
          break;
        case KeyEvent.DOM_VK_RIGHT:
        case KeyEvent.DOM_VK_D:
          this.movement.right = 0;
          break;
      }
    }
  });
})();
Jax.views.push('dungeon/index', function() {
  this.glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
  this.world.render();
  this.context.current_controller.dungeon.torchfire.render(this.context);
});
Jax.Material.Torchfire = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    options = Jax.Util.normalizeOptions(options, {
      shader: "torchfire",

    });

    this.flame_mask = new Jax.Texture({path:"/images/flame-mask.gif",flip_y:true,wrap_s:GL_CLAMP_TO_EDGE,wrap_t:GL_CLAMP_TO_EDGE});
    this.flame      = new Jax.Texture({path:"/images/flame.gif",flip_y:true,wrap_s:GL_CLAMP_TO_EDGE,wrap_t:GL_CLAMP_TO_EDGE});
    this.flame_noise= new Jax.Texture({path:"/images/flame-noise.gif",flip_y:true});

    $super(options);
  },

  setUniforms: function($super, context, mesh, options, uniforms) {
    $super(context, mesh, options, uniforms);

    uniforms.set('mvMatrix', context.getModelViewMatrix());
    uniforms.set('nMatrix', context.getNormalMatrix());
    uniforms.set('pMatrix', context.getProjectionMatrix());

    uniforms.set('time', Jax.uptime);
    Jax.noise.bind(context, uniforms);

    uniforms.texture('FlameMask', this.flame_mask, context);
    uniforms.texture('Flame', this.flame, context);
    uniforms.texture('FlameNoise', this.flame_noise, context);
  },

  setAttributes: function($super, context, mesh, options, attributes) {
    attributes.set('VERTEX_POSITION',  mesh.getVertexBuffer());
    attributes.set('VERTEX_TEXCOORDS', mesh.getTextureCoordsBuffer());
  }
});
Jax.shaders['basic'] = new Jax.Shader({  common:"shared uniform mat4 ivMatrix, mvMatrix, pMatrix, vMatrix;\nshared uniform mat3 vnMatrix, nMatrix;\n\nshared uniform vec4 materialDiffuse, materialAmbient, materialSpecular;\nshared uniform float materialShininess;\n\nshared uniform int PASS_TYPE;\n\nshared varying vec2 vTexCoords;\nshared varying vec3 vNormal, vSurfacePos;\nshared varying vec4 vBaseColor;\n",
  fragment:"void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  ambient = materialAmbient * vBaseColor;\n  diffuse = materialDiffuse * vBaseColor;\n  specular = materialSpecular * vBaseColor;\n}\n",
  vertex:"shared attribute vec2 VERTEX_TEXCOORDS;\nshared attribute vec3 VERTEX_NORMAL;\nshared attribute vec4 VERTEX_POSITION, VERTEX_COLOR, VERTEX_TANGENT;\n\nvoid main(void) {\n  vBaseColor = VERTEX_COLOR;\n  vNormal = nMatrix * VERTEX_NORMAL;\n  vTexCoords = VERTEX_TEXCOORDS;\n                          \n  vSurfacePos = (mvMatrix * VERTEX_POSITION).xyz;\n\n  gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;\n}\n",
exports: {},
name: "basic"});
Jax.shaders['depthmap'] = new Jax.Shader({  common:"shared uniform mat4 pMatrix;\n",
  fragment:"          #ifndef dependency_functions_depth_map\n          #define dependency_functions_depth_map\n      \n          vec4 pack_depth(const in float depth)\n{\n  const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);\n  const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);\n  vec4 res = fract(depth * bit_shift);\n  res -= res.xxyz * bit_mask;\n  return res;\n}\n\n/*\nfloat linearize(in float z) {\n  float A = pMatrix[2].z, B = pMatrix[3].z;\n  float n = - B / (1.0 - A); // camera z near\n  float f =   B / (1.0 + A); // camera z far\n  return (2.0 * n) / (f + n - z * (f - n));\n}\n*/\n\nfloat unpack_depth(const in vec4 rgba_depth)\n{\n  const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);\n  float depth = dot(rgba_depth, bit_shift);\n  return depth;\n}\n\n          #endif\n\n\nvoid main(void) {\n  vec4 pos = gl_FragCoord;\n  import(exPos, pos = exPos);\n  gl_FragColor = pack_depth(pos.z);\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\n    \nshared uniform mat4 mvMatrix;\n            \nvoid main(void) {\n  vec4 pos = pMatrix * mvMatrix * VERTEX_POSITION;\n  import(Position, pos = Position);\n  \n  gl_Position = pos;\n}\n",
exports: {},
name: "depthmap"});
Jax.shaders['fog'] = new Jax.Shader({  common:"uniform vec4 FogColor;\n\nuniform int Algorithm;\n\nuniform float Scale;\nuniform float End;\nuniform float Density;\n",
  fragment:"const float LOG2 = 1.442695;\n\nvoid main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  float fog;\n  float error = 0.0;\n  float distance = length(gl_FragCoord.z / gl_FragCoord.w);\n\n  if (Algorithm == <%=Jax.LINEAR%>) {\n    fog = (End - distance) * Scale;\n  } else if (Algorithm == <%=Jax.EXPONENTIAL%>) {\n    fog = exp(-Density * distance);\n  } else if (Algorithm == <%=Jax.EXP2%>) {\n    fog = exp2(-Density * Density * distance * distance * LOG2);\n  } else {\n    /* error condition, output red */\n    ambient = diffuse = specular = vec4(1,0,0,1);\n    error = 1.0;\n  }\n\n  if (error != 1.0) {\n    fog = clamp(fog, 0.0, 1.0);\n  \n    ambient  = mix(FogColor,  ambient,  fog);\n    diffuse  = mix(FogColor,  diffuse,  fog);\n  }\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\n\nshared uniform mat4 mvMatrix, pMatrix;\n\nconst float LOG2 = 1.442695;\n\nvoid main(void) {\n  vec4 pos = mvMatrix * VERTEX_POSITION;\n  gl_Position = pMatrix * pos;\n}\n",
exports: {},
name: "fog"});
Jax.shaders['lighting'] = new Jax.Shader({  common:"          #ifndef dependency_functions_lights\n          #define dependency_functions_lights\n      \n          /* see http://jax.thoughtsincomputation.com/2011/05/webgl-apps-crashing-on-windows-7/ */\n//const struct LightSource {\n//  int enabled;\n//  int type;\n//  vec3 position; // in world space\n//  vec3 direction; // in world space\n//  vec4 ambient, diffuse, specular;\n//  float constant_attenuation, linear_attenuation, quadratic_attenuation;\n//  float spotExponent, spotCosCutoff;\n//};\n\nshared uniform bool LIGHT_ENABLED;\nshared uniform int LIGHT_TYPE;\nshared uniform vec3 LIGHT_POSITION, LIGHT_DIRECTION;\nshared uniform vec4 LIGHT_AMBIENT, LIGHT_DIFFUSE, LIGHT_SPECULAR;\nshared uniform float LIGHT_ATTENUATION_CONSTANT, LIGHT_ATTENUATION_LINEAR, LIGHT_ATTENUATION_QUADRATIC,\n                     LIGHT_SPOT_EXPONENT, LIGHT_SPOT_COS_CUTOFF;\n\nfloat calcAttenuation(in vec3 ecPosition3,\n                      out vec3 lightDirection)\n{\n//  lightDirection = vec3(vnMatrix * -light.position) - ecPosition3;\n  lightDirection = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  float d = length(lightDirection);\n  \n  return 1.0 / (LIGHT_ATTENUATION_CONSTANT + LIGHT_ATTENUATION_LINEAR * d + LIGHT_ATTENUATION_QUADRATIC * d * d);\n}\n\nvoid DirectionalLight(in vec3 normal,\n                      inout vec4 ambient,\n                      inout vec4 diffuse,\n                      inout vec4 specular)\n{\n  vec3 nLDir = normalize(vnMatrix * -normalize(LIGHT_DIRECTION));\n  vec3 halfVector = normalize(nLDir + vec3(0,0,1));\n  float pf;\n    \n  float NdotD  = max(0.0, dot(normal, nLDir));\n  float NdotHV = max(0.0, dot(normal, halfVector));\n    \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n    \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\n/* Use when attenuation != (1,0,0) */\nvoid PointLightWithAttenuation(in vec3 ecPosition3,\n                               in vec3 normal,\n                               inout vec4 ambient,\n                               inout vec4 diffuse,\n                               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n\n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n/* Use for better performance when attenuation == (1,0,0) */\nvoid PointLightWithoutAttenuation(in vec3 ecPosition3,\n                                  in vec3 normal,\n                                  inout vec4 ambient,\n                                  inout vec4 diffuse,\n                                  inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float d;     // distance from surface to light source\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  VP = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  d = length(VP);\n  VP = normalize(VP);\n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\nvoid SpotLight(in vec3 ecPosition3,\n               in vec3 normal,\n               inout vec4 ambient,\n               inout vec4 diffuse,\n               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  float spotDot; // cosine of angle between spotlight\n  float spotAttenuation; // spotlight attenuation factor\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  // See if point on surface is inside cone of illumination\n  spotDot = dot(-VP, normalize(vnMatrix*LIGHT_DIRECTION));\n  if (spotDot < LIGHT_SPOT_COS_CUTOFF)\n    spotAttenuation = 0.0;\n  else spotAttenuation = pow(spotDot, LIGHT_SPOT_EXPONENT);\n  \n  attenuation *= spotAttenuation;\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n          #endif\n\n\nshared uniform bool LIGHTING_ENABLED;\n\nshared varying vec3 vLightDir;",
  fragment:"void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  vec4 _ambient = vec4(0,0,0,0), _diffuse = vec4(0,0,0,0), _specular = vec4(0,0,0,0);\n  vec3 nNormal = normalize(vNormal);\n\n  if (LIGHTING_ENABLED) {\n    if (LIGHT_TYPE == <%=Jax.DIRECTIONAL_LIGHT%>)\n      DirectionalLight(nNormal, _ambient, _diffuse, _specular);\n    else\n      if (LIGHT_TYPE == <%=Jax.POINT_LIGHT%>)\n        if (LIGHT_ATTENUATION_CONSTANT == 1.0 && LIGHT_ATTENUATION_LINEAR == 0.0 && LIGHT_ATTENUATION_QUADRATIC == 0.0)\n          PointLightWithoutAttenuation(vSurfacePos, nNormal, _ambient, _diffuse, _specular);\n        else\n          PointLightWithAttenuation(vSurfacePos, nNormal, _ambient, _diffuse, _specular);\n      else\n        if (LIGHT_TYPE == <%=Jax.SPOT_LIGHT%>)\n          SpotLight(vSurfacePos, nNormal, _ambient, _diffuse, _specular);\n        else\n        { // error condition, output 100% red\n          _ambient = _diffuse = _specular = vec4(1,0,0,1);\n        }\n  } else {\n    _ambient = vec4(1,1,1,1);\n    _diffuse = _specular = vec4(0,0,0,0);\n  }\n\n  /*\n    Light colors will be multiplied by material colors. Light can't really be transparent,\n    so we'll use alpha to represent intensity. This means we must multiply resultant light\n    colors by light alpha, and then hard-code alpha 1 to avoid polluting transparency.\n    \n    The reason we use LIGHT_*.a instead of _*.a is because _*.a has been tainted by attenuation.\n    A light's intensity, regardless of distance or relative brightness, has not actually changed;\n    attenuation has been factored into color already; we don't want to square the atten amt.\n  */\n  ambient *= vec4(_ambient.rgb * LIGHT_AMBIENT.a, 1.0);\n  diffuse *= vec4(_diffuse.rgb * LIGHT_DIFFUSE.a, 1.0);\n  specular *= vec4(_specular.rgb * LIGHT_SPECULAR.a, 1.0);\n}\n",
  vertex:"shared attribute vec2 VERTEX_TEXCOORDS;\nshared attribute vec3 VERTEX_NORMAL;\nshared attribute vec4 VERTEX_POSITION, VERTEX_COLOR, VERTEX_TANGENT;\n\nvoid main(void) {\n  vLightDir = normalize(vnMatrix * -normalize(LIGHT_DIRECTION));\n}\n",
exports: {},
name: "lighting"});
Jax.shaders['normal_map'] = new Jax.Shader({  common:"          #ifndef dependency_functions_lights\n          #define dependency_functions_lights\n      \n          /* see http://jax.thoughtsincomputation.com/2011/05/webgl-apps-crashing-on-windows-7/ */\n//const struct LightSource {\n//  int enabled;\n//  int type;\n//  vec3 position; // in world space\n//  vec3 direction; // in world space\n//  vec4 ambient, diffuse, specular;\n//  float constant_attenuation, linear_attenuation, quadratic_attenuation;\n//  float spotExponent, spotCosCutoff;\n//};\n\nshared uniform bool LIGHT_ENABLED;\nshared uniform int LIGHT_TYPE;\nshared uniform vec3 LIGHT_POSITION, LIGHT_DIRECTION;\nshared uniform vec4 LIGHT_AMBIENT, LIGHT_DIFFUSE, LIGHT_SPECULAR;\nshared uniform float LIGHT_ATTENUATION_CONSTANT, LIGHT_ATTENUATION_LINEAR, LIGHT_ATTENUATION_QUADRATIC,\n                     LIGHT_SPOT_EXPONENT, LIGHT_SPOT_COS_CUTOFF;\n\nfloat calcAttenuation(in vec3 ecPosition3,\n                      out vec3 lightDirection)\n{\n//  lightDirection = vec3(vnMatrix * -light.position) - ecPosition3;\n  lightDirection = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  float d = length(lightDirection);\n  \n  return 1.0 / (LIGHT_ATTENUATION_CONSTANT + LIGHT_ATTENUATION_LINEAR * d + LIGHT_ATTENUATION_QUADRATIC * d * d);\n}\n\nvoid DirectionalLight(in vec3 normal,\n                      inout vec4 ambient,\n                      inout vec4 diffuse,\n                      inout vec4 specular)\n{\n  vec3 nLDir = normalize(vnMatrix * -normalize(LIGHT_DIRECTION));\n  vec3 halfVector = normalize(nLDir + vec3(0,0,1));\n  float pf;\n    \n  float NdotD  = max(0.0, dot(normal, nLDir));\n  float NdotHV = max(0.0, dot(normal, halfVector));\n    \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n    \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\n/* Use when attenuation != (1,0,0) */\nvoid PointLightWithAttenuation(in vec3 ecPosition3,\n                               in vec3 normal,\n                               inout vec4 ambient,\n                               inout vec4 diffuse,\n                               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n\n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n/* Use for better performance when attenuation == (1,0,0) */\nvoid PointLightWithoutAttenuation(in vec3 ecPosition3,\n                                  in vec3 normal,\n                                  inout vec4 ambient,\n                                  inout vec4 diffuse,\n                                  inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float d;     // distance from surface to light source\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  VP = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  d = length(VP);\n  VP = normalize(VP);\n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\nvoid SpotLight(in vec3 ecPosition3,\n               in vec3 normal,\n               inout vec4 ambient,\n               inout vec4 diffuse,\n               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  float spotDot; // cosine of angle between spotlight\n  float spotAttenuation; // spotlight attenuation factor\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  // See if point on surface is inside cone of illumination\n  spotDot = dot(-VP, normalize(vnMatrix*LIGHT_DIRECTION));\n  if (spotDot < LIGHT_SPOT_COS_CUTOFF)\n    spotAttenuation = 0.0;\n  else spotAttenuation = pow(spotDot, LIGHT_SPOT_EXPONENT);\n  \n  attenuation *= spotAttenuation;\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n          #endif\n\n\nuniform sampler2D NormalMap;\n\nshared uniform mat4 mvMatrix, pMatrix, vMatrix;\nshared uniform mat3 nMatrix;\n\nshared varying vec2 vTexCoords;\n\nvarying vec3 vEyeDir;\nvarying vec3 vLightDir;\nvarying float vAttenuation;\n",
  fragment:"void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  // ambient was applied by the basic shader; applying it again will simply brighten some fragments\n  // beyond their proper ambient value. So, we really need to apply the bump shader ONLY to diffuse+specular.\n\n  if (PASS_TYPE != <%=Jax.Scene.AMBIENT_PASS%>) {\n    vec3 nLightDir = normalize(vLightDir);\n    vec3 nEyeDir = normalize(vEyeDir);\n    vec4 color = texture2D(NormalMap, vTexCoords);\n    vec3 map = //nMatrix * \n               normalize(color.xyz * 2.0 - 1.0);\n             \n    float litColor = max(dot(map, nLightDir), 0.0) * vAttenuation;\n\n    // specular\n    vec3 reflectDir = reflect(nLightDir, map);\n    float spec = max(dot(nEyeDir, reflectDir), 0.0);\n    spec = pow(spec, materialShininess);\n\n    // Treat alpha in the normal map as a specular map; if it's unused it will be 1 and this\n    // won't matter.\n    spec *= color.a;\n  \n    diffuse *= litColor;\n    specular *= spec;\n  }\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\nshared attribute vec2 VERTEX_TEXCOORDS;\nshared attribute vec4 VERTEX_TANGENT;\nshared attribute vec3 VERTEX_NORMAL;\n\nvoid main(void) {\n  // ambient was applied by the basic shader; applying it again will simply brighten some fragments\n  // beyond their proper ambient value. So, we really need to apply the bump shader ONLY to diffuse+specular.\n\n  if (PASS_TYPE != <%=Jax.Scene.AMBIENT_PASS%>) {\n    vec3 ecPosition = vec3(mvMatrix * VERTEX_POSITION);\n\n    gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;\n    vTexCoords = VERTEX_TEXCOORDS;\n\n    vEyeDir = vec3(mvMatrix * VERTEX_POSITION);\n  \n    vec3 n = normalize(nMatrix * VERTEX_NORMAL);\n    vec3 t = normalize(nMatrix * VERTEX_TANGENT.xyz);\n    vec3 b = cross(n, t) * VERTEX_TANGENT.w;\n  \n    vec3 v, p;\n  \n    vAttenuation = 1.0;\n  \n    if (LIGHT_TYPE == <%=Jax.POINT_LIGHT%>)\n      if (LIGHT_ATTENUATION_CONSTANT == 1.0 && LIGHT_ATTENUATION_LINEAR == 0.0 && LIGHT_ATTENUATION_QUADRATIC == 0.0) {\n        // no change to attenuation, but we still need P\n        p = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition;\n      }\n      else {\n        // attenuation calculation figures out P for us, so we may as well use it\n        vAttenuation = calcAttenuation(ecPosition, p);\n      }\n    else\n      if (LIGHT_TYPE == <%=Jax.SPOT_LIGHT%>) {\n        // attenuation calculation figures out P for us, so we may as well use it\n        vAttenuation = calcAttenuation(ecPosition, p);\n      }\n      else\n      { // directional light -- all we need is P\n        p = vec3(vnMatrix * -normalize(LIGHT_DIRECTION));\n      }\n    \n    \n    \n    v.x = dot(p, t);\n    v.y = dot(p, b);\n    v.z = dot(p, n);\n    vLightDir = normalize(p);\n  \n    v.x = dot(vEyeDir, t);\n    v.y = dot(vEyeDir, b);\n    v.z = dot(vEyeDir, n);\n    vEyeDir = normalize(v);\n  }\n}\n",
exports: {},
name: "normal_map"});
Jax.shaders['paraboloid'] = new Jax.Shader({  common:"shared uniform mat4 mvMatrix;\nshared uniform float DP_SHADOW_NEAR, DP_SHADOW_FAR;\nshared uniform float DP_DIRECTION;\n\nvarying float vClip;\nvarying vec4 vPos;\n",
  fragment:"void main(void) {\n  /* because we do our own projection, we also have to do our own clipping */\n  /* if vClip is less than 0, it's behind the near plane and can be dropped. */\n  if (vClip < 0.0) discard;\n  \n  export(vec4, exPos, vPos);\n//  gl_FragColor = pack_depth(vPos.z);\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\n                \nvoid main(void) {\n  /*\n    we do our own projection to form the paraboloid, so we\n    can ignore the projection matrix entirely.\n   */\n  vec4 pos = mvMatrix * VERTEX_POSITION;\n\n  pos = vec4(pos.xyz / pos.w, pos.w);\n\n  pos.z *= DP_DIRECTION;\n\n  float L = length(pos.xyz);\n  pos /= L;\n  vClip = pos.z;\n\n  pos.z += 1.0;\n  pos.x /= pos.z;\n  pos.y /= pos.z;\n  pos.z = (L - DP_SHADOW_NEAR) / (DP_SHADOW_FAR - DP_SHADOW_NEAR);\n  pos.w = 1.0;\n\n  vPos = pos;\n  export(vec4, Position, pos);\n  gl_Position = pos;\n}\n",
exports: {"exPos":"vec4","Position":"vec4"},
name: "paraboloid"});
Jax.shaders['picking'] = new Jax.Shader({  common:"uniform float INDEX;\nvarying vec4 vColor;\n",
  fragment:"void main(void) {\n  if (INDEX == -1.0) discard;\n  gl_FragColor = vColor;\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\n\nshared uniform mat4 mvMatrix, pMatrix;\n\nvoid main(void) {\n  gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;\n  \n  /*\n    Note that the agorithm here must be followed exactly on the JS side in order\n    to reconstitute the index when it is read.\n    \n    This supports 65,535 objects. If more are needed, we could feasibly open up\n    the alpha channel, as long as blending is disabled. Need to do more tests\n    on this first, however.\n  */\n  \n  \n  // equivalent to [ int(INDEX/256), INDEX % 256 ] / 255. The last division\n  // is necessary to scale to the [0..1] range.\n  \n  float d = 1.0 / 255.0;\n  float f = floor(INDEX / 256.0);\n  vColor = vec4(f * d, (INDEX - 256.0 * f) * d, 1.0, 1.0);\n}\n",
exports: {},
name: "picking"});
Jax.shaders['shadow_map'] = new Jax.Shader({  common:"shared uniform mat4 mMatrix;\n\nuniform bool SHADOWMAP_ENABLED;\nuniform sampler2D SHADOWMAP0, SHADOWMAP1;\nuniform mat4 SHADOWMAP_MATRIX;\nuniform bool SHADOWMAP_PCF_ENABLED;\nuniform float DP_SHADOW_NEAR, DP_SHADOW_FAR;\n\nvarying vec4 vShadowCoord;\n\nvarying vec4 vDP0, vDP1;\n//varying float vDPz, vDPDepth;\n\n          #ifndef dependency_functions_lights\n          #define dependency_functions_lights\n      \n          /* see http://jax.thoughtsincomputation.com/2011/05/webgl-apps-crashing-on-windows-7/ */\n//const struct LightSource {\n//  int enabled;\n//  int type;\n//  vec3 position; // in world space\n//  vec3 direction; // in world space\n//  vec4 ambient, diffuse, specular;\n//  float constant_attenuation, linear_attenuation, quadratic_attenuation;\n//  float spotExponent, spotCosCutoff;\n//};\n\nshared uniform bool LIGHT_ENABLED;\nshared uniform int LIGHT_TYPE;\nshared uniform vec3 LIGHT_POSITION, LIGHT_DIRECTION;\nshared uniform vec4 LIGHT_AMBIENT, LIGHT_DIFFUSE, LIGHT_SPECULAR;\nshared uniform float LIGHT_ATTENUATION_CONSTANT, LIGHT_ATTENUATION_LINEAR, LIGHT_ATTENUATION_QUADRATIC,\n                     LIGHT_SPOT_EXPONENT, LIGHT_SPOT_COS_CUTOFF;\n\nfloat calcAttenuation(in vec3 ecPosition3,\n                      out vec3 lightDirection)\n{\n//  lightDirection = vec3(vnMatrix * -light.position) - ecPosition3;\n  lightDirection = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  float d = length(lightDirection);\n  \n  return 1.0 / (LIGHT_ATTENUATION_CONSTANT + LIGHT_ATTENUATION_LINEAR * d + LIGHT_ATTENUATION_QUADRATIC * d * d);\n}\n\nvoid DirectionalLight(in vec3 normal,\n                      inout vec4 ambient,\n                      inout vec4 diffuse,\n                      inout vec4 specular)\n{\n  vec3 nLDir = normalize(vnMatrix * -normalize(LIGHT_DIRECTION));\n  vec3 halfVector = normalize(nLDir + vec3(0,0,1));\n  float pf;\n    \n  float NdotD  = max(0.0, dot(normal, nLDir));\n  float NdotHV = max(0.0, dot(normal, halfVector));\n    \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n    \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\n/* Use when attenuation != (1,0,0) */\nvoid PointLightWithAttenuation(in vec3 ecPosition3,\n                               in vec3 normal,\n                               inout vec4 ambient,\n                               inout vec4 diffuse,\n                               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n\n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n/* Use for better performance when attenuation == (1,0,0) */\nvoid PointLightWithoutAttenuation(in vec3 ecPosition3,\n                                  in vec3 normal,\n                                  inout vec4 ambient,\n                                  inout vec4 diffuse,\n                                  inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float d;     // distance from surface to light source\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  \n  VP = vec3(ivMatrix * vec4(LIGHT_POSITION, 1.0)) - ecPosition3;\n  d = length(VP);\n  VP = normalize(VP);\n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT;\n  diffuse += LIGHT_DIFFUSE * NdotD;\n  specular += LIGHT_SPECULAR * pf;\n}\n\nvoid SpotLight(in vec3 ecPosition3,\n               in vec3 normal,\n               inout vec4 ambient,\n               inout vec4 diffuse,\n               inout vec4 specular)\n{\n  float NdotD; // normal . light direction\n  float NdotHV;// normal . half vector\n  float pf;    // specular factor\n  float attenuation;\n  vec3 VP;     // direction from surface to light position\n  vec3 halfVector; // direction of maximum highlights\n  float spotDot; // cosine of angle between spotlight\n  float spotAttenuation; // spotlight attenuation factor\n  \n  attenuation = calcAttenuation(ecPosition3, VP);\n  VP = normalize(VP);\n  \n  // See if point on surface is inside cone of illumination\n  spotDot = dot(-VP, normalize(vnMatrix*LIGHT_DIRECTION));\n  if (spotDot < LIGHT_SPOT_COS_CUTOFF)\n    spotAttenuation = 0.0;\n  else spotAttenuation = pow(spotDot, LIGHT_SPOT_EXPONENT);\n  \n  attenuation *= spotAttenuation;\n  \n  halfVector = normalize(VP+vec3(0,0,1));\n  NdotD = max(0.0, dot(normal, VP));\n  NdotHV= max(0.0, dot(normal, halfVector));\n  \n  if (NdotD == 0.0) pf = 0.0;\n  else pf = pow(NdotHV, materialShininess);\n  \n  ambient += LIGHT_AMBIENT * attenuation;\n  diffuse += LIGHT_DIFFUSE * NdotD * attenuation;\n  specular += LIGHT_SPECULAR * pf * attenuation;\n}\n\n          #endif\n\n",
  fragment:"          #ifndef dependency_functions_depth_map\n          #define dependency_functions_depth_map\n      \n          vec4 pack_depth(const in float depth)\n{\n  const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);\n  const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);\n  vec4 res = fract(depth * bit_shift);\n  res -= res.xxyz * bit_mask;\n  return res;\n}\n\n/*\nfloat linearize(in float z) {\n  float A = pMatrix[2].z, B = pMatrix[3].z;\n  float n = - B / (1.0 - A); // camera z near\n  float f =   B / (1.0 + A); // camera z far\n  return (2.0 * n) / (f + n - z * (f - n));\n}\n*/\n\nfloat unpack_depth(const in vec4 rgba_depth)\n{\n  const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);\n  float depth = dot(rgba_depth, bit_shift);\n  return depth;\n}\n\n          #endif\n\n\nfloat dp_lookup() {\n  float map_depth, depth;\n  vec4 rgba_depth;\n      \n  if (vDP0.w > 0.0) {\n    rgba_depth = texture2D(SHADOWMAP0, vDP0.xy);\n    depth = vDP1.w;//P0.z;\n  } else {\n    rgba_depth = texture2D(SHADOWMAP1, vDP1.xy);\n    depth = vDP1.w;//P1.z;\n  }\n      \n      \n  map_depth = unpack_depth(rgba_depth);\n      \n  if (map_depth + 0.00005 < depth) return 0.0;\n  else return 1.0;\n}\n      \nfloat pcf_lookup(float s, vec2 offset) {\n  /*\n    s is the projected depth of the current vShadowCoord relative to the shadow's camera. This represents\n    a *potentially* shadowed surface about to be drawn.\n    \n    d is the actual depth stored within the SHADOWMAP texture (representing the visible surface).\n  \n    if the surface to be drawn is further back than the light-visible surface, then the surface is\n    shadowed because it has a greater depth. Less-or-equal depth means it's either in front of, or it *is*\n    the light-visible surface.\n  */\n  vec2 texcoord = (vShadowCoord.xy/vShadowCoord.w)+offset;\n  vec4 rgba_depth = texture2D(SHADOWMAP0, texcoord);\n  float d = unpack_depth(rgba_depth);\n  return (s - d > 0.00002) ? 0.0 : 1.0;\n}\n\nvoid main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n//ambient = vec4(0);\n  if (PASS_TYPE != <%=Jax.Scene.AMBIENT_PASS%> && SHADOWMAP_ENABLED) {\n    float visibility = 1.0;\n    float s = vShadowCoord.z / vShadowCoord.w;\n    if (LIGHT_TYPE == <%=Jax.POINT_LIGHT%>) {\n      visibility = dp_lookup();\n    } else {\n      vec2 offset = vec2(0.0, 0.0);\n      if (!SHADOWMAP_PCF_ENABLED)\n        visibility = pcf_lookup(s, offset);\n      else {\n        // do PCF filtering\n        float dx, dy;\n        visibility = 0.0;\n        for (float dx = -1.5; dx <= 1.5; dx += 1.0)\n          for (float dy = -1.5; dy <= 1.5; dy += 1.0) {\n            offset.x = dx/2048.0;\n            offset.y = dy/2048.0;\n            visibility += pcf_lookup(s, offset);\n          }\n        visibility /= 16.0;\n      }\n    }\n\n    diffuse *= visibility;\n    specular *= visibility;\n  }\n}\n",
  vertex:"void main(void) {\n  if (PASS_TYPE != <%=Jax.Scene.AMBIENT_PASS%> && SHADOWMAP_ENABLED) {\n    vShadowCoord = SHADOWMAP_MATRIX * mMatrix * VERTEX_POSITION;\n    \n    /* Perform dual-paraboloid shadow map calculations - for point lights only */\n    vec4 p = vShadowCoord;\n    vec3 pos = p.xyz / p.w;\n          \n    float L = length(pos.xyz);\n    vDP0.xyz = pos / L;\n    vDP1.xyz = pos / L;\n      \n    vDP0.w = pos.z;    \n    //vDPz = pos.z;\n          \n    vDP0.z = 1.0 + vDP0.z;\n    vDP0.x /= vDP0.z;\n    vDP0.y /= vDP0.z;\n    vDP0.z = (L - DP_SHADOW_NEAR) / (DP_SHADOW_FAR - DP_SHADOW_NEAR);\n          \n    vDP0.x =  0.5 * vDP0.x + 0.5;\n    vDP0.y =  0.5 * vDP0.y + 0.5;\n          \n    vDP1.z = 1.0 - vDP1.z;\n    vDP1.x /= vDP1.z;\n    vDP1.y /= vDP1.z;\n    vDP1.z = (L - DP_SHADOW_NEAR) / (DP_SHADOW_FAR - DP_SHADOW_NEAR);\n      \n    vDP1.x =  0.5 * vDP1.x + 0.5;\n    vDP1.y =  0.5 * vDP1.y + 0.5;\n          \n    float map_depth, depth;\n    vec4 rgba_depth;\n      \n    if (vDP0.w > 0.0) {    \n    //if (vDPz > 0.0) {\n      vDP1.w = vDP0.z;\n      //vDPDepth = vDP0.z;\n    } else {\n      vDP1.w = vDP1.z;\n      //vDPDepth = vDP1.z;\n    }\n  }\n}\n",
exports: {},
name: "shadow_map"});
Jax.shaders['texture'] = new Jax.Shader({  common:"uniform sampler2D Texture;\nuniform float TextureScaleX, TextureScaleY;\n\nshared varying vec2 vTexCoords;\n",
  fragment:"void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  vec4 t = texture2D(Texture, vTexCoords * vec2(TextureScaleX, TextureScaleY));\n\n  ambient  *= t;\n  diffuse  *= t;\n  specular *= t;\n \n  ambient.a  *= t.a;\n  diffuse.a  *= t.a;\n  specular.a *= t.a;\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION;\nshared attribute vec2 VERTEX_TEXCOORDS;\n\nshared uniform mat4 mvMatrix, pMatrix;\n\nvoid main(void) {\n  gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;\n  vTexCoords = VERTEX_TEXCOORDS;\n}\n",
exports: {},
name: "texture"});
Jax.shaders['blender_color_layer'] = new Jax.Shader({  common:"varying vec3 vColor;\n",
  fragment:"void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {\n  ambient.rgb  *= vColor;\n  diffuse.rgb  *= vColor;\n  specular.rgb *= vColor;\n}\n",
  vertex:"attribute vec3 COLOR;\n\nvoid main(void) {\n  vColor = COLOR;\n}\n",
exports: {},
name: "blender_color_layer"});
Jax.shaders['torchfire'] = new Jax.Shader({  common:"// Shared variables save on graphics memory and allow you to \"piggy-back\" off of\n// variables defined in other shaders:\n\nshared uniform mat3 nMatrix;\nshared uniform mat4 mvMatrix, pMatrix;\n\nshared varying vec2 vTexCoords;\nshared varying vec3 vNormal;\nshared varying vec4 vBaseColor;\n\n// If a variable isn't shared, it will be defined specifically for this shader.\n// If this shader is used twice in one materials, unshared variables will be\n// defined twice -- once for each use of the shader.\n\n//   uniform sampler2D Texture;\n//   uniform float TextureScaleX, TextureScaleY;\n",
  fragment:"          #ifndef dependency_functions_noise\n          #define dependency_functions_noise\n      \n          /**\n * Classic and 'improved' (simplex) Perlin noise.\n *\n * This implementation attempts to use texture-based lookups if the client\n * hardware can support it. This is no problem in fragment shaders but can\n * be an issue in vertex shaders, where VTL is not supported by about 20%\n * of clients.\n *\n * In the event this is a vertex shader *and* the client doesn't support\n * VTL, the functions will fall back to 'ashima' noise\n * (https://github.com/ashima/webgl-noise) for a slower, non-texture-based\n * implementation.\n **/\n \n<%if (shader_type != 'vertex' || Jax.Shader.max_vertex_textures > 0) {%>\n\n\n/*\n * 2D, 3D and 4D Perlin noise, classic and simplex, in a GLSL fragment shader.\n *\n * Classic noise is implemented by the functions:\n * float cnoise(vec2 P)\n * float cnoise(vec3 P)\n * float cnoise(vec4 P)\n *\n * Simplex noise is implemented by the functions:\n * float snoise(vec2 P)\n * float snoise(vec3 P)\n * float snoise(vec4 P)\n *\n * Author: Stefan Gustavson ITN-LiTH (stegu@itn.liu.se) 2004-12-05\n * You may use, modify and redistribute this code free of charge,\n * provided that my name and this notice appears intact.\n */\n\n/*\n * NOTE: there is a formal problem with the dependent texture lookups.\n * A texture coordinate of exactly 1.0 will wrap to 0.0, so strictly speaking,\n * an error occurs every 256 units of the texture domain, and the same gradient\n * is used for two adjacent noise cells. One solution is to set the texture\n * wrap mode to \"CLAMP\" and do the wrapping explicitly in GLSL with the \"mod\"\n * operator. This could also give you noise with repetition intervals other\n * than 256 without any extra cost.\n * This error is not even noticeable to the eye even if you isolate the exact\n * position in the domain where it occurs and know exactly what to look for.\n * The noise pattern is still visually correct, so I left the bug in there.\n * \n * The value of classic 4D noise goes above 1.0 and below -1.0 at some\n * points. Not much and only very sparsely, but it happens.\n */\n\n\n/*\n * \"permTexture\" is a 256x256 texture that is used for both the permutations\n * and the 2D and 3D gradient lookup. For details, see the main C program.\n * \"simplexTexture\" is a small look-up table to determine a simplex traversal\n * order for 3D and 4D simplex noise. Details are in the C program.\n * \"gradTexture\" is a 256x256 texture with 4D gradients, similar to\n * \"permTexture\" but with the permutation index in the alpha component\n * replaced by the w component of the 4D gradient.\n * 2D classic noise uses only permTexture.\n * 2D simplex noise uses permTexture and simplexTexture.\n * 3D classic noise uses only permTexture.\n * 3D simplex noise uses permTexture and simplexTexture.\n * 4D classic noise uses permTexture and gradTexture.\n * 4D simplex noise uses all three textures.\n */\nuniform sampler2D permTexture;\n// sampler1D not supported in WebGL\n//uniform sampler1D simplexTexture;\nuniform sampler2D simplexTexture;\nuniform sampler2D gradTexture;\n\n/*\n * Both 2D and 3D texture coordinates are defined, for testing purposes.\n */\n//varying vec2 v_texCoord2D;\n//varying vec3 v_texCoord3D;\n//varying vec4 v_color;\n\n/*\n * To create offsets of one texel and one half texel in the\n * texture lookup, we need to know the texture image size.\n */\n#define ONE 0.00390625\n#define ONEHALF 0.001953125\n// The numbers above are 1/256 and 0.5/256, change accordingly\n// if you change the code to use another texture size.\n\n\n/*\n * The interpolation function. This could be a 1D texture lookup\n * to get some more speed, but it's not the main part of the algorithm.\n */\nfloat fade(float t) {\n  // return t*t*(3.0-2.0*t); // Old fade, yields discontinuous second derivative\n  return t*t*t*(t*(t*6.0-15.0)+10.0); // Improved fade, yields C2-continuous noise\n}\n\n\n/*\n * 2D classic Perlin noise. Fast, but less useful than 3D noise.\n */\nfloat cnoise(vec2 P)\n{\n  vec2 Pi = ONE*floor(P)+ONEHALF; // Integer part, scaled and offset for texture lookup\n  vec2 Pf = fract(P);             // Fractional part for interpolation\n\n  // Noise contribution from lower left corner\n  vec2 grad00 = texture2D(permTexture, Pi).rg * 4.0 - 1.0;\n  float n00 = dot(grad00, Pf);\n\n  // Noise contribution from lower right corner\n  vec2 grad10 = texture2D(permTexture, Pi + vec2(ONE, 0.0)).rg * 4.0 - 1.0;\n  float n10 = dot(grad10, Pf - vec2(1.0, 0.0));\n\n  // Noise contribution from upper left corner\n  vec2 grad01 = texture2D(permTexture, Pi + vec2(0.0, ONE)).rg * 4.0 - 1.0;\n  float n01 = dot(grad01, Pf - vec2(0.0, 1.0));\n\n  // Noise contribution from upper right corner\n  vec2 grad11 = texture2D(permTexture, Pi + vec2(ONE, ONE)).rg * 4.0 - 1.0;\n  float n11 = dot(grad11, Pf - vec2(1.0, 1.0));\n\n  // Blend contributions along x\n  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade(Pf.x));\n\n  // Blend contributions along y\n  float n_xy = mix(n_x.x, n_x.y, fade(Pf.y));\n\n  // We're done, return the final noise value.\n  return n_xy;\n}\n\n\n/*\n * 3D classic noise. Slower, but a lot more useful than 2D noise.\n */\nfloat cnoise(vec3 P)\n{\n  vec3 Pi = ONE*floor(P)+ONEHALF; // Integer part, scaled so +1 moves one texel\n                                  // and offset 1/2 texel to sample texel centers\n  vec3 Pf = fract(P);     // Fractional part for interpolation\n\n  // Noise contributions from (x=0, y=0), z=0 and z=1\n  float perm00 = texture2D(permTexture, Pi.xy).a ;\n  vec3  grad000 = texture2D(permTexture, vec2(perm00, Pi.z)).rgb * 4.0 - 1.0;\n  float n000 = dot(grad000, Pf);\n  vec3  grad001 = texture2D(permTexture, vec2(perm00, Pi.z + ONE)).rgb * 4.0 - 1.0;\n  float n001 = dot(grad001, Pf - vec3(0.0, 0.0, 1.0));\n\n  // Noise contributions from (x=0, y=1), z=0 and z=1\n  float perm01 = texture2D(permTexture, Pi.xy + vec2(0.0, ONE)).a ;\n  vec3  grad010 = texture2D(permTexture, vec2(perm01, Pi.z)).rgb * 4.0 - 1.0;\n  float n010 = dot(grad010, Pf - vec3(0.0, 1.0, 0.0));\n  vec3  grad011 = texture2D(permTexture, vec2(perm01, Pi.z + ONE)).rgb * 4.0 - 1.0;\n  float n011 = dot(grad011, Pf - vec3(0.0, 1.0, 1.0));\n\n  // Noise contributions from (x=1, y=0), z=0 and z=1\n  float perm10 = texture2D(permTexture, Pi.xy + vec2(ONE, 0.0)).a ;\n  vec3  grad100 = texture2D(permTexture, vec2(perm10, Pi.z)).rgb * 4.0 - 1.0;\n  float n100 = dot(grad100, Pf - vec3(1.0, 0.0, 0.0));\n  vec3  grad101 = texture2D(permTexture, vec2(perm10, Pi.z + ONE)).rgb * 4.0 - 1.0;\n  float n101 = dot(grad101, Pf - vec3(1.0, 0.0, 1.0));\n\n  // Noise contributions from (x=1, y=1), z=0 and z=1\n  float perm11 = texture2D(permTexture, Pi.xy + vec2(ONE, ONE)).a ;\n  vec3  grad110 = texture2D(permTexture, vec2(perm11, Pi.z)).rgb * 4.0 - 1.0;\n  float n110 = dot(grad110, Pf - vec3(1.0, 1.0, 0.0));\n  vec3  grad111 = texture2D(permTexture, vec2(perm11, Pi.z + ONE)).rgb * 4.0 - 1.0;\n  float n111 = dot(grad111, Pf - vec3(1.0, 1.0, 1.0));\n\n  // Blend contributions along x\n  vec4 n_x = mix(vec4(n000, n001, n010, n011),\n                 vec4(n100, n101, n110, n111), fade(Pf.x));\n\n  // Blend contributions along y\n  vec2 n_xy = mix(n_x.xy, n_x.zw, fade(Pf.y));\n\n  // Blend contributions along z\n  float n_xyz = mix(n_xy.x, n_xy.y, fade(Pf.z));\n\n  // We're done, return the final noise value.\n  return n_xyz;\n}\n\n\n/*\n * 4D classic noise. Slow, but very useful. 4D simplex noise is a lot faster.\n *\n * This function performs 8 texture lookups and 16 dependent texture lookups,\n * 16 dot products, 4 mix operations and a lot of additions and multiplications.\n * Needless to say, it's not super fast. But it's not dead slow either.\n */\nfloat cnoise(vec4 P)\n{\n  vec4 Pi = ONE*floor(P)+ONEHALF; // Integer part, scaled so +1 moves one texel\n                                  // and offset 1/2 texel to sample texel centers\n  vec4 Pf = fract(P);      // Fractional part for interpolation\n\n  // \"n0000\" is the noise contribution from (x=0, y=0, z=0, w=0), and so on\n  float perm00xy = texture2D(permTexture, Pi.xy).a ;\n  float perm00zw = texture2D(permTexture, Pi.zw).a ;\n  vec4 grad0000 = texture2D(gradTexture, vec2(perm00xy, perm00zw)).rgba * 4.0 -1.0;\n  float n0000 = dot(grad0000, Pf);\n\n  float perm01zw = texture2D(permTexture, Pi.zw  + vec2(0.0, ONE)).a ;\n  vec4  grad0001 = texture2D(gradTexture, vec2(perm00xy, perm01zw)).rgba * 4.0 - 1.0;\n  float n0001 = dot(grad0001, Pf - vec4(0.0, 0.0, 0.0, 1.0));\n\n  float perm10zw = texture2D(permTexture, Pi.zw  + vec2(ONE, 0.0)).a ;\n  vec4  grad0010 = texture2D(gradTexture, vec2(perm00xy, perm10zw)).rgba * 4.0 - 1.0;\n  float n0010 = dot(grad0010, Pf - vec4(0.0, 0.0, 1.0, 0.0));\n\n  float perm11zw = texture2D(permTexture, Pi.zw  + vec2(ONE, ONE)).a ;\n  vec4  grad0011 = texture2D(gradTexture, vec2(perm00xy, perm11zw)).rgba * 4.0 - 1.0;\n  float n0011 = dot(grad0011, Pf - vec4(0.0, 0.0, 1.0, 1.0));\n\n  float perm01xy = texture2D(permTexture, Pi.xy + vec2(0.0, ONE)).a ;\n  vec4  grad0100 = texture2D(gradTexture, vec2(perm01xy, perm00zw)).rgba * 4.0 - 1.0;\n  float n0100 = dot(grad0100, Pf - vec4(0.0, 1.0, 0.0, 0.0));\n\n  vec4  grad0101 = texture2D(gradTexture, vec2(perm01xy, perm01zw)).rgba * 4.0 - 1.0;\n  float n0101 = dot(grad0101, Pf - vec4(0.0, 1.0, 0.0, 1.0));\n\n  vec4  grad0110 = texture2D(gradTexture, vec2(perm01xy, perm10zw)).rgba * 4.0 - 1.0;\n  float n0110 = dot(grad0110, Pf - vec4(0.0, 1.0, 1.0, 0.0));\n\n  vec4  grad0111 = texture2D(gradTexture, vec2(perm01xy, perm11zw)).rgba * 4.0 - 1.0;\n  float n0111 = dot(grad0111, Pf - vec4(0.0, 1.0, 1.0, 1.0));\n\n  float perm10xy = texture2D(permTexture, Pi.xy + vec2(ONE, 0.0)).a ;\n  vec4  grad1000 = texture2D(gradTexture, vec2(perm10xy, perm00zw)).rgba * 4.0 - 1.0;\n  float n1000 = dot(grad1000, Pf - vec4(1.0, 0.0, 0.0, 0.0));\n\n  vec4  grad1001 = texture2D(gradTexture, vec2(perm10xy, perm01zw)).rgba * 4.0 - 1.0;\n  float n1001 = dot(grad1001, Pf - vec4(1.0, 0.0, 0.0, 1.0));\n\n  vec4  grad1010 = texture2D(gradTexture, vec2(perm10xy, perm10zw)).rgba * 4.0 - 1.0;\n  float n1010 = dot(grad1010, Pf - vec4(1.0, 0.0, 1.0, 0.0));\n\n  vec4  grad1011 = texture2D(gradTexture, vec2(perm10xy, perm11zw)).rgba * 4.0 - 1.0;\n  float n1011 = dot(grad1011, Pf - vec4(1.0, 0.0, 1.0, 1.0));\n\n  float perm11xy = texture2D(permTexture, Pi.xy + vec2(ONE, ONE)).a ;\n  vec4  grad1100 = texture2D(gradTexture, vec2(perm11xy, perm00zw)).rgba * 4.0 - 1.0;\n  float n1100 = dot(grad1100, Pf - vec4(1.0, 1.0, 0.0, 0.0));\n\n  vec4  grad1101 = texture2D(gradTexture, vec2(perm11xy, perm01zw)).rgba * 4.0 - 1.0;\n  float n1101 = dot(grad1101, Pf - vec4(1.0, 1.0, 0.0, 1.0));\n\n  vec4  grad1110 = texture2D(gradTexture, vec2(perm11xy, perm10zw)).rgba * 4.0 - 1.0;\n  float n1110 = dot(grad1110, Pf - vec4(1.0, 1.0, 1.0, 0.0));\n\n  vec4  grad1111 = texture2D(gradTexture, vec2(perm11xy, perm11zw)).rgba * 4.0 - 1.0;\n  float n1111 = dot(grad1111, Pf - vec4(1.0, 1.0, 1.0, 1.0));\n\n  // Blend contributions along x\n  float fadex = fade(Pf.x);\n  vec4 n_x0 = mix(vec4(n0000, n0001, n0010, n0011),\n                  vec4(n1000, n1001, n1010, n1011), fadex);\n  vec4 n_x1 = mix(vec4(n0100, n0101, n0110, n0111),\n                  vec4(n1100, n1101, n1110, n1111), fadex);\n\n  // Blend contributions along y\n  vec4 n_xy = mix(n_x0, n_x1, fade(Pf.y));\n\n  // Blend contributions along z\n  vec2 n_xyz = mix(n_xy.xy, n_xy.zw, fade(Pf.z));\n\n  // Blend contributions along w\n  float n_xyzw = mix(n_xyz.x, n_xyz.y, fade(Pf.w));\n\n  // We're done, return the final noise value.\n  return n_xyzw;\n}\n\n\n/*\n * 2D simplex noise. Somewhat slower but much better looking than classic noise.\n */\nfloat snoise(vec2 P) {\n\n// Skew and unskew factors are a bit hairy for 2D, so define them as constants\n// This is (sqrt(3.0)-1.0)/2.0\n#define F2 0.366025403784\n// This is (3.0-sqrt(3.0))/6.0\n#define G2 0.211324865405\n\n  // Skew the (x,y) space to determine which cell of 2 simplices we're in\n \tfloat s = (P.x + P.y) * F2;   // Hairy factor for 2D skewing\n  vec2 Pi = floor(P + s);\n  float t = (Pi.x + Pi.y) * G2; // Hairy factor for unskewing\n  vec2 P0 = Pi - t; // Unskew the cell origin back to (x,y) space\n  Pi = Pi * ONE + ONEHALF; // Integer part, scaled and offset for texture lookup\n\n  vec2 Pf0 = P - P0;  // The x,y distances from the cell origin\n\n  // For the 2D case, the simplex shape is an equilateral triangle.\n  // Find out whether we are above or below the x=y diagonal to\n  // determine which of the two triangles we're in.\n  vec2 o1;\n  if(Pf0.x > Pf0.y) o1 = vec2(1.0, 0.0);  // +x, +y traversal order\n  else o1 = vec2(0.0, 1.0);               // +y, +x traversal order\n\n  // Noise contribution from simplex origin\n  vec2 grad0 = texture2D(permTexture, Pi).rg * 4.0 - 1.0;\n  float t0 = 0.5 - dot(Pf0, Pf0);\n  float n0;\n  if (t0 < 0.0) n0 = 0.0;\n  else {\n    t0 *= t0;\n    n0 = t0 * t0 * dot(grad0, Pf0);\n  }\n\n  // Noise contribution from middle corner\n  vec2 Pf1 = Pf0 - o1 + G2;\n  vec2 grad1 = texture2D(permTexture, Pi + o1*ONE).rg * 4.0 - 1.0;\n  float t1 = 0.5 - dot(Pf1, Pf1);\n  float n1;\n  if (t1 < 0.0) n1 = 0.0;\n  else {\n    t1 *= t1;\n    n1 = t1 * t1 * dot(grad1, Pf1);\n  }\n  \n  // Noise contribution from last corner\n  vec2 Pf2 = Pf0 - vec2(1.0-2.0*G2);\n  vec2 grad2 = texture2D(permTexture, Pi + vec2(ONE, ONE)).rg * 4.0 - 1.0;\n  float t2 = 0.5 - dot(Pf2, Pf2);\n  float n2;\n  if(t2 < 0.0) n2 = 0.0;\n  else {\n    t2 *= t2;\n    n2 = t2 * t2 * dot(grad2, Pf2);\n  }\n\n  // Sum up and scale the result to cover the range [-1,1]\n  return 70.0 * (n0 + n1 + n2);\n}\n\n\n/*\n * 3D simplex noise. Comparable in speed to classic noise, better looking.\n */\nfloat snoise(vec3 P) {\n\n// The skewing and unskewing factors are much simpler for the 3D case\n#define F3 0.333333333333\n#define G3 0.166666666667\n\n  // Skew the (x,y,z) space to determine which cell of 6 simplices we're in\n \tfloat s = (P.x + P.y + P.z) * F3; // Factor for 3D skewing\n  vec3 Pi = floor(P + s);\n  float t = (Pi.x + Pi.y + Pi.z) * G3;\n  vec3 P0 = Pi - t; // Unskew the cell origin back to (x,y,z) space\n  Pi = Pi * ONE + ONEHALF; // Integer part, scaled and offset for texture lookup\n\n  vec3 Pf0 = P - P0;  // The x,y distances from the cell origin\n\n  // For the 3D case, the simplex shape is a slightly irregular tetrahedron.\n  // To find out which of the six possible tetrahedra we're in, we need to\n  // determine the magnitude ordering of x, y and z components of Pf0.\n  // The method below is explained briefly in the C code. It uses a small\n  // 1D texture as a lookup table. The table is designed to work for both\n  // 3D and 4D noise, so only 8 (only 6, actually) of the 64 indices are\n  // used here.\n  float c1 = (Pf0.x > Pf0.y) ? 0.5078125 : 0.0078125; // 1/2 + 1/128\n  float c2 = (Pf0.x > Pf0.z) ? 0.25 : 0.0;\n  float c3 = (Pf0.y > Pf0.z) ? 0.125 : 0.0;\n  float sindex = c1 + c2 + c3;\n  vec3 offsets = texture2D(simplexTexture, vec2(sindex, 0.0)).rgb;\n//  vec3 offsets = texture1D(simplexTexture, sindex).rgb;\n  vec3 o1 = step(0.375, offsets);\n  vec3 o2 = step(0.125, offsets);\n\n  // Noise contribution from simplex origin\n  float perm0 = texture2D(permTexture, Pi.xy).a;\n  vec3  grad0 = texture2D(permTexture, vec2(perm0, Pi.z)).rgb * 4.0 - 1.0;\n  float t0 = 0.6 - dot(Pf0, Pf0);\n  float n0;\n  if (t0 < 0.0) n0 = 0.0;\n  else {\n    t0 *= t0;\n    n0 = t0 * t0 * dot(grad0, Pf0);\n  }\n\n  // Noise contribution from second corner\n  vec3 Pf1 = Pf0 - o1 + G3;\n  float perm1 = texture2D(permTexture, Pi.xy + o1.xy*ONE).a;\n  vec3  grad1 = texture2D(permTexture, vec2(perm1, Pi.z + o1.z*ONE)).rgb * 4.0 - 1.0;\n  float t1 = 0.6 - dot(Pf1, Pf1);\n  float n1;\n  if (t1 < 0.0) n1 = 0.0;\n  else {\n    t1 *= t1;\n    n1 = t1 * t1 * dot(grad1, Pf1);\n  }\n  \n  // Noise contribution from third corner\n  vec3 Pf2 = Pf0 - o2 + 2.0 * G3;\n  float perm2 = texture2D(permTexture, Pi.xy + o2.xy*ONE).a;\n  vec3  grad2 = texture2D(permTexture, vec2(perm2, Pi.z + o2.z*ONE)).rgb * 4.0 - 1.0;\n  float t2 = 0.6 - dot(Pf2, Pf2);\n  float n2;\n  if (t2 < 0.0) n2 = 0.0;\n  else {\n    t2 *= t2;\n    n2 = t2 * t2 * dot(grad2, Pf2);\n  }\n  \n  // Noise contribution from last corner\n  vec3 Pf3 = Pf0 - vec3(1.0-3.0*G3);\n  float perm3 = texture2D(permTexture, Pi.xy + vec2(ONE, ONE)).a;\n  vec3  grad3 = texture2D(permTexture, vec2(perm3, Pi.z + ONE)).rgb * 4.0 - 1.0;\n  float t3 = 0.6 - dot(Pf3, Pf3);\n  float n3;\n  if(t3 < 0.0) n3 = 0.0;\n  else {\n    t3 *= t3;\n    n3 = t3 * t3 * dot(grad3, Pf3);\n  }\n\n  // Sum up and scale the result to cover the range [-1,1]\n  return 32.0 * (n0 + n1 + n2 + n3);\n}\n\n\n/*\n * 4D simplex noise. A lot faster than classic 4D noise, and better looking.\n */\n\nfloat snoise(vec4 P) {\n\n// The skewing and unskewing factors are hairy again for the 4D case\n// This is (sqrt(5.0)-1.0)/4.0\n#define F4 0.309016994375\n// This is (5.0-sqrt(5.0))/20.0\n#define G4 0.138196601125\n\n  // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in\n \tfloat s = (P.x + P.y + P.z + P.w) * F4; // Factor for 4D skewing\n  vec4 Pi = floor(P + s);\n  float t = (Pi.x + Pi.y + Pi.z + Pi.w) * G4;\n  vec4 P0 = Pi - t; // Unskew the cell origin back to (x,y,z,w) space\n  Pi = Pi * ONE + ONEHALF; // Integer part, scaled and offset for texture lookup\n\n  vec4 Pf0 = P - P0;  // The x,y distances from the cell origin\n\n  // For the 4D case, the simplex is a 4D shape I won't even try to describe.\n  // To find out which of the 24 possible simplices we're in, we need to\n  // determine the magnitude ordering of x, y, z and w components of Pf0.\n  // The method below is presented without explanation. It uses a small 1D\n  // texture as a lookup table. The table is designed to work for both\n  // 3D and 4D noise and contains 64 indices, of which only 24 are actually\n  // used. An extension to 5D would require a larger texture here.\n  float c1 = (Pf0.x > Pf0.y) ? 0.5078125 : 0.0078125; // 1/2 + 1/128\n  float c2 = (Pf0.x > Pf0.z) ? 0.25 : 0.0;\n  float c3 = (Pf0.y > Pf0.z) ? 0.125 : 0.0;\n  float c4 = (Pf0.x > Pf0.w) ? 0.0625 : 0.0;\n  float c5 = (Pf0.y > Pf0.w) ? 0.03125 : 0.0;\n  float c6 = (Pf0.z > Pf0.w) ? 0.015625 : 0.0;\n  float sindex = c1 + c2 + c3 + c4 + c5 + c6;\n  vec4 offsets = texture2D(simplexTexture, vec2(sindex, 0.0)).rgba;\n//  vec4 offsets = texture1D(simplexTexture, sindex).rgba;\n  vec4 o1 = step(0.625, offsets);\n  vec4 o2 = step(0.375, offsets);\n  vec4 o3 = step(0.125, offsets);\n\n  // Noise contribution from simplex origin\n  float perm0xy = texture2D(permTexture, Pi.xy).a;\n  float perm0zw = texture2D(permTexture, Pi.zw).a;\n  vec4  grad0 = texture2D(gradTexture, vec2(perm0xy, perm0zw)).rgba * 4.0 - 1.0;\n  float t0 = 0.6 - dot(Pf0, Pf0);\n  float n0;\n  if (t0 < 0.0) n0 = 0.0;\n  else {\n    t0 *= t0;\n    n0 = t0 * t0 * dot(grad0, Pf0);\n  }\n\n  // Noise contribution from second corner\n  vec4 Pf1 = Pf0 - o1 + G4;\n  o1 = o1 * ONE;\n  float perm1xy = texture2D(permTexture, Pi.xy + o1.xy).a;\n  float perm1zw = texture2D(permTexture, Pi.zw + o1.zw).a;\n  vec4  grad1 = texture2D(gradTexture, vec2(perm1xy, perm1zw)).rgba * 4.0 - 1.0;\n  float t1 = 0.6 - dot(Pf1, Pf1);\n  float n1;\n  if (t1 < 0.0) n1 = 0.0;\n  else {\n    t1 *= t1;\n    n1 = t1 * t1 * dot(grad1, Pf1);\n  }\n  \n  // Noise contribution from third corner\n  vec4 Pf2 = Pf0 - o2 + 2.0 * G4;\n  o2 = o2 * ONE;\n  float perm2xy = texture2D(permTexture, Pi.xy + o2.xy).a;\n  float perm2zw = texture2D(permTexture, Pi.zw + o2.zw).a;\n  vec4  grad2 = texture2D(gradTexture, vec2(perm2xy, perm2zw)).rgba * 4.0 - 1.0;\n  float t2 = 0.6 - dot(Pf2, Pf2);\n  float n2;\n  if (t2 < 0.0) n2 = 0.0;\n  else {\n    t2 *= t2;\n    n2 = t2 * t2 * dot(grad2, Pf2);\n  }\n  \n  // Noise contribution from fourth corner\n  vec4 Pf3 = Pf0 - o3 + 3.0 * G4;\n  o3 = o3 * ONE;\n  float perm3xy = texture2D(permTexture, Pi.xy + o3.xy).a;\n  float perm3zw = texture2D(permTexture, Pi.zw + o3.zw).a;\n  vec4  grad3 = texture2D(gradTexture, vec2(perm3xy, perm3zw)).rgba * 4.0 - 1.0;\n  float t3 = 0.6 - dot(Pf3, Pf3);\n  float n3;\n  if (t3 < 0.0) n3 = 0.0;\n  else {\n    t3 *= t3;\n    n3 = t3 * t3 * dot(grad3, Pf3);\n  }\n  \n  // Noise contribution from last corner\n  vec4 Pf4 = Pf0 - vec4(1.0-4.0*G4);\n  float perm4xy = texture2D(permTexture, Pi.xy + vec2(ONE, ONE)).a;\n  float perm4zw = texture2D(permTexture, Pi.zw + vec2(ONE, ONE)).a;\n  vec4  grad4 = texture2D(gradTexture, vec2(perm4xy, perm4zw)).rgba * 4.0 - 1.0;\n  float t4 = 0.6 - dot(Pf4, Pf4);\n  float n4;\n  if(t4 < 0.0) n4 = 0.0;\n  else {\n    t4 *= t4;\n    n4 = t4 * t4 * dot(grad4, Pf4);\n  }\n\n  // Sum up and scale the result to cover the range [-1,1]\n  return 27.0 * (n0 + n1 + n2 + n3 + n4);\n}\n\n<%\n} else {\n// non-texture-based implementation:\n// Ian McEwan, Ashima Arts.\n// Copyright (C) 2011 Ashima Arts. All rights reserved.\n// Distributed under the MIT License. See LICENSE file.\n%>\n\nvec4 permute(vec4 x)\n{\n  return mod(((x*34.0)+1.0)*x, 289.0);\n}\n\nvec3 permute(vec3 x)\n{\n  return mod(((x*34.0)+1.0)*x, 289.0);\n}\n\nfloat permute(float x)\n{\n  return floor(mod(((x*34.0)+1.0)*x, 289.0));\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip)\n{\n  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n  vec4 p,s;\n\n  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n  s = vec4(lessThan(p, vec4(0.0)));\n  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n  return p;\n}\n\nvec4 fade(vec4 t) {\n  return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\nvec3 fade(vec3 t) {\n  return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\nvec2 fade(vec2 t) {\n  return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\n// Classic Perlin noise\nfloat cnoise(vec2 P)\n{\n  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);\n  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);\n  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation\n  vec4 ix = Pi.xzxz;\n  vec4 iy = Pi.yyww;\n  vec4 fx = Pf.xzxz;\n  vec4 fy = Pf.yyww;\n\n  vec4 i = permute(permute(ix) + iy);\n\n  vec4 gx = 2.0 * fract(i / 41.0) - 1.0 ;\n  vec4 gy = abs(gx) - 0.5 ;\n  vec4 tx = floor(gx + 0.5);\n  gx = gx - tx;\n\n  vec2 g00 = vec2(gx.x,gy.x);\n  vec2 g10 = vec2(gx.y,gy.y);\n  vec2 g01 = vec2(gx.z,gy.z);\n  vec2 g11 = vec2(gx.w,gy.w);\n\n  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));\n  g00 *= norm.x;\n  g01 *= norm.y;\n  g10 *= norm.z;\n  g11 *= norm.w;\n\n  float n00 = dot(g00, vec2(fx.x, fy.x));\n  float n10 = dot(g10, vec2(fx.y, fy.y));\n  float n01 = dot(g01, vec2(fx.z, fy.z));\n  float n11 = dot(g11, vec2(fx.w, fy.w));\n\n  vec2 fade_xy = fade(Pf.xy);\n  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);\n  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);\n  return 2.3 * n_xy;\n}\n\n// Classic Perlin noise, periodic variant\nfloat pnoise(vec2 P, vec2 rep)\n{\n  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);\n  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);\n  Pi = mod(Pi, rep.xyxy); // To create noise with explicit period\n  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation\n  vec4 ix = Pi.xzxz;\n  vec4 iy = Pi.yyww;\n  vec4 fx = Pf.xzxz;\n  vec4 fy = Pf.yyww;\n\n  vec4 i = permute(permute(ix) + iy);\n\n  vec4 gx = 2.0 * fract(i / 41.0) - 1.0 ;\n  vec4 gy = abs(gx) - 0.5 ;\n  vec4 tx = floor(gx + 0.5);\n  gx = gx - tx;\n\n  vec2 g00 = vec2(gx.x,gy.x);\n  vec2 g10 = vec2(gx.y,gy.y);\n  vec2 g01 = vec2(gx.z,gy.z);\n  vec2 g11 = vec2(gx.w,gy.w);\n\n  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));\n  g00 *= norm.x;\n  g01 *= norm.y;\n  g10 *= norm.z;\n  g11 *= norm.w;\n\n  float n00 = dot(g00, vec2(fx.x, fy.x));\n  float n10 = dot(g10, vec2(fx.y, fy.y));\n  float n01 = dot(g01, vec2(fx.z, fy.z));\n  float n11 = dot(g11, vec2(fx.w, fy.w));\n\n  vec2 fade_xy = fade(Pf.xy);\n  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);\n  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);\n  return 2.3 * n_xy;\n}\n\n// Classic Perlin noise\nfloat cnoise(vec3 P)\n{\n  vec3 Pi0 = floor(P); // Integer part for indexing\n  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n  Pi0 = mod(Pi0, 289.0);\n  Pi1 = mod(Pi1, 289.0);\n  vec3 Pf0 = fract(P); // Fractional part for interpolation\n  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = Pi0.zzzz;\n  vec4 iz1 = Pi1.zzzz;\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n\n  vec4 gx0 = ixy0 / 7.0;\n  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n  gx0 = fract(gx0);\n  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n  vec4 sz0 = step(gz0, vec4(0.0));\n  gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n  gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n  vec4 gx1 = ixy1 / 7.0;\n  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n  gx1 = fract(gx1);\n  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n  vec4 sz1 = step(gz1, vec4(0.0));\n  gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n  gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n  g000 *= norm0.x;\n  g010 *= norm0.y;\n  g100 *= norm0.z;\n  g110 *= norm0.w;\n  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n  g001 *= norm1.x;\n  g011 *= norm1.y;\n  g101 *= norm1.z;\n  g111 *= norm1.w;\n\n  float n000 = dot(g000, Pf0);\n  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n  float n111 = dot(g111, Pf1);\n\n  vec3 fade_xyz = fade(Pf0);\n  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);\n  return 2.2 * n_xyz;\n}\n\n// Classic Perlin noise, periodic variant\nfloat pnoise(vec3 P, vec3 rep)\n{\n  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period\n  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period\n  Pi0 = mod(Pi0, 289.0);\n  Pi1 = mod(Pi1, 289.0);\n  vec3 Pf0 = fract(P); // Fractional part for interpolation\n  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = Pi0.zzzz;\n  vec4 iz1 = Pi1.zzzz;\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n\n  vec4 gx0 = ixy0 / 7.0;\n  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n  gx0 = fract(gx0);\n  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n  vec4 sz0 = step(gz0, vec4(0.0));\n  gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n  gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n  vec4 gx1 = ixy1 / 7.0;\n  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n  gx1 = fract(gx1);\n  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n  vec4 sz1 = step(gz1, vec4(0.0));\n  gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n  gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n  g000 *= norm0.x;\n  g010 *= norm0.y;\n  g100 *= norm0.z;\n  g110 *= norm0.w;\n  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n  g001 *= norm1.x;\n  g011 *= norm1.y;\n  g101 *= norm1.z;\n  g111 *= norm1.w;\n\n  float n000 = dot(g000, Pf0);\n  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n  float n111 = dot(g111, Pf1);\n\n  vec3 fade_xyz = fade(Pf0);\n  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);\n  return 2.2 * n_xyz;\n}\n\n// Classic Perlin noise\nfloat cnoise(vec4 P)\n{\n  vec4 Pi0 = floor(P); // Integer part for indexing\n  vec4 Pi1 = Pi0 + 1.0; // Integer part + 1\n  Pi0 = mod(Pi0, 289.0);\n  Pi1 = mod(Pi1, 289.0);\n  vec4 Pf0 = fract(P); // Fractional part for interpolation\n  vec4 Pf1 = Pf0 - 1.0; // Fractional part - 1.0\n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = vec4(Pi0.zzzz);\n  vec4 iz1 = vec4(Pi1.zzzz);\n  vec4 iw0 = vec4(Pi0.wwww);\n  vec4 iw1 = vec4(Pi1.wwww);\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n  vec4 ixy00 = permute(ixy0 + iw0);\n  vec4 ixy01 = permute(ixy0 + iw1);\n  vec4 ixy10 = permute(ixy1 + iw0);\n  vec4 ixy11 = permute(ixy1 + iw1);\n\n  vec4 gx00 = ixy00 / 7.0;\n  vec4 gy00 = floor(gx00) / 7.0;\n  vec4 gz00 = floor(gy00) / 6.0;\n  gx00 = fract(gx00) - 0.5;\n  gy00 = fract(gy00) - 0.5;\n  gz00 = fract(gz00) - 0.5;\n  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);\n  vec4 sw00 = step(gw00, vec4(0.0));\n  gx00 -= sw00 * (step(0.0, gx00) - 0.5);\n  gy00 -= sw00 * (step(0.0, gy00) - 0.5);\n\n  vec4 gx01 = ixy01 / 7.0;\n  vec4 gy01 = floor(gx01) / 7.0;\n  vec4 gz01 = floor(gy01) / 6.0;\n  gx01 = fract(gx01) - 0.5;\n  gy01 = fract(gy01) - 0.5;\n  gz01 = fract(gz01) - 0.5;\n  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);\n  vec4 sw01 = step(gw01, vec4(0.0));\n  gx01 -= sw01 * (step(0.0, gx01) - 0.5);\n  gy01 -= sw01 * (step(0.0, gy01) - 0.5);\n\n  vec4 gx10 = ixy10 / 7.0;\n  vec4 gy10 = floor(gx10) / 7.0;\n  vec4 gz10 = floor(gy10) / 6.0;\n  gx10 = fract(gx10) - 0.5;\n  gy10 = fract(gy10) - 0.5;\n  gz10 = fract(gz10) - 0.5;\n  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);\n  vec4 sw10 = step(gw10, vec4(0.0));\n  gx10 -= sw10 * (step(0.0, gx10) - 0.5);\n  gy10 -= sw10 * (step(0.0, gy10) - 0.5);\n\n  vec4 gx11 = ixy11 / 7.0;\n  vec4 gy11 = floor(gx11) / 7.0;\n  vec4 gz11 = floor(gy11) / 6.0;\n  gx11 = fract(gx11) - 0.5;\n  gy11 = fract(gy11) - 0.5;\n  gz11 = fract(gz11) - 0.5;\n  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);\n  vec4 sw11 = step(gw11, vec4(0.0));\n  gx11 -= sw11 * (step(0.0, gx11) - 0.5);\n  gy11 -= sw11 * (step(0.0, gy11) - 0.5);\n\n  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);\n  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);\n  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);\n  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);\n  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);\n  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);\n  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);\n  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);\n  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);\n  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);\n  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);\n  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);\n  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);\n  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);\n  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);\n  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);\n\n  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));\n  g0000 *= norm00.x;\n  g0100 *= norm00.y;\n  g1000 *= norm00.z;\n  g1100 *= norm00.w;\n\n  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));\n  g0001 *= norm01.x;\n  g0101 *= norm01.y;\n  g1001 *= norm01.z;\n  g1101 *= norm01.w;\n\n  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));\n  g0010 *= norm10.x;\n  g0110 *= norm10.y;\n  g1010 *= norm10.z;\n  g1110 *= norm10.w;\n\n  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));\n  g0011 *= norm11.x;\n  g0111 *= norm11.y;\n  g1011 *= norm11.z;\n  g1111 *= norm11.w;\n\n  float n0000 = dot(g0000, Pf0);\n  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));\n  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));\n  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));\n  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));\n  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));\n  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));\n  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));\n  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));\n  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));\n  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));\n  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));\n  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));\n  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));\n  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));\n  float n1111 = dot(g1111, Pf1);\n\n  vec4 fade_xyzw = fade(Pf0);\n  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);\n  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);\n  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);\n  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);\n  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);\n  return 2.2 * n_xyzw;\n}\n\n// Classic Perlin noise, periodic version\nfloat cnoise(vec4 P, vec4 rep)\n{\n  vec4 Pi0 = mod(floor(P), rep); // Integer part modulo rep\n  vec4 Pi1 = mod(Pi0 + 1.0, rep); // Integer part + 1 mod rep\n  vec4 Pf0 = fract(P); // Fractional part for interpolation\n  vec4 Pf1 = Pf0 - 1.0; // Fractional part - 1.0\n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = vec4(Pi0.zzzz);\n  vec4 iz1 = vec4(Pi1.zzzz);\n  vec4 iw0 = vec4(Pi0.wwww);\n  vec4 iw1 = vec4(Pi1.wwww);\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n  vec4 ixy00 = permute(ixy0 + iw0);\n  vec4 ixy01 = permute(ixy0 + iw1);\n  vec4 ixy10 = permute(ixy1 + iw0);\n  vec4 ixy11 = permute(ixy1 + iw1);\n\n  vec4 gx00 = ixy00 / 7.0;\n  vec4 gy00 = floor(gx00) / 7.0;\n  vec4 gz00 = floor(gy00) / 6.0;\n  gx00 = fract(gx00) - 0.5;\n  gy00 = fract(gy00) - 0.5;\n  gz00 = fract(gz00) - 0.5;\n  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);\n  vec4 sw00 = step(gw00, vec4(0.0));\n  gx00 -= sw00 * (step(0.0, gx00) - 0.5);\n  gy00 -= sw00 * (step(0.0, gy00) - 0.5);\n\n  vec4 gx01 = ixy01 / 7.0;\n  vec4 gy01 = floor(gx01) / 7.0;\n  vec4 gz01 = floor(gy01) / 6.0;\n  gx01 = fract(gx01) - 0.5;\n  gy01 = fract(gy01) - 0.5;\n  gz01 = fract(gz01) - 0.5;\n  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);\n  vec4 sw01 = step(gw01, vec4(0.0));\n  gx01 -= sw01 * (step(0.0, gx01) - 0.5);\n  gy01 -= sw01 * (step(0.0, gy01) - 0.5);\n\n  vec4 gx10 = ixy10 / 7.0;\n  vec4 gy10 = floor(gx10) / 7.0;\n  vec4 gz10 = floor(gy10) / 6.0;\n  gx10 = fract(gx10) - 0.5;\n  gy10 = fract(gy10) - 0.5;\n  gz10 = fract(gz10) - 0.5;\n  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);\n  vec4 sw10 = step(gw10, vec4(0.0));\n  gx10 -= sw10 * (step(0.0, gx10) - 0.5);\n  gy10 -= sw10 * (step(0.0, gy10) - 0.5);\n\n  vec4 gx11 = ixy11 / 7.0;\n  vec4 gy11 = floor(gx11) / 7.0;\n  vec4 gz11 = floor(gy11) / 6.0;\n  gx11 = fract(gx11) - 0.5;\n  gy11 = fract(gy11) - 0.5;\n  gz11 = fract(gz11) - 0.5;\n  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);\n  vec4 sw11 = step(gw11, vec4(0.0));\n  gx11 -= sw11 * (step(0.0, gx11) - 0.5);\n  gy11 -= sw11 * (step(0.0, gy11) - 0.5);\n\n  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);\n  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);\n  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);\n  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);\n  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);\n  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);\n  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);\n  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);\n  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);\n  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);\n  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);\n  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);\n  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);\n  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);\n  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);\n  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);\n\n  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));\n  g0000 *= norm00.x;\n  g0100 *= norm00.y;\n  g1000 *= norm00.z;\n  g1100 *= norm00.w;\n\n  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));\n  g0001 *= norm01.x;\n  g0101 *= norm01.y;\n  g1001 *= norm01.z;\n  g1101 *= norm01.w;\n\n  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));\n  g0010 *= norm10.x;\n  g0110 *= norm10.y;\n  g1010 *= norm10.z;\n  g1110 *= norm10.w;\n\n  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));\n  g0011 *= norm11.x;\n  g0111 *= norm11.y;\n  g1011 *= norm11.z;\n  g1111 *= norm11.w;\n\n  float n0000 = dot(g0000, Pf0);\n  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));\n  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));\n  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));\n  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));\n  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));\n  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));\n  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));\n  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));\n  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));\n  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));\n  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));\n  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));\n  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));\n  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));\n  float n1111 = dot(g1111, Pf1);\n\n  vec4 fade_xyzw = fade(Pf0);\n  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);\n  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);\n  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);\n  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);\n  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);\n  return 2.2 * n_xyzw;\n}\n\nfloat snoise(vec2 v)\n  {\n  const vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0\n                      0.366025403784439, // 0.5*(sqrt(3.0)-1.0)\n                     -0.577350269189626, // -1.0 + 2.0 * C.x\n                      0.024390243902439); // 1.0 / 41.0\n// First corner\n  vec2 i = floor(v + dot(v, C.yy) );\n  vec2 x0 = v - i + dot(i, C.xx);\n\n// Other corners\n  vec2 i1;\n  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0\n  //i1.y = 1.0 - i1.x;\n  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n  // x0 = x0 - 0.0 + 0.0 * C.xx ;\n  // x1 = x0 - i1 + 1.0 * C.xx ;\n  // x2 = x0 - 1.0 + 2.0 * C.xx ;\n  vec4 x12 = x0.xyxy + C.xxzz;\n  x12.xy -= i1;\n\n// Permutations\n  i = mod(i, 289.0); // Avoid truncation effects in permutation\n  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))\n+ i.x + vec3(0.0, i1.x, 1.0 ));\n\n  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n  m = m*m ;\n  m = m*m ;\n\n// Gradients: 41 points uniformly over a line, mapped onto a diamond.\n// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)\n\n  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n  vec3 h = abs(x) - 0.5;\n  vec3 ox = floor(x + 0.5);\n  vec3 a0 = x - ox;\n\n// Normalise gradients implicitly by scaling m\n// Inlined for speed: m *= taylorInvSqrt( a0*a0 + h*h );\n  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n\n// Compute final noise value at P\n  vec3 g;\n  g.x = a0.x * x0.x + h.x * x0.y;\n  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n  return 130.0 * dot(m, g);\n}\n\nfloat snoise(vec3 v)\n{\n  const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i = floor(v + dot(v, C.yyy) );\n  vec3 x0 = v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min( g.xyz, l.zxy );\n  vec3 i2 = max( g.xyz, l.zxy );\n\n  // x0 = x0 - 0.0 + 0.0 * C.xxx;\n  // x1 = x0 - i1 + 1.0 * C.xxx;\n  // x2 = x0 - i2 + 2.0 * C.xxx;\n  // x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod(i, 289.0 );\n  vec4 p = permute( permute( permute(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3 ns = n_ * D.wyz - D.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ ); // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1.xy,h.z);\n  vec3 p3 = vec3(a1.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n}\n\nfloat snoise(vec4 v)\n{\n  const vec4 C = vec4( 0.138196601125011, // (5 - sqrt(5))/20 G4\n                        0.276393202250021, // 2 * G4\n                        0.414589803375032, // 3 * G4\n                       -0.447213595499958); // -1 + 4 * G4\n\n  // (sqrt(5) - 1)/4 = F4, used once below\n  #define F4 0.309016994374947451\n\n// First corner\n  vec4 i = floor(v + dot(v, vec4(F4)) );\n  vec4 x0 = v - i + dot(i, C.xxxx);\n\n// Other corners\n\n// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)\n  vec4 i0;\n  vec3 isX = step( x0.yzw, x0.xxx );\n  vec3 isYZ = step( x0.zww, x0.yyz );\n// i0.x = dot( isX, vec3( 1.0 ) );\n  i0.x = isX.x + isX.y + isX.z;\n  i0.yzw = 1.0 - isX;\n// i0.y += dot( isYZ.xy, vec2( 1.0 ) );\n  i0.y += isYZ.x + isYZ.y;\n  i0.zw += 1.0 - isYZ.xy;\n  i0.z += isYZ.z;\n  i0.w += 1.0 - isYZ.z;\n\n  // i0 now contains the unique values 0,1,2,3 in each channel\n  vec4 i3 = clamp( i0, 0.0, 1.0 );\n  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n  // x0 = x0 - 0.0 + 0.0 * C.xxxx\n  // x1 = x0 - i1 + 0.0 * C.xxxx\n  // x2 = x0 - i2 + 0.0 * C.xxxx\n  // x3 = x0 - i3 + 0.0 * C.xxxx\n  // x4 = x0 - 1.0 + 4.0 * C.xxxx\n  vec4 x1 = x0 - i1 + C.xxxx;\n  vec4 x2 = x0 - i2 + C.yyyy;\n  vec4 x3 = x0 - i3 + C.zzzz;\n  vec4 x4 = x0 + C.wwww;\n\n  // Permutations\n  i = mod(i, 289.0);\n  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n  vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n  // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope\n  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.\n  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n  vec4 p0 = grad4(j0, ip);\n  vec4 p1 = grad4(j1.x, ip);\n  vec4 p2 = grad4(j1.y, ip);\n  vec4 p3 = grad4(j1.z, ip);\n  vec4 p4 = grad4(j1.w, ip);\n\n  // Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n  p4 *= taylorInvSqrt(dot(p4,p4));\n\n  // Mix contributions from the five corners\n  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4) ), 0.0);\n  m0 = m0 * m0;\n  m1 = m1 * m1;\n  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n\n}\n\n<% } %>\n\n          #endif\n\n\nuniform float time;\nuniform sampler2D Flame, FlameMask, FlameNoise;\n\nvoid main() {\n  float t = time * 0.25;\n  vec2 texCoords = vTexCoords.xy;\n  \n  vec4 mask = texture2D(FlameMask, vTexCoords);\n  vec4 flame = texture2D(Flame, vTexCoords);\n  \n  texCoords.y -= t;\n  vec4 noise1 = texture2D(FlameNoise, texCoords) * 2.0 - 1.0;\n  texCoords.y -= t;\n  vec4 noise2 = texture2D(FlameNoise, texCoords * 2.0) * 2.0 - 1.0;\n  texCoords.y -= t;\n  vec4 noise3 = texture2D(FlameNoise, texCoords * 3.0) * 2.0 - 1.0;\n  \n  vec4 finalNoise = noise1 + noise2 + noise3;\n  float perturb = ((1.0 - vTexCoords.y) * 0.1) + 0.01;\n  vec2 noiseCoords = finalNoise.xy * perturb + vTexCoords.xy;\n  \n  vec4 fireColor   = texture2D(Flame, noiseCoords);\n  vec4 alphaColor  = texture2D(FlameMask, noiseCoords);\n  fireColor.a = alphaColor.r;\n  \n  gl_FragColor = fireColor;\n}\n",
  vertex:"shared attribute vec4 VERTEX_POSITION, VERTEX_COLOR;\nshared attribute vec3 VERTEX_NORMAL;\nshared attribute vec2 VERTEX_TEXCOORDS;\n\nvoid main(void) {\n  gl_Position = pMatrix * mvMatrix * VERTEX_POSITION;\n//  vNormal = VERTEX_NORMAL;\n//  vColor = VERTEX_COLOR;\n  vTexCoords = VERTEX_TEXCOORDS;\n}\n",
exports: {},
name: "torchfire"});
BlenderModel.addResources({"default":{"method":"GET","async":true,"scale":1,"lit":true,"color":{"red":1,"green":1,"blue":1,"alpha":1}},"torch":{"path":"/models/torch.json","scale":0.1,"color":{"red":0.5,"green":0.5,"blue":0.5,"alpha":1.0},"material":"torch","lit":false,"shadow_caster":false}});
Dungeon.addResources({"default":{"map":["XXXXXXXXXXXXXXXXXXXXXX","X'     '     '     ' X","X XXXXXXXXXXXXXXXXXX X","X XXXX'     '     'X'X","X'     XXXXXXXXXXXXX X","XXXXXXXXXXXXXXXXXXXXXX"],"player_start":{"position":"18, 3","direction":"-1, 0"}}});
LightSource.addResources({"lantern":{"shadowcaster":true,"enabled":true,"position":{"x":-20,"y":0,"z":0},"type":"POINT_LIGHT","attenuation":{"constant":0,"linear":1,"quadratic":0},"color":{"ambient":{"red":0.15,"green":0.15,"blue":0.15,"alpha":1},"diffuse":{"red":0.33,"green":0.1843137254901961,"blue":0.12679738562091503,"alpha":1.0},"specular":{"red":0,"green":0,"blue":0,"alpha":0}}},"torch":{"shadowcaster":true,"enabled":true,"position":{"x":-20,"y":0,"z":0},"direction":{"x":1,"y":0,"z":0},"type":"POINT_LIGHT","attenuation":{"constant":0,"linear":0,"quadratic":0.35},"flicker":0.075,"color":{"ambient":{"red":0.055,"green":0.032,"blue":0.023,"alpha":0.25},"diffuse":{"red":0.055,"green":0.032,"blue":0.023,"alpha":0.75},"specular":{"red":0,"green":0,"blue":0,"alpha":0}}}});
Material.addResources({"rock":{"ambient":{"red":1.0,"green":1.0,"blue":1.0,"alpha":1.0},"diffuse":{"red":1.0,"green":1.0,"blue":1.0,"alpha":1.0},"specular":{"red":0.0,"green":0.0,"blue":0.0,"alpha":0.0},"shininess":10,"layers":[{"type":"Lighting"},{"type":"Texture","path":"/images/rock.png","flip_y":false,"scale_x":1.0,"scale_y":1.0,"generate_mipmap":true,"min_filter":"GL_LINEAR","mag_filter":"GL_LINEAR","mipmap_hint":"GL_DONT_CARE","format":"GL_RGBA","data_type":"GL_UNSIGNED_BYTE","wrap_s":"GL_REPEAT","wrap_t":"GL_REPEAT","premultiply_alpha":false,"colorspace_conversion":true},{"type":"NormalMap","path":"/images/rockNormal.png","flip_y":false,"scale_x":1.0,"scale_y":1.0,"generate_mipmap":true,"min_filter":"GL_LINEAR","mag_filter":"GL_LINEAR","mipmap_hint":"GL_DONT_CARE","format":"GL_RGBA","data_type":"GL_UNSIGNED_BYTE","wrap_s":"GL_REPEAT","wrap_t":"GL_REPEAT","premultiply_alpha":false,"colorspace_conversion":true}]},"torch":{"ambient":{"red":0.5,"green":0.5,"blue":0.5,"alpha":1.0},"diffuse":{"red":0.5,"green":0.5,"blue":0.5,"alpha":1.0},"specular":{"red":0.5,"green":0.5,"blue":0.5,"alpha":1.0},"shininess":30,"layers":[{"type":"Lighting"}]},"torchfire":{"ambient":{"red":1.0,"green":1.0,"blue":1.0,"alpha":1.0},"diffuse":{"red":1.0,"green":1.0,"blue":1.0,"alpha":1.0},"specular":{"red":1.0,"green":1.0,"blue":1.0,"alpha":1.0},"shininess":30,"type":"Torchfire"}});
Jax.routes.root(DungeonController, "index");
Jax.routes.map("dungeon/index", DungeonController, "index");
