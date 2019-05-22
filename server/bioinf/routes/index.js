var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
  //leer archivo
  fs.readFile('./data/operon_bphA.gbff','utf8',function(err, contents){
    array = contents.match(/gene\s+[\w\d.\(\)]+\n/g);
    genomas = []
    for(var i = 0; i < array.length;i++){
      console.log(array[i])
      json = {};
      json["start"] = array[i].match(/\d+/g)[0];
      json["end"] = array[i].match(/\d+/g)[1];
      genomas.push(json);
    }
    console.log(genomas)
  });
});

module.exports = router;
