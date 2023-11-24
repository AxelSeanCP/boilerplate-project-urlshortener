require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns'); // to check url validation
const validUrl = require('valid-url');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

// connect to the database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// check the connection to the database
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.on('open', () => {
  console.log("Connected to the database");
});

// define URL model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

let URLModel = mongoose.model('urlModel', urlSchema);

app.use(express.json());
app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl',bodyParser.urlencoded({ extended: false }),
(req, res, next) => {
  // check for a valid URL
  try{

    if(!validUrl.isWebUri(req.body.url)){
      res.json({error: "invalid url"});
    }else{
      const domain = new URL(req.body.url).hostname;
      dns.lookup(domain, (err,address) => {
        if(err){
          res.json({error: "invalid url"});
        }else{
          next();
        }
      });
    }

  } catch (error){
    res.json({error: 'invalid url'});
  }
  
}, 
(req,res, next) => {

  // check if url already exist in database -> return the shorturl
  URLModel.findOne({original_url: req.body.url}, (err,data) => {
    if(err){
      console.error(err);
      return res.json({error: 'internal server error'})
    }

    if(data){
      const dataBaru = {
        original_url: data.original_url,
        short_url: data.short_url
      }
      return res.json(dataBaru);
    }else{
      next();
    }
  });

}, 
(req,res) => {

  // Generate a random number for the shorturl
  const shorturl = Math.floor(Math.random() * 1000);
  const data = {original_url: req.body.url, short_url: shorturl};

  // create new url document and add it to database
  const link = new URLModel({
    original_url: req.body.url,
    short_url: shorturl
  });

  link.save().then(() => {
    res.json(data);
    console.log(`data is saved successfully`);
  }).catch((err) => {
    res.json({error: 'invalid url'});
    console.log(`data is unsaved, error: ${err.message}`);
  })

});

app.get('/api/shorturl/:shorturl', (req,res) => {
  // check if shorturl already exist in database
  URLModel.findOne({short_url: req.params.shorturl}, (err,data) => {
    if(err){
      console.error(err);
      return res.json({error: 'internal server error'})
    }

    // redirect to the original url
    if(data){
      res.redirect(data.original_url);
    }else{
      res.json({error: "invalid url"});
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
