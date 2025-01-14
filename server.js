require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require( 'dns' );
const mongoose = require( 'mongoose' );
const { Schema } = mongoose;

// define a schema
const urlSchema = new Schema( { original_url: String, short_url: Number } );

// create a model from the schema
const urlModel = mongoose.model( 'URLs', urlSchema );

// connect to the database
mongoose.connect( process.env.MONGO_URI, { useNewUrlParser: true } );

// Basic Configuration
const port = process.env.PORT || 3000;

// for parsing POST data
const bodyParser = require('body-parser');

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
	res.sendFile(process.cwd() + '/views/index.html');
});


// middleware to parse post body for the given route
app.use( '/api/shorturl', bodyParser.urlencoded( { extended: false } ) );

// parses a request to shorten a given URL and returns the result
app.post( '/api/shorturl', function( request, response ) {

	// validate posted url

	const urlRegex = '^(?:(?:http|https)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
	let url = new RegExp(urlRegex, 'i');

	if ( request.body.url.length < 2083 && url.test(request.body.url) ) {

		// get all of the database entries
		urlModel.find( {}, ( err, results ) => {

			// if database is empty create the first record with the initial code
			if ( results.length == 0 ) {

				// create document instance from the model
				const urlDocument = new urlModel( { original_url: request.body.url, short_url: 1 } );

				// save the document to the database
				urlDocument.save( ( err, data ) => {

					response.json( { original_url: request.body.url, short_url: data.short_url } );
				});
			}
			else {

				// determine the next available code
				urlModel.find({}).sort( { short_url: -1 } ).limit( 1 ).select( { short_url: 1 } ).exec( (err, found) => {

					// create document instance from the model
					const urlDocument = new urlModel( { original_url: request.body.url, short_url: 1 + found[0].short_url } );

					// save the document to the database
					urlDocument.save( ( err, data ) => {

						response.json( { original_url: request.body.url, short_url: data.short_url } );
					});
				});
			}
		});
	}
	else {

		response.json( { error: 'invalid url' } );
	}
});

// looks up a shortened url and redirects to it
app.get( '/api/shorturl/:code', ( request, response ) => {

	// look up the url by index in the database
	urlModel.find( { short_url: request.params.code }, ( err, data ) => {

		// redirect to the found url
		response.redirect( data[0].original_url );
	});
});


app.listen(port, function() {
	console.log(`Listening on port ${port}`);
});
