var express = require('express');
var router = express.Router();
var fs = require('fs');
var formidable = require('formidable');
var multipart  =  require('connect-multiparty');
var multipartMiddleware  =  multipart({ uploadDir:  './data' });
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));


router.all("/*", function(req, res, next){
  console.log("pasa por el 'all'");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  next();
});

router.post('/angularFile', multipartMiddleware, (req, res) => {
  res.json({
      'message': 'File uploaded successfully'
  });
});

router.post('/prueba', function(req, res, next) {
  console.log(req.body);
  if(!(Array.isArray(req.body["filePath"]))) {
    filePath = [req.body["filePath"]];
  } else {
    filePath = req.body["filePath"];
  }
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

// Esta es la funcion original, responde correctamente a las vistas de Node.
router.post('/fileUploadAndRender', function(req, res, next) {
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

// Esta es la funcion en construccion para ser llamada desde angular. No se si funciona como deberia (no tengo como probarla).
router.post('/fileupload', function(req, res, next) {
  console.log("DEBUG: POST FUNCTION /fileUpload");
  var returnable = {fileNames: []};
  var form = new formidable.IncomingForm();
  form.uploadDir = "./data"

  form.on('file', (field, file) => {
    console.log("DEBUG: form.on(file)");
    console.log(field);
  });
  form.on('end', () => {
    console.log("DEBUG: form.on(end)");
  });
  form.parse(req, function (err, fields, files){
    console.log("DEBUG: form.parse");
    if(err) throw err;
    res.header("Content-Type", "application/json");
    //res.writeHead(200,{'Content-Type':'application/json'});
    for(j = 0; files["file" + j]; j++) {
      var oldpath = files["file" + j].path;
      var newpath = './data/' + files["file" + j].name;
      fs.renameSync(oldpath, newpath);
      returnable.fileNames.push(newpath);
    }
    console.log("Viene el returnable");
    console.log(JSON.stringify(returnable));
    res.write(JSON.stringify(returnable));
    res.end();
  });
  console.log("DEBUG: outside form.parse");
  res.end();
});
module.exports = router;