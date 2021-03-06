// lambda function written in nodeJS to aggregate sensor data for the current date

console.log('loading required functions');

var aws = require('aws-sdk');

// this is the bucket where the sensor data is stored.
var dataBucket = 'robot-gardener';

console.log('starting to execute function');

exports.handler = function(event, context) {
    // start executing function
    console.log('processing request');
    
    // build the file name where the data is stored based on the current date
    
    var date = new Date();

    var year = date.getFullYear();
    
    var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;
        
    var day = date.getDate();

    // adjust for current timezone as EST is five hours behind UTC
    if (date.getHours() < 5) {day = day - 1}

        day = (day < 10 ? "0" : "") + day;
        
    var dataFile = year + month + day + '.json';
    
    // pull the history array for a given day
    
    var s3 = new aws.S3();
    
    var getParams = {Bucket : dataBucket, 
                     Key : dataFile}; 

    console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

    s3.getObject(getParams, function(err, data) {
      if(err)
        console.log('Error getting history data : ' + err);
      else
        console.log('Successfully retrieved history data : ' + err);

        // data retrieval was successfull
        var histDataArray = eval('(' + data.Body + ')');
        console.log('number of readings: ' + histDataArray.length);

        // build a summary array by sampling based on freq parameter
        summaryArray = [];
        freq = 20;
        
        // these are temporary variables that are used in calculating average for the period
        j = 1;
        sumTemp  = 0;
        sumHumid = 0;
        
        for (i = 0; i < histDataArray.length; i++) { 
            if (j == freq) {
                // if matches, calculate the average from the running total for the period, 
                // then push the object into the sample array.
                var aveReading = {};
                    aveReading.readTime = histDataArray[i].readTime;
                    aveReading.temp     = (sumTemp + Number(histDataArray[i].temp))/freq;
                    aveReading.humidity = (sumHumid + Number(histDataArray[i].humidity))/freq;
                    
                summaryArray.push(aveReading);

                // then reset temp variables
                j = 1;
                sumTemp  = 0;
                sumHumid = 0;
            } else { 
                // increment interval counter and add current sensor readings for average
                j++;
                sumTemp  += Number(histDataArray[i].temp)
                sumHumid += Number(histDataArray[i].humidity)
            }
        }
      // then return the summary array back to the caller
      context.succeed(summaryArray);
    });
};
