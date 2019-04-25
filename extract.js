const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');

var options = {
    method: 'GET',
    headers: { 'user-agent': 'node.js' }
};

var flight = {
    flightNumber: '',
    arrivingFrom: '',
    departingTo: '',
    scheduledTimeOfArrival: '',
    expectedTimeOfArrival: '',
};

var URLS = {
    PLQ_Incoming: 'https://www.kaunas-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=7&r=1556213035091&direction=arrival&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    PLQ_Outgoing: '',
    VNO_Incoming: '',
    VNO_Outgoing: '',
    KUN_Incoming: '',
    KUN_Outgoing: '',
    
}

class Extractor{
    getData(url){

    }
}

module.exports = Extractor;