const fetch = require('node-fetch');

const BASE_URL = 'https://api.developmentseed.org/satellites';
const LIMIT = 100;

let fetchByDateAndGeoJson = (startDate,endDate,geoJson) => {
    return fetch(`${BASE_URL}?limit=${LIMIT}&date_from=${startDate}&date_to=${endDate}&intersects=${JSON.stringify(geoJson)}`);
};

module.exports = { fetchByDateAndGeoJson };