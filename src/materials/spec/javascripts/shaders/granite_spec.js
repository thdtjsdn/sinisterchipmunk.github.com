describe("Shader 'granite'", function() {
  var context, material, mesh;

  beforeEach(function() {
    context = new Jax.Context('webgl-canvas');
    mesh = new Jax.Mesh.Quad();
  });
  
  /* dispose the context so it doesn't continue using
     resources after the tests have completed */
  afterEach(function() { context.dispose(); });

  describe("stand-alone", function() {
    beforeEach(function() { mesh.material = new Jax.Material.Granite(); });

    xit("should render without error", function() {
      expect(function() { mesh.render(context); }).not.toThrow();
    });
  });

  describe("as a layer", function() {
    beforeEach(function() {
      mesh.material = new Jax.Material({layers:[{
        type:"Granite"
      }]});
    });

    xit("should render without error", function() {
      expect(function() { mesh.render(context); }).not.toThrow();
    });
  });
});
