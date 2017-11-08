// Based on [https://www.movable-type.co.uk/scripts/latlong.html]
// let lat = 18.364594;    // Central Latitude
// let lon = -66.039735;   // Central Longitude
// let d = 30;             // Distance in kilometers - 30 kms avg eye

/**
 * Builds GeoJSON Bounding Box
 * based on single central lat/lon and distance
 * @param lat
 * @param lon
 * @param d
 */
let geoJsonBoundingBox = (lat,lon, d) => {
    let bb = boundingBox(lat,lon,d);

    let bbArray = [
        [bb.northWestPoint.longitude,bb.northWestPoint.latitude],
        [bb.northEastPoint.longitude,bb.northEastPoint.latitude],
        [bb.southEastPoint.longitude,bb.southEastPoint.latitude],
        [bb.southWestPoint.longitude,bb.southWestPoint.latitude],
        [bb.northWestPoint.longitude,bb.northWestPoint.latitude]
    ];

    return {
        type: "Polygon",
        coordinates: [bbArray]
    };
};

/**
 * Builds GeoJSON Bounding Box
 * based on multiple geo points and distance
 * @param points
 */
let geoJsonBoundingBoxes = (points) => {
    let boundingArrayList = _.map(points, p =>{
        let bb = boundingBox(lat,lon,d);

        return [
            [bb.northWestPoint.longitude,bb.northWestPoint.latitude],
            [bb.northEastPoint.longitude,bb.northEastPoint.latitude],
            [bb.southEastPoint.longitude,bb.southEastPoint.latitude],
            [bb.southWestPoint.longitude,bb.southWestPoint.latitude],
            [bb.northWestPoint.longitude,bb.northWestPoint.latitude]
        ];
    });

    return {
        type: "Polygon",
        coordinates: [boundingArrayList]
    };
};

module.exports = { geoJsonBoundingBox,geoJsonBoundingBoxes};

// Build Square Bounding box
function boundingBox(lat,lon,d){
    // P1 NW - 315 bearing angle
    let northWestPoint = destinationPoint(lat,lon,d,315);

    // P2 NE - 45 bearing angle
    let northEastPoint = destinationPoint(lat,lon,d,45);

    // P3 SE - 135 bearing angle
    let southEastPoint = destinationPoint(lat,lon,d,135);

    // P4 SW - 225 bearing angle
    let southWestPoint = destinationPoint(lat,lon,d,225);

    return {
        northWestPoint: northWestPoint,
        northEastPoint: northEastPoint,
        southEastPoint: southEastPoint,
        southWestPoint: southWestPoint
    };
}

// Calculate Destination Point
function destinationPoint(latD,lonD,d,brngD){
    let R = 6371;         // Earth Radius
    let lat = rad(latD);
    let lon = rad(lonD);
    let brng = rad(brngD);
    let dLat = Math.asin( Math.sin(lat)*Math.cos(d/R) +
        Math.cos(lat)*Math.sin(d/R)*Math.cos(brng) );
    let dLon = lon + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat),
        Math.cos(d/R)-Math.sin(lat)*Math.sin(dLat));
    return {
        latitude: deg(dLat),
        longitude: deg(dLon)
    };
}

function rad(d) {
    return d * Math.PI / 180;
}

function deg(r) {
    return r * 180 / Math.PI;
}