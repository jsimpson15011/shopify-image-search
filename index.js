require('dotenv').config()

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
        urlExists(results[i]["Image Src"], (err, exists) => {

          if(!exists){
            const opts = {
              searchTerm: title,
              queryStringAddition: '&tbs=isz:lt,islt:vga,iar:s'
            }

            gis(opts, throttle(addResultToTable,500))

            function addResultToTable(error, results) {
              if (error) {
                console.log(error)
              } else {
                const image = results[0]
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

    for (let i = 0; i < results.length; i++) {

    }
  }
)
