const request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
const mongoose = require('mongoose');
const schedule = require('node-schedule');
var Schema = mongoose.Schema;

const mongo_url = 'mongodb://localhost:27017/airport_data';

const mongo_options = {
    useNewUrlParser: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 500,
    connectTimeoutMS: 10000,
};

mongoose.connect(mongo_url, mongo_options, function (err, res) {
    if (err) {
        writeError(error);
    } else {
        console.log('Succees. connected to: ' + mongo_url);
    }
})


var flightSchema = new Schema({
    flightNumber: String,
    date: String,
    airport: String,
    scheduledTimeOfArrival: String,
    scheduledTimeOfDeparture: String,
    expectedTime: String,
    status: String
});
var errorSchema = new Schema({
    date: Date,
    errorMessage: String,
});
var errorModel = mongoose.model('error', errorSchema);

var options = {
    method: 'GET',
    headers: { 'user-agent': 'node.js' }
};

writeError = function (error) {
    var errorToWrite = new errorModel({
        date: new Date(),
        errorMessage: error.toString()
    });
    errorToWrite.save((err) => {
        if (err) {
            console.log(err);
            console.info('Will try again....')
            setTimeout(extractAllFlights(), 3000);
        };
    });
}

writeFlight = function (data) {

    var responseToWrite = new flightModel({
        flightNumber: data.flightNumber,
        date: data.date,
        airport: data.airport,
        scheduledTimeOfArrival: data.scheduledTimeOfArrival,
        scheduledTimeOfDeparture: data.scheduledTimeOfDeparture,
        expectedTime: data.expectedTime,
        status: data.status
    });


    flightModel.find({ 
        flightNumber: data.flightNumber,
        date: data.date,
        airport: data.airport
    }, (err, res) => {
        if (err) throw error;
        else{
            res.forEach(value => {
                if(value.status == responseToWrite.status && value.expectedTime == responseToWrite.expectedTime){
                    return;
                } 
            })
        }
    });
    responseToWrite.save((err) => {
        if (err) throw err;
    });
}

var URLS_array = [
    'https://www.palanga-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=arrival&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    'https://www.palanga-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=departure&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    'https://www.vilnius-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=arrival&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    'https://www.vilnius-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=departure&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    'https://www.kaunas-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=arrival&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
    'https://www.kaunas-airport.lt/lt/pries-skrydi/skrydziu-informacija/skrydziu-tvarkarastis?ajax=1&limit=5&r=1234567890&direction=departure&destination=&date-from=' + moment().format('YYYY-MM-DD') + '&date-to=',
]

function getAirport(url) {
    switch(url){
        case URLS_array[0]:{
            return 'PLQ';
        }
        case URLS_array[1]:{
            return 'PLQ';
        }
        case URLS_array[2]:{
            return 'VNO';
        }
        case URLS_array[3]:{
            return 'VNO';
        }
        case URLS_array[4]:{
            return 'KUN';
        }
        case URLS_array[5]:{
            return 'KUN';
        }
    }
}

function getFlightsForAirport(airportUrl) {
    request(airportUrl, options, function (error, response, html) {
        var currentTime = moment().format('HH:mm');
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(html);

            $('.dumb-pager-items').find('tr').each((tr_i, tr_el) => {
                $(tr_el).find("td[data-label='Skrydžio numeris']").each((td_i, td_el) => {
                    var flight = {
                        flightNumber: '',
                        date: moment().format('YYYY-MM-DD'),
                        airport: getAirport(airportUrl),
                        scheduledTimeOfArrival: '',
                        scheduledTimeOfDeparture: '',
                        expectedTime: '',
                        status: ''
                    };
                    flight.flightNumber = $(td_el).find('a').eq(0).text().trim() || 'NA';
                    $(td_el).find('.modal-body').each((i, e) => {
                        $(e).find('div').each((index, el) => {

                            var title = $(el).children('span').eq(0).text().trim()
                            switch (title) {
                                case 'Atvykimo laikas:': {
                                    flight.scheduledTimeOfArrival = $(el).children('span').eq(1).text().trim();
                                    break;
                                }
                                case 'Išvykimo laikas:': {
                                    flight.scheduledTimeOfDeparture = $(el).children('span').eq(1).text().trim();
                                    break;
                                }
                                case 'Patikslintas laikas:': {
                                    flight.expectedTime = $(el).children('span').eq(1).text().trim();
                                    break;
                                }
                                case 'Būsena:': {
                                    flight.status = $(el).children('span').eq(1).text().trim();
                                    break;
                                }
                            }
                        })
                    })
                    var rightConsequences = (flight.expectedTime !== ''
                        && (compareTime(flight.scheduledTimeOfArrival, currentTime) === 1)
                        || compareTime(flight.scheduledTimeOfDeparture, currentTime) === 1)
                        || (flight.status === 'Vėluojama');
                    if (rightConsequences) {
                        try {
                            writeFlight(flight);
                        } catch (err) {
                            setTimeout(writeError(err), 3000);
                        }
                    }
                });
            })
        } else {
            console.log(error, response);
            writeError(error);
        }
        console.log('Data extracted on ' + moment());
    });
}
function compareTime(timeA, timeB) {
    var momentA = moment(timeA, "HH:mm");
    var momentB = moment(timeB, "HH:mm");

    if (momentA > momentB) return 1;
    else if (momentA < momentB) return -1;
    else return 0;
}


function extractAllFlights() {
    URLS_array.forEach(url => {
        getFlightsForAirport(url);
    });
}
//'*/10 5-23 * * *' -- Kas 10 minučių nuo 5 ryto iki 12 vakaro. 
schedule.scheduleJob('*/10 5-23 * * *', function () {
    extractAllFlights();
});
