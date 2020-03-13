class VizBase {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }


  // https://bl.ocks.org/tuckergordon/raw/ce135a88cd14991761ccdc937179c6c0/

  /**
  * @returns {GeoJSON.Polygon} GeoJSON describing the satellite's current footprint on the Earth
  */
  getFootprint(pos) {
    var theta = /*this._halfAngle*/ 57 * RADIANS;

    var coreAngle = this._coreAngle(theta, pos.height, R_EARTH) * DEGREES;

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
