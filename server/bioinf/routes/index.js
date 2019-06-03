var express = require('express');
var router = express.Router();
var fs = require('fs');
var formidable = require('formidable');

/* GET home page. */
router.post('/prueba', function(req, res, next) {
  console.log(req.body["filePath[]"]);                      // No tengo idea de por que se tiene que poner los corchetes vacios. Atte, Vicente
  if(!(Array.isArray(req.body["filePath[]"]))) {
    filePath = [req.body["filePath[]"]];
  } else {
    filePath = req.body["filePath[]"];
  }
  console.log(filePath);
  genomas = [];
  for(j = 0; j < filePath.length; j++) {
    fileName = filePath[j].split("/")[filePath[j].split("/").length - 1]
    contents = fs.readFileSync(filePath[j],'utf8');
    array = contents.split(/gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    array = array.slice(1);
    genes = []
    for(var i = 0; i < array.length;i++){
      json = {};
      fields = array[i].match(/.+/g);
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
        if(name != null) {
          json["name"] = name[0].match(/[^(")]\w+?(?=")/g)[0];
        } else {
          json["name"] = "no";
        }
        genes.push(json);
      }
    }
    genomas.push({genes:genes, name: fileName});
  }
  res.json({genomas: genomas});
});

router.post('/fileupload', function(req, res, next) {
  console.log("DEBUG: POST FUNCTION /fileUpload");
  var form = new formidable.IncomingForm();
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    if(err) throw err;
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write("<script> ");
    res.write("var filePath = [");
    for(j = 0; files["file" + j]; j++) {
      var oldpath = files["file" + j].path;
      var newpath = './data/' + files["file" + j].name;
      fs.renameSync(oldpath, newpath);
      res.write((j?", '":"'")+ newpath + "'");    // Esto escribe la coma al principio si j != 0
    }
    fs.readFile('./public/render.html', null, function(error,data){
      if(error){
        res.writeHead(404);
        res.write('File not found!');
      } else {
        res.write(" ]; </script>");
        res.write(data);
        res.end();
      }
    });
  });
});
module.exports = router;