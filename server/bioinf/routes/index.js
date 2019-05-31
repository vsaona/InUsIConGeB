var express = require('express');
var router = express.Router();
var fs = require('fs');
var formidable = require('formidable');

/* GET home page. */
router.get('/prueba', function(req, res, next) {
  fs.readFile('./data/operon_bphA.gbff','utf8',function(err, contents){
    //console.log(contents)
    array = contents.split(/gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    array = array.slice(1);
    genomas = []
    for(var i = 0; i < array.length;i++){
      json = {};
      fields = array[i].match(/.+/g);
      console.log(fields);
      if (fields != null){
        large = array[i].match(/\d+/g);
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
          json["name"] = name[0].match(/[^(\/gene=")].+[^"]/g)[0];
        } else {
          json["name"] = "no";
        }
        genomas.push(json);
      }
    }
    console.log(genomas);
    res.json({genomas});
  });
});

router.post('/fileupload', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    if(err) throw err;
    var oldpath = files.filetoupload.path;
    var newpath = './data/' + files.filetoupload.name;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      res.writeHead(200,{'Content-Type':'text/html'})
      fs.readFile('./public/render.html', null, function(error,data){
        if(error){
          res.writeHead(404);
          res.write('File not found!');
        } else {
          res.write(data);
        }
        res.end();
      });
    });
  });
});

module.exports = router;
