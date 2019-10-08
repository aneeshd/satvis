class Viz2d {
  constructor(width, height) {
    this.graticule = d3.geoGraticule();

    var div = d3.select("body").append("div")
      .attr("id", "viz")
      .attr("class", "2d");

    this.map_canvas = div.append("canvas")
      .attr("id", "map_canvas")
      .attr("width", width)
      .attr("height", height);
    
    this.sat_canvas = div.append("canvas")
      .attr("id", "sat_canvas")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height);
    
    this.shade_canvas = div.append("canvas")
      .attr("id", "shade_canvas")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height);
    
    this.gw_overlay = div.append("svg")
      .attr("id", "gw_overlay")
      .attr("class", "gw")
      .style("overflow", "hidden")
      .style("width", width+"px")
      .style("height", height+"px");
    
    this.hidden_canvas = div.append("canvas")
      .attr("id", "hidden_canvas")
      .style("display", "none")
      .attr("width", width)
      .attr("height", height);
    
    this.hidden_canvas2 = div.append("canvas")
      .attr("id", "hidden_canvas2")
      .style("display", "none")
      .attr("width", width)
      .attr("height", height);
    
    this.map_context = this.map_canvas.node().getContext("2d");
    this.sat_context = this.sat_canvas.node().getContext("2d");
    this.shade_context = this.shade_canvas.node().getContext("2d");
    this.hidden_context = this.hidden_canvas.node().getContext("2d");
    this.hidden_context2 = this.hidden_canvas2.node().getContext("2d");
    this.sat_path = undefined;
    this.shade_path = undefined;
    this.map_path = undefined;
    
    this.width = width;
    this.height = height;
    console.log('construct', this);
  }

  update(time, selected_sats) {
    var self = this;

    this.sat_context.clearRect(0, 0, this.width, this.height);
    this.sat_context.drawImage(this.sat_canvas.node(), 0, 0);
    
    this.plotshade(time, this.shade_context, this.shade_path);

    satellites.forEach(function(d) {
      self.draw_sat(d, selected_sats);
    });

    this.draw_terminals_and_pops(terminals, pops);

    terminals.forEach(function(d) {
      self.draw_terminal(d, selected_sats);
    });

    for (var d of pops.entries()) {
      if (d[0]==undefined || d[1]==undefined) continue;
      this.draw_pop(d[0], d[1]);
    }
  }

  redraw() {

    if (world_info==undefined) return;

    var world_detailed = world_info[0],
        world = world_info[1];

    this.width = Math.floor( window.innerWidth );
    this.height = Math.floor( window.innerHeight );

    var width = this.width,
        height = this.height;

    d3.selectAll("canvas")
      .attr("height", height)
      .attr("width", width);
    d3.selectAll("svg.gw")
      .style("width", width+"px")
      .style("height", height+"px");

    var qid = undefined;
    var self = this;

    function delayed_draw(callback) {
      if (qid != undefined) {
        clearTimeout(qid);
      }
      qid = setTimeout(function() {
        self.plotglobe(world_detailed, self.graticule, self.map_context, self.map_path, true);
        d3.select("svg.gw").style("display","block");
        run_iteration();
        callback(null);
        qid = undefined;
      }, 0);
      return {
        abort: function() {
          clearTimeout(id);
        }
      };
    }

    console.log('switching to', control.projection);
    this.projection = eval('d3.geo'+control.projection)()
        .fitSize([width*0.8, height*0.8], topojson.feature(world, world.objects.land))
        .translate([width / 2, height / 2])
        .precision(.1);

    this.map_path = d3.geoPath()
      .projection(this.projection)
      .context(this.map_context);

    this.shade_path = d3.geoPath()
      .projection(this.projection)
      .context(this.shade_context);

    this.sat_path = d3.geoPath()
      .projection(this.projection)
      .context(this.sat_context);

    var self = this;
    var node = this.gw_overlay.node();
    var zoom = d3.geoZoom()
      .projection(this.projection)
      .onMove(function() {
        // draw low resolution map while dragging, and then a detailed one when done
        // d3.select("svg.gw").style("display", "none");
        self.plotglobe(world, self.graticule, self.map_context, self.map_path, false);
        self.sat_context.clearRect(0, 0, self.width, self.height);
        q.defer(delayed_draw);
      })
      .northUp(true)
      (node);

    this.plotglobe(world_detailed, this.graticule, this.map_context, this.map_path, true);

    run_iteration();
  }

  plotland(world, context, path) {
    context.fillStyle = "rgb(9,26,43)";
    context.beginPath();
    path({type: 'Sphere'});
    context.fill();

    context.fillStyle = "rgb(248,244,240)";
    context.beginPath();
    path(topojson.feature(world, world.objects.land));
    context.fill();
  }

  plotglobe(world, graticule, context, path, detailed) {
    context.clearRect(0,0,width,height);

    var image_complete = image.complete && image.width>0 && image.height>0;

    if (!detailed || (detailed && !image_complete)) {
        this.plotland(world, context, path);
    } else {
      // context.strokeStyle = "red";
      // context.beginPath();
      // path({type: 'Sphere'});
      // context.lineWidth = 10;
      // context.stroke();
    }

    if (detailed) {
      if (image_complete) {
        this.on_image_load();
      } else {
        var self = this;
        image.onload = (() => self.plotglobe(world, graticule, context, path, detailed));
        this.plotland(world, context, path);
      }
    }

    context.strokeStyle = "rgb(214,210,213)";
    context.beginPath();
    path(topojson.feature(world, world.objects.countries));
    context.lineWidth = 1;
    context.stroke();

    context.strokeStyle = "#eee";
    context.beginPath();
    path(graticule());
    context.lineWidth = 1;
    context.stroke();

    context.beginPath();
    path(graticule.outline());
    context.lineWidth = 1;
    context.stroke();

    if (detailed && control.cables) {
      context.strokeStyle = "rgba(200,200,200,0.5)";
      context.beginPath();
      path(world_info[2]);
      context.lineWidth = 2;
      context.stroke();
    }

    var projection = this.projection;

    var drawfn = function(data, container, icon, icon2, val, titlefn) {
      var p = d3.select(container)
                .selectAll("text."+icon)
                .data(data);

      p.enter()
       .append("text")
       .attr("class", icon2+" "+icon);

      d3.select(container).selectAll("text."+icon)
        .attr("title", titlefn)
        .attrs(function (d) {
          var pos = projection([d.geometry.coordinates[0], d.geometry.coordinates[1]]);
          return {
            x: pos[0],
            y: pos[1],
          }
        })
        .html(d => val + '<title>' + titlefn(d) + '</title>');
    };

    if (detailed && control.cables) {
      drawfn(world_info[3].features, "svg.gw", "cable-ls", "far", '\uf111', d => d.properties.name + ' / ' + d.properties.slug);
    } else {
      d3.select("svg.gw").selectAll("text.cable-ls").remove();
    }
    if (detailed && control.ixps) {
      drawfn(world_info[4].features, "svg.gw", "ixp", "far", '\uf111', d => d.properties.metro_area + ' / ' + d.properties.slug);
    } else {
      d3.select("svg.gw").selectAll("text.ixp").remove();
    }

  }

  plot_globe_with_defaults() {
    this.plotglobe(world_info[0], this.graticule, this.map_context, this.map_path, true);
  }

  // Adapted from http://techslides.com/d3-globe-with-canvas-webgl-and-three-js
  on_image_load() {

    var dx = image.width,
        dy = image.height;

    this.hidden_canvas
      .attr("width", dx)
      .attr("height", dy);

    this.hidden_context.drawImage(image, 0, 0, dx, dy);

    // draw the sphere on a hidden context, and use that as a mask
    this.hidden_canvas2
      .attr("width", this.width)
      .attr("height", this.height);

    var path = d3.geoPath(this.projection);
    var sphere = {type:"Sphere"};
    this.hidden_context2.clearRect(0, 0, this.width, this.height);
    this.hidden_context2.beginPath();
    d3.geoPath().projection(this.projection).context(this.hidden_context2)(sphere);
    this.hidden_context2.fillStyle='red';
    this.hidden_context2.fill();
    var i = this.hidden_context2.getImageData(0, 0, this.width, this.height);
    var srcMask = i.data;

    var sourceData = this.hidden_context.getImageData(0, 0, dx, dy).data,
        target = this.map_context.createImageData(this.width, this.height),
        targetData = target.data;

    //this get it done in terms of laying the right tiles on the right projection!
    for (var y = 0, i = -1; y < this.height; ++y) {
      for (var x = 0; x < this.width; ++x) {
        // is point within the sphere? if not, just fill it in with a background colour
        if (srcMask[i+1] != 255) {
          targetData[++i] = 25;
          targetData[++i] = 25;
          targetData[++i] = 25;
          targetData[++i] = 255;
          continue;
        }

        var p = this.projection.invert([x, y]), λ = p[0], φ = p[1];
        if (λ > 180 || λ < -180 || φ > 90 || φ < -90) { i += 4; continue; }
        var q = ((90 - φ) / 180 * dy | 0) * dx + ((180 + λ) / 360 * dx | 0) << 2;
        targetData[++i] = sourceData[q];
        targetData[++i] = sourceData[++q];
        targetData[++i] = sourceData[++q];
        targetData[++i] = 255;
      }
    }

    this.map_context.clearRect(0, 0, this.width, this.height);
    this.map_context.putImageData(target, 0, 0);
  }

  draw_terminals_and_pops(terminals, pops) {
    var self = this;

    var drawfn = function(data, container, icon, icon2, val, titlefn) {
      var p = d3.select(container)
                .selectAll("text."+icon)
                .data(data);

      p.enter()
       .append("text")
       .attr("class", icon2+" "+icon);

      d3.select(container).selectAll("text."+icon)
        .attr("title", titlefn)
        .classed("selected-terminal", d => (d==control._from_trm || d==control._to_trm) ? true : false)
        .classed("selected-pop", d => d==(control._from_trm && control._from_trm.pop) ? true : false)
        .attrs(function (d) {
          var pos = self.projection([d.posGd.longitude * DEGREES, d.posGd.latitude * DEGREES]);
          return {
            x: pos[0],
            y: pos[1],
          }
        })
        .html(d => val + '<title>' + titlefn(d) + '</title>');
    };

    drawfn(terminals, "svg.gw", "satellite-dish", "fas", '\uf7c0', d => d.name);
    drawfn([...pops.values()], "svg.gw", "pop", "far", '\uf111', d => 'POP: ' + d.name);

    // slow: drawfn(satellites, "svg.gw", "fa-satellite", "fas");
  }

  draw_terminal(trm, selected_sats) {
    var self = this;
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

        var el = lookangles.elevation * DEGREES;
        var min_el = trm.minel;

        if ((el>=min_el && el<=(180-min_el))) {
          var c = self.sat_context;
          var route = {type: "LineString", "coordinates": [
            [pos.longitude * DEGREES, pos.latitude * DEGREES],
            [sat.posGd.longitude * DEGREES, sat.posGd.latitude * DEGREES]
          ]};
          if (el<(min_el+10) || el>(180-min_el-10)) {
            // warn when elevation angle is close to the allowed minimum
            c.strokeStyle = "rgba(199, 54, 97, 0.5)";
          } else {
            c.strokeStyle = "rgba(54, 199, 170, 0.5)";
          }
          if (selected_sats.includes(sat) && (trm==control._from_trm || trm==control._to_trm)) {
            c.lineWidth = 6;
          } else {
            c.lineWidth = 2;
          }
          c.beginPath();
          self.sat_path(route);
          c.stroke();
        }
      });
    }
  }

  draw_pop(name, pop) {
    var self = this;
    var pos = pop.posGd;
    var r = 3;

    var ln = pos.longitude * DEGREES, lt = pos.latitude * DEGREES, sz=.2*r;
    var sat_context = this.sat_context;
    var sat_path = this.sat_path;
  
    // POP to GW connections
    if (1) {
      pop.gw.forEach(function(gw) {
        //if (gw!=control._from_trm) return;

        var route = {type: "LineString", "coordinates": [
          [pos.longitude * DEGREES, pos.latitude * DEGREES],
          [gw.posGd.longitude * DEGREES, gw.posGd.latitude * DEGREES]
        ]};
        //console.log(pop.name, gw.name);
        sat_context.beginPath();
        sat_context.lineWidth = 4;
        sat_context.strokeStyle = "rgba(128,128,0,0.5)";
        sat_path(route);
        sat_context.stroke();
      });
    }
  }

  draw_sat(sat, selected_sats) {
    var pos = sat.posGd;

    try {
      pos.longitude
    }
    catch (e) {
      return
    }

    if (control.zen && !selected_sats.includes(sat)) return;

    var scale = 1.0;
    try {
      scale = 175.0 / this.projection.scale();
    } catch (e) {
    }

    var name = sat.name;
    var ln = pos.longitude * DEGREES, lt = pos.latitude * DEGREES, sz=Math.max(0.7*scale, 0.02);
    var detail = false;
    var sat_context = this.sat_context,
        sat_path = this.sat_path;
  
    sat_context.fillStyle = pos.height > control.altitude_threshold ? "#bda0bc" : "#03cea4";
    sat_context.strokeStyle = pos.height > control.altitude_threshold ? "#bda0bc" : "#03cea4";
    if (selected_sats.indexOf(sat)!=-1) {
      sat_context.fillStyle = "#824670";
      sat_context.strokeStyle = "#824670";
      detail = true;
      sz = Math.max(0.7*scale*3, 0.02*3);
    }

    var route = get_satellite_shape(ln, lt, sz, pos.height);
    sat_context.lineWidth = 0.25;
    sat_context.beginPath();
    sat_path(route);
    sat_context.fill();

    if (control['satellite names'] || detail) {
      // FIXME does not respect geo projection if hidden
      var xy = projection([ln, lt]);
      sat_context.font = "9px sans-serif";
      sat_context.textAlign = "center";
      sat_context.fillText(name, xy[0], xy[1]+30);
    }

    if (control.FOV) {
      // super slow
      var night = getFootprint(pos);
      shade_context.beginPath();
      shade_path(night);
      shade_context.fillStyle = "rgba(255,0,255,0.01)";
      shade_context.fill();
      shade_context.strokeStyle = "rgba(60,60,60,0.1)"
      shade_context.stroke();
    }

    if (control['sat-to-sat']) {
      for (i=0; i<4; i++) {
        try {
          var s = sat.conn[i][0];
        } catch(e) {
          //console.log('error', sat.name, i);
          continue;
        }
        try {
          var route = {type: "LineString", "coordinates": [
            [s.posGd.longitude * DEGREES, s.posGd.latitude * DEGREES, s.posGd.height],
            [pos.longitude * DEGREES, pos.latitude * DEGREES, pos.height]
          ]};
          sat_context.beginPath();
          if (pos.height > control.altitude_threshold) {
            sat_context.strokeStyle = "rgba(0,0,255,0.4)";
          } else {
            sat_context.strokeStyle = "rgba(0,255,0,0.4)";
          }
          sat_context.lineWidth = 0.25;
          sat_path(route);
          sat_context.stroke();
        } catch(e) {
          console.log('error', sat.name, s.name, s);
        }
      }
    }
  };

  // adapted from:
  //  https://observablehq.com/@mbostock/solar-terminator
  //  https://bl.ocks.org/vasturiano/9bdeddb97d5c71f425743442761d5384
  plotshade(time, context, path) {
    context.clearRect(0, 0, this.width, this.height);
    if (control.shade) {
      var sun = solarPosition(time);
      var night = d3.geoCircle()
        .radius(90)
        .center(antipode(sun))
      ();

      context.beginPath();
      path(night);
      context.fillStyle = "rgba(50,50,50,0.6)";
      context.fill();
    }
  }


  // https://bl.ocks.org/tuckergordon/raw/ce135a88cd14991761ccdc937179c6c0/

  /**
  * @returns {GeoJSON.Polygon} GeoJSON describing the satellite's current footprint on the Earth
  */
  getFootprint(pos) {
    var theta = /*this._halfAngle*/ 57 * RADIANS;

    coreAngle = _coreAngle(theta, pos.height, R_EARTH) * DEGREES;

    return d3.geoCircle()
      .center([pos.longitude * DEGREES, pos.latitude * DEGREES])
      .radius(coreAngle)();
  };

  /**
  * A conical satellite with half angle casts a circle on the Earth. Find the angle
  * from the center of the earth to the radius of this circle
  * @param {number} theta: Satellite half angle in radians
  * @param {number} altitude Satellite altitude
  * @param {number} r Earth radius
  * @returns {number} core angle in radians
  */
  _coreAngle(theta, altitude, r) {
    // if FOV is larger than Earth, assume it goes to the tangential point
    if (Math.sin(theta) > r / (altitude + r)) {
      return Math.acos(r / (r + altitude));
    }
    return Math.abs(Math.asin((r + altitude) * Math.sin(theta) / r)) - theta;
  };
}

function get_terminal_shape(ln, lt, sz, height) {
  var circle = d3.geoCircle().center([ln, lt]).radius(sz);
  var route = circle();
  return route;
}

function get_satellite_shape(ln, lt, sz, height) {
  // much faster than the geoCircle above
  var route = {
    type: "LineString", 
    coordinates: [
      [ln-sz, lt-sz, height],
      [ln+sz, lt-sz, height],
      [ln+sz, lt+sz, height],
      [ln-sz, lt+sz, height],
      [ln-sz, lt-sz, height],
    ]};
  return route;
}
