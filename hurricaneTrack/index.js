const _ = require('lodash');
const eol = require('eol');
const moment = require('moment');
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

module.exports = { fetchTrackData,parseTrackData };

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