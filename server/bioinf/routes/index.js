var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/prueba', function(req, res, next) {
  fs.readFile('./data/operon_bphA.gbff','utf8',function(err, contents){
    //console.log(contents)
    array = contents.split(/gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    genomas = []
    for(var i = 0; i < array.length;i++){
      json = {};
      fields = array[i].match(/.+\n/g);
      if (fields != null){
        large = fields[0].match(/\d+/g);
        json["start"] = large[0];
        json["end"] = large[1];
        complement = fields[0].match(/complement/);
        if(complement == null){
          json["complement"] = false;
        } else {
          json["complement"] = true;
        }
        name = fields[1].match(/\/gene=.+/g);
        console.log(name);
        if(name != null) {
          json["name"] = name[0].match(/[^(\/gene=")].+[^"]/g);
        } else {
          json["name"] = "no";
        }
        genomas.push(json);
      }
    }
    console.log(genomas)
    res.json({genomas})
  });
});

module.exports = router;
