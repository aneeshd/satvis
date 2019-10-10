
class Viz3d {
  constructor(width, height) {
    var div = d3.select("body").append("div")
      .attr("id", "viz")
      .attr("class", "3d");

    this.div = div;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.s2g_material = new THREE.LineBasicMaterial({
      color: 0x0000ff
    });

    this.s2s_material1 = new THREE.LineBasicMaterial({
      color: 0x00ff00
    });
    this.s2s_material2 = new THREE.LineBasicMaterial({
      color: 0x006666
    });

    this.redraw();
  }

  redraw() {
    if (world_info==undefined) return;

    var world_detailed = world_info[0],
        world = world_info[1];

    d3.select("div#viz").selectAll("canvas").remove();

    var Globe = undefined;

    Globe = new ThreeGlobe()
        .globeImageUrl(control.get_background_url())
        //.bumpImageUrl('Bump%20map.jpg')
        //.bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .bumpImageUrl('earth-topology.png')
        .showAtmosphere(false)
        .showGraticules(true)
        .customLayerData(satellites)
        .customThreeObject(d => new THREE.Mesh(
          new THREE.SphereBufferGeometry(0.5),
          new THREE.MeshLambertMaterial({ color: 'blue' })
        ))
        .customThreeObjectUpdate((obj, d) => {
          Object.assign(obj.position, Globe.getCoords(d.posGd.latitude * DEGREES, d.posGd.longitude * DEGREES, d.posGd.height/6378));
          obj.material.color.set(d.posGd.height>control.altitude_threshold ? "#bda0bc" : "#03cea4");
        });
    
    this.Globe = Globe;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.width, this.height);
    document.getElementById('viz').appendChild(renderer.domElement);
    
    // Setup scene
    const scene = new THREE.Scene();
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

    // placeholder for sat-to-ground links
    this.s2g_line = new THREE.LineSegments( new THREE.Geometry(), this.s2g_material );
    this.Globe.parent.add(this.s2g_line);

    // placeholder for sat-to-sat links
    this.s2s_line1 = new THREE.LineSegments( new THREE.Geometry(), this.s2s_material );
    this.Globe.parent.add(this.s2s_line1);
    this.s2s_line2 = new THREE.LineSegments( new THREE.Geometry(), this.s2s_material );
    this.Globe.parent.add(this.s2s_line2);

    // countries
    const w = world_detailed;
    const countries = topojson.feature(w, w.objects.countries);
    var outline_material = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0.1 });
    this.draw_geojson(countries.features, outline_material);

    // undersea cables
    this.draw_geojson(world_info[2].features, outline_material);

    // cable landing stations
    var cls_material = new THREE.PointsMaterial({ color: 'rgb(0,100,100)', transparent: true, opacity: 0.5 });
    this.draw_geojson(world_info[3].features, cls_material);

    // ixps
    var ixp_material = new THREE.PointsMaterial({ color: 'maroon', transparent: true, opacity: 0.5 });
    this.draw_geojson(world_info[4].features, ixp_material);
    
    this.tbControls = tbControls;
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
  }

  draw_geojson(features, material) {
    const self = this;
    const GLOBE_RADIUS = 100;
    features.forEach(({ properties, geometry }) => {
      var g = new THREE.GeoJsonGeometry(geometry, GLOBE_RADIUS);
      if (geometry.type=='MultiLineString' || geometry.type=='MultiPolygon') {
        var lineObj = new THREE.LineSegments(g, material);
        self.Globe.parent.add(lineObj);
      } else if (geometry.type=='Point' || geometry.type=='MultiPoints') {
        var ptsObj = new THREE.Points(g, material);
        self.Globe.parent.add(ptsObj);
      } else if (geometry.type=='LineString' || geometry.type=='Polygon') {
        var lineObj = new THREE.Line(g, material);
        self.Globe.parent.add(lineObj);
      // } else if () {
      } else {
        console.log('unknown GeoJson type', geometry);
      }
    });
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

      this.draw_sat2ground(selected_sats);
      this.draw_sat2sat(selected_sats);

    // Frame cycle
    this.tbControls.update();
    this.renderer.render(this.scene, this.camera);
    //requestAnimationFrame(this.animate);
  }

  draw_sat2ground(selected_sats) {
    this.Globe.parent.remove(this.s2g_line);

    var self = this, s2g_geometry = new THREE.Geometry();

    terminals.forEach(function(trm) {
      var pos = trm.posGd;
      var r = trm==control._from_trm ? 6 : trm==control._to_trm ? 6 : 2;
  
      var ln = pos.longitude * DEGREES, lt = pos.latitude * DEGREES, sz=.2*r;

      if (control.zen) {
        if (trm!=control._from_trm && trm!=control._to_trm) return;
      }

      if (control['sat-to-ground'] || control.zen) {
        trm.conn.forEach(function(s) {
          var sat = s[0], lookangles = s[1], dist = s[1].rangeSat;

          if (control.zen) {
            if (!selected_sats.includes(sat)) return;
          }

          var p1 = self.Globe.getCoords(pos.latitude * DEGREES, pos.longitude * DEGREES, 0),
              p2 = self.Globe.getCoords(sat.posGd.latitude * DEGREES, sat.posGd.longitude * DEGREES, sat.posGd.height/6378);
          s2g_geometry.vertices.push(
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p2.x, p2.y, p2.z),
          )
        });
      }
    });

    this.s2g_line = new THREE.LineSegments( s2g_geometry, this.s2g_material );
    this.Globe.parent.add(this.s2g_line);
  }

  draw_sat2sat(selected_sats) {
    this.Globe.parent.remove(this.s2s_line1);
    this.Globe.parent.remove(this.s2s_line2);

    var self = this, 
        s2s_geometry1 = new THREE.Geometry(),
        s2s_geometry2 = new THREE.Geometry();

    satellites.forEach(function(sat) {
      if (control.zen && !selected_sats.includes(sat)) return;

      if (control['sat-to-sat']) {
        var pos = sat.posGd,
            p1 = self.Globe.getCoords(pos.latitude * DEGREES, pos.longitude * DEGREES, pos.height/6378);

        for (var i=0; i<4; i++) {
          try {
            var s = sat.conn[i][0];
          } catch(e) {
            //console.log('error', sat.name, i);
            continue;
          }
          {
            var p2 = self.Globe.getCoords(s.posGd.latitude * DEGREES, s.posGd.longitude * DEGREES, s.posGd.height/6378),
                geom = pos.height > control.altitude_threshold ? s2s_geometry1 : s2s_geometry2;

            geom.vertices.push(
              new THREE.Vector3(p1.x, p1.y, p1.z),
              new THREE.Vector3(p2.x, p2.y, p2.z),
            );
          // } catch(e) {
          //   console.log('error', sat.name, s.name, s);
          }
        }
      }
  
    });

    this.s2s_line1 = new THREE.LineSegments( s2s_geometry1, this.s2s_material1 );
    this.Globe.parent.add(this.s2s_line1);
    this.s2s_line2 = new THREE.LineSegments( s2s_geometry2, this.s2s_material2 );
    this.Globe.parent.add(this.s2s_line2);
  }

  set_image_url(url) {
    console.log('set url', url);
    if (url === undefined) {
      this.Globe.globeImageUrl(null);
    } else {
      this.Globe.globeImageUrl(url);
    }
  }

  plot_globe_with_defaults() {
    //this.plotglobe(world_info[0], this.graticule, this.map_context, this.map_path, true);
  }

}
