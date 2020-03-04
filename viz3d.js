
class Viz3d {
  constructor(width, height) {
    var div = d3.select("body").append("div")
      .attr("id", "viz")
      .attr("class", "3d");

    this.div = div;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.s2g_material1 = new THREE.LineBasicMaterial({
      color: 0x0000ff
    });
    this.s2g_material2 = new THREE.LineBasicMaterial({
      color: 0xff0000
    });

    this.s2s_material1 = new THREE.LineBasicMaterial({
      color: 0x5a0000
    });
    this.s2s_material2 = new THREE.LineBasicMaterial({
      color: 0x5a5a00
    });

    this.scene_ready = false;
    this.setup_scene();
    console.log("Viz3D constructor done");
  }

  setup_scene() {
    console.log('setup_scene', world_info);
    if (world_info==undefined) {
      console.log('no world info');
      this.scene_ready = false;
      return;
    }

    var world_detailed = world_info[0],
        world = world_info[1];

    d3.select("div#viz").selectAll("canvas").remove();

    var Globe = undefined;

    Globe = new ThreeGlobe({animateIn: false})
        .globeImageUrl(control.get_background_url())
        .bumpImageUrl('https://raw.githubusercontent.com/aneeshd/three-globe/master/example/img/earth-topology.png')
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
    this.s2g_line1 = new THREE.LineSegments( new THREE.Geometry(), this.s2g_material1 );
    this.Globe.parent.add(this.s2g_line1);
    this.s2g_line2 = new THREE.LineSegments( new THREE.Geometry(), this.s2g_material2 );
    this.Globe.parent.add(this.s2g_line2);

    // placeholder for sat-to-sat links
    this.s2s_line1 = new THREE.LineSegments( new THREE.Geometry(), this.s2s_material1 );
    this.Globe.parent.add(this.s2s_line1);
    this.s2s_line2 = new THREE.LineSegments( new THREE.Geometry(), this.s2s_material2 );
    this.Globe.parent.add(this.s2s_line2);

    // countries
    const w = world_detailed;
    const countries = topojson.feature(w, w.objects.countries);
    var outline_material = new THREE.LineBasicMaterial({ color: 'white', transparent: true, opacity: 0.1 });
    this.countries = this.draw_geojson(countries.features, outline_material);

    // undersea cables
    this.cables = this.draw_geojson(world_info[2].features, outline_material);

    // cable landing stations
    var cls_material = new THREE.PointsMaterial({ color: 'rgb(0,100,100)', transparent: true, opacity: 0.5 });
    this.cable_ls = this.draw_geojson(world_info[3].features, cls_material);

    // ixps
    var ixp_material = new THREE.PointsMaterial({ color: 'maroon', transparent: true, opacity: 0.5 });
    this.ixps = this.draw_geojson(world_info[4].features, ixp_material);

    // // pop to gw connections
    // FIXME linewidth does not work; lines are almost impossible to see
    // var pop_material = new THREE.LineBasicMaterial({ color: 'rgb(128,128,0)', transparent: true, opacity: 0.9, linewidth: 5 });
    // this.pop_material = pop_material;
    // var pop_paths = [];
    // for (var d of pops.entries()) {
    //   if (d[0]==undefined || d[1]==undefined) continue;
    //   var pop = d[1];
    //   var pos = pop.posGd;
    //   pop.gw.forEach(function(gw) {
    //     var route = {type: "Feature", geometry: {type: "LineString", "coordinates": [
    //       [pos.longitude * DEGREES, pos.latitude * DEGREES],
    //       [gw.posGd.longitude * DEGREES, gw.posGd.latitude * DEGREES]
    //     ]}};
    //     pop_paths.push(route);
    //   });
    // }
    // this.pops = this.draw_geojson(pop_paths, pop_material);

    this.tbControls = tbControls;
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.scene_ready = true;
    this.redraw();

    (function animate() { // IIFE
      // Frame cycle
      tbControls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  }

  redraw() {
    if (!this.scene_ready) {
      this.setup_scene(); // calls redraw if everything ok
      return;
    }

    this.cables.visible = control.cables;
    this.cable_ls.visible = control.cables;
    this.ixps.visible = control.ixps;
    if (this.width != window.innerWidth || this.height != window.innerHeight) {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width/this.height;
      this.camera.updateProjectionMatrix();
    }
  }

  draw_geojson(features, material) {
    const self = this;
    const GLOBE_RADIUS = 100;
    var ret = new THREE.Group();
    features.forEach(({ properties, geometry }) => {
      var g = new THREE.GeoJsonGeometry(geometry, GLOBE_RADIUS);
      if (geometry.type=='MultiLineString' || geometry.type=='MultiPolygon') {
        var lineObj = new THREE.LineSegments(g, material);
        ret.add(lineObj);
      } else if (geometry.type=='Point' || geometry.type=='MultiPoints') {
        var ptsObj = new THREE.Points(g, material);
        ret.add(ptsObj);
      } else if (geometry.type=='LineString' || geometry.type=='Polygon') {
        var lineObj = new THREE.Line(g, material);
        ret.add(lineObj);
      // } else if () {
      } else {
        console.log('unknown GeoJson type', geometry);
      }
    });
    self.Globe.parent.add(ret);
    return ret;
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
      .pointAltitude(d => d==control._from_trm || d==control._to_trm || (control._from_trm && d==control._from_trm.pop) ? 0.1 : 0.01)
      .pointColor(d => d.type=='pop' ? 'navy' : 'steelblue')
      .pointsTransitionDuration(100)
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
  }

  draw_sat2ground(selected_sats) {
    this.Globe.parent.remove(this.s2g_line1);
    this.Globe.parent.remove(this.s2g_line2);

    var self = this, 
        s2g_geometry1 = new THREE.Geometry(),
        s2g_geometry2 = new THREE.Geometry();

    terminals.forEach(function(trm) {
      var pos = trm.posGd;
      var r = trm==control._from_trm ? 6 : trm==control._to_trm ? 6 : 2;
  
      var ln = pos.longitude * DEGREES, lt = pos.latitude * DEGREES, sz=.2*r;

      if (control.zen) {
        if (trm!=control._from_trm && trm!=control._to_trm) return;
      }

      if (control.s2g || control.zen) {
        trm.conn.forEach(function(s) {
          var sat = s[0], lookangles = s[1], dist = s[1].rangeSat;

          if (control.zen) {
            if (!selected_sats.includes(sat)) return;
          }

          var p1 = self.Globe.getCoords(lt, ln, 0),
              p2 = self.Globe.getCoords(sat.posGd.latitude * DEGREES, sat.posGd.longitude * DEGREES, sat.posGd.height/6378),
              el = lookangles.elevation * DEGREES,
              min_el = trm.minel,
              geom = (el>=(min_el+10) && el<=(180-min_el-10)) ? s2g_geometry1 : s2g_geometry2;
      
          geom.vertices.push(
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p2.x, p2.y, p2.z),
          )
        });
      }
    });

    this.s2g_line1 = new THREE.LineSegments( s2g_geometry1, this.s2g_material1 );
    this.Globe.parent.add(this.s2g_line1);
    this.s2g_line2 = new THREE.LineSegments( s2g_geometry2, this.s2g_material2 );
    this.Globe.parent.add(this.s2g_line2);
  }

  draw_sat2sat(selected_sats) {
    this.Globe.parent.remove(this.s2s_line1);
    this.Globe.parent.remove(this.s2s_line2);

    var self = this, 
        s2s_geometry1 = new THREE.Geometry(),
        s2s_geometry2 = new THREE.Geometry();

    satellites.forEach(function(sat) {
      if (control.zen && !selected_sats.includes(sat)) return;

      if (control.s2s) {
        var pos = sat.posGd,
            p1 = self.Globe.getCoords(pos.latitude * DEGREES, pos.longitude * DEGREES, pos.height/6378),
            geom = pos.height > control.altitude_threshold ? s2s_geometry1 : s2s_geometry2;

        for (var i=0; i<control.isl.num; i++) {
          try {
            var s = sat.conn[i];
            // if (s.conn.map(d => d[0]).indexOf(sat)==-1) continue;
          } catch(e) {
            //console.log('error', sat.name, i);
            continue;
          }

          var p2 = self.Globe.getCoords(s.posGd.latitude * DEGREES, s.posGd.longitude * DEGREES, s.posGd.height/6378);

          geom.vertices.push(
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p2.x, p2.y, p2.z),
          );
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
    if (!this.scene_ready) {
      this.setup_scene();
    }
    if (url === undefined) {
      this.Globe.globeImageUrl(null);
    } else {
      this.Globe.globeImageUrl(url);
    }
  }

  plot_globe_with_defaults() {
    this.redraw();
  }

}
