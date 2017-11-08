"use latest";
const _ = require('lodash');
const moment = require('moment');
const async = require('async');

const BB_DISTANCE_IN_KM = 100;
const TIME_SEARCH_WINDOW = 8;

module.exports = function (ctx, done) {

    // Extracting params
    // TODO should validate
    let name = ctx.data.name || "MARIA";
    let year = ctx.data.year || 2017;

    console.log(`Fetching Sat Imagery for Hurricane ${name} ${year}`);

    // Fetch Hurricane Thumbnails Based on Tracks
    fetchTrackData(name,year)
        .then(res => res.text()) // Unwrap body
        .then(parseTrackData)    // Parse Hurricane Track Data
        .then(parsed =>{         // Extract GeoJSON Coordinates and Date
            let tracks = parsed.tracks;
            return _.map(tracks, track => {
                return {
                    dateTime: track.dateTime,
                    geoJson: geoJsonBoundingBox(track.LAT,track.LON,BB_DISTANCE_IN_KM)
                };
            })
        })
        .then(tracks => {        // Due to request limits, let's just pick a few equidistant track points
            return _.filter(tracks, (t,i) => {
                return i%10 === 0;
            });
        })
        .then(tracks => {        // Fetch Satellite Images
            // Wrap back in Promises/A+ style
            return new Promise( (resolve, reject) => {
                // Request tasks in series (this points to a dev server that's limiting the requests)
                let tasks = _.map(tracks, _buildFetcher); // build async styled tasks
                async.series(tasks, function (err, results) {
                    if(err) reject(err);
                    else resolve(results);
                });
            });
        })
        .then(satelliteData => { // Flatten results and extract Thumbnails if any
            let withResults = _.filter(satelliteData, d => d.meta.found > 0);
            let allResults = _.flatten(_.map(withResults, 'results'));
            return _.chain(allResults)
                .filter(r => {
                    return r.aws_thumbnail || r.thumbnail;
                })
                .map(r => {
                    return r.aws_thumbnail || r.thumbnail;
                })
                .value();
        })
        .then(res => {
            return done(null,res);
        }, err => {
            return done(err);
        });
};

/**
 * Fetch helper with async support
 */
function _buildFetcher(track) {
    return function (callback) {
        // Find Satellite Data nearby the tracks
        let startDate = moment(track.dateTime).subtract(TIME_SEARCH_WINDOW,'hours').toDate().toISOString();
        let endDate = moment(track.dateTime).add(TIME_SEARCH_WINDOW,'hours').toDate().toISOString();
        let geoJson = track.geoJson;

        return fetchByDateAndGeoJson(startDate,endDate,geoJson)
            .then(res => res.json()) // Unwrap body
            .then(json => callback(null,json), err => callback(err)); // Asyncify
    };
}

/**
 * Helper Libs
 */

/**********************
 * HURRICANE TRACK
 */
const eol = require('eol');
const fetch = require('node-fetch');

let fetchTrackData = (name,year) => {
    let dataUrl = `http://weather.unisys.com/hurricane/atlantic/${year}/${name}/track.dat`;
    return fetch(dataUrl);
};

/**
 * Parse hurricane track.dat file
 */
let parseTrackData = (raw) => {
    let rawCsv = eol.split(raw);
    let csv = rawCsv.slice(3);
    let columns = _.split(rawCsv[2],/ +/);
    let dates = parseTrackDatDate(rawCsv[0]);
    let tracks = parseTracks(columns,csv);
    let tracksWithDates = injectDatetimeIntoTracks(tracks,dates.year);
    let name = rawCsv[1];

    return {
        name:name,
        startDate: dates.startDate,
        endDate: dates.endDate,
        tracks: tracksWithDates
    };
};

function parseTracks(cols, rows) {
    let parsedRows = _.map(rows, r => {
        // Validate not empty
        if(_.isEmpty(r)) return null;
        // Cleanup "Hack" to make it easier to map category
        let cleanRow = _.chain(r)
            .replace(/TROPICAL /,"TROPICAL_")
            .trim()
            .value();
        // Map Header with value
        let vals = _.split(cleanRow,/ +/);
        let parsed = {};
        _.each(cols, (col,i) => {
            parsed[col] = vals[i];
        });
        return parsed;
    });

    return _.filter(parsedRows, r => !_.isNull(r));
}

function parseTrackDatDate(rawDate){
    let removedLabel = _.replace(rawDate,/Date: /,'');
    let removedYear = _.replace(removedLabel,/ (\d{4})$/,'');
    let yearMatches = / (\d{4})$/.exec(removedLabel);
    let year = yearMatches[1];
    let dates = _.split(removedYear,/-/);
    let startDate = moment(`${dates[0]} ${year}`, "DD MMM YYYY").toDate();
    let endDate = moment(`${dates[1]} ${year}`, "DD MMM YYYY").toDate();
    return { year,startDate,endDate };
}

function injectDatetimeIntoTracks(tracks, year) {
    return _.map(tracks, t =>{
        let dateTime = moment(`${year}/${t.TIME}`,"YYYY/MM/DD/HHZ").toDate();
        return Object.assign({},
            t,
            {dateTime});
    });
}

/**********************
 * GEO JSON
 */
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


/**********************
 * SATELLITE API
 */
const BASE_URL = 'https://api.developmentseed.org/satellites';
const LIMIT = 100;

let fetchByDateAndGeoJson = (startDate,endDate,geoJson) => {
    return fetch(`${BASE_URL}?limit=${LIMIT}&date_from=${startDate}&date_to=${endDate}&intersects=${JSON.stringify(geoJson)}`);
};
