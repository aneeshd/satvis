var obj3d = undefined;

class Viz3d {
  constructor(width, height) {
    var div = d3.select("body").append("div")
      .attr("id", "viz")
      .attr("class", "3d");

    this.div = div;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.redraw();
  }

  redraw() {
    d3.select("div#viz").selectAll("canvas").remove();

    var Globe = undefined;
    var first = true;

    Globe = new ThreeGlobe()
        .globeImageUrl('https://raw.githubusercontent.com/aneeshd/earth-wallpaper/master/images/world.topo.bathy.200412.3x5400x2700.jpg') //'//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .showAtmosphere(false)
        .showGraticules(true)
        .customLayerData(satellites)
        .customThreeObject(d => new THREE.Mesh(
          new THREE.SphereBufferGeometry(0.5),
          new THREE.MeshLambertMaterial({ color: 'blue' })
        ))
        .customThreeObjectUpdate((obj, d) => {
          if (first) {
            obj3d = obj;
            console.log(obj, d);
          }
          first = false;
          Object.assign(obj.position, Globe.getCoords(d.posGd.latitude * DEGREES, d.posGd.longitude * DEGREES, d.posGd.height/6378));
          //Object.assign(obj.material.color, d.posGd.height>control.altitude_threshold ? {r:255,g:0,b:0} : {r:0,g:0,b:255});
          obj.material.color.set(d.posGd.height>control.altitude_threshold ? "#bda0bc" : "#03cea4");
        });
    
    this.Globe = Globe;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.width, this.height);
    document.getElementById('viz').appendChild(renderer.domElement);
    
    // Setup scene
    const scene = new THREE.Scene();
    console.log('globe', this.Globe);
    scene.add(this.Globe);
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera();
    camera.aspect = this.width/this.height;
    camera.updateProjectionMatrix();
    camera.position.z = 500;
    
    // Add camera controls
    const tbControls = new TrackballControls(camera, renderer.domElement);
    tbControls.minDistance = 101;
    tbControls.rotateSpeed = 5;
    tbControls.zoomSpeed = 0.8;
    
    this.tbControls = tbControls;
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
  }

  destroy() {
    this.div.remove();
  }

  update(time, selected_sats) {
    this.Globe
      .customLayerData(satellites)
      .pointsData([...pops.values()].concat(terminals))
      .pointLat(d => d.posGd.latitude * DEGREES)
      .pointLng(d => d.posGd.longitude * DEGREES)
      .pointAltitude(0.05)
      .pointColor(d => d.type=='pop' ? 'navy' : 'steelblue')
      // .labelsData([...pops.values()].concat(terminals))
      // .labelLat(d => d.posGd.latitude * DEGREES)
      // .labelLng(d => d.posGd.longitude * DEGREES)
      // .labelText(d => d.name)
      ;
    // Frame cycle
    this.tbControls.update();
    this.renderer.render(this.scene, this.camera);
    //requestAnimationFrame(this.animate);
  }

  plot_globe_with_defaults() {
    console.log('plot_globe_with_defaults');
    //this.plotglobe(world_info[0], this.graticule, this.map_context, this.map_path, true);
  }

}
