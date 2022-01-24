'use strict'
require('dotenv').config()

let https = require('https');

let subscriptionKey = process.env.AZURE_SUB_KEY;

let host = 'api.bing.microsoft.com';
let path = '/v7.0/images/search';
let term = 'Oregon\'s Wild Harvest - Turmeric, Organic Extract 1 fl oz';

let response_handler = function (response) {
  let body = '';

  response.on('data', function (d){
    body += d;
  });

  response.on('end', function(){
    let imageResults = JSON.parse(body);

    if (imageResults.value.length > 0) {
      let firstImageResult = imageResults.value[0];
      console.log(`Image result count: ${imageResults.value.length}`);
      console.log(firstImageResult);
      console.log(`First image insightsToken: ${firstImageResult.imageInsightsToken}`);
      console.log(`First image thumbnail url: ${firstImageResult.thumbnailUrl}`);
      console.log(`First image web search url: ${firstImageResult.webSearchUrl}`);
      const image_url = firstImageResult.contentUrl;
      console.log(image_url)
    }
    else {
      console.log("Couldn't find image results!");
    }
  });

  response.on('error', function (e) {
    console.log('Error: ' + e.message);
  });
}

let bing_image_search = function (search){
  console.log('Searching images for: ' + term);
  let request_params = {
    method : 'GET',
    hostname : host,
    path : path + '?q=' + encodeURIComponent(search) + '&aspect=' + encodeURIComponent("square"),
    headers : {
      'Ocp-Apim-Subscription-Key' : subscriptionKey,
    }
  };

  let req = https.request(request_params, response_handler);
  req.end();
}

if (subscriptionKey.length === 32) {
  bing_image_search(term);
} else {
  console.log('Invalid Bing Search API subscription key!');
  console.log('Please paste yours into the source code.');
}



var fs = require('fs'),
  request = require('request')
var urlExists = require('url-exists')


/*var download = function (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};*/

let mysql = require('mysql2')

var gis = require('g-i-s')
let connection = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
})

const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  }
}


connection.query(
  'SELECT * FROM `all-shopify-products` WHERE `Custom Product Type` = "Vitamins & Supplements"',
  function (err, results, fields) {

    let i = 0;
    let interval = setInterval(function () {
      if (i <= results.length) {
        const title = results[i]['Title']
        const option = results[i]['Option1 Value'] === 'Default Title' ? '' : results[i]['Option1 Value']
        urlExists(results[i]["Image Src"], (err, exists) => {

          if(!exists){
            const opts = {
              searchTerm: title + " " + option,
              queryStringAddition: '&tbs=isz:lt,islt:vga,iar:s'
            }

            console.log(opts)

            gis(opts, throttle(addResultToTable,500))

            function addResultToTable(error, results) {
              if (error) {
                console.log(error)
              } else {
                const image = results[0]?.url
                connection.query(
                  'UPDATE `all-shopify-products` SET `Image Src` = ? WHERE `Title` = ?',
                  [image, title],
                  function (err, results, fields) {

                  });
              }
            }
          }
        })
        i++;
      }
      else {
        clearInterval(interval);
        console.log("Finished");
      }
    },1000)
  }
)
