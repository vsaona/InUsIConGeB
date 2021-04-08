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

/* Esta funcion retorna las rutas de los archivos subidos a través de angular. */
router.post('/angularFile', multipartMiddleware, (req, res) => {
  var filePaths = [];
  req.files.uploads.forEach(function(file){
    console.log(file.originalFilename + "   -   path:   " + file.path);
    filePaths.push(file.path);
  });
  res.json({
      'filePaths': filePaths
  });
});

router.post('/processFile', function(req, res, next) {
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
      json["color"] = "#D7D7D7";
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
        nombre = fields[1].match(/\/gene=.+/g);
        locus = fields[1].match(/\/locus_tag=.+/g);
        old_locus = fields[1].match(/\/old_locus_tag=.+/g);
        if(nombre != null) {
          json["name"] = nombre[0].match(/[^(")]\w+?(?=")/g)[0];
        } else if(locus != null) {
          json["name"] = locus[0].match(/[^(")]\w+?(?=")/g)[0];
        } else if(old_locus != null) {
          json["name"] = old_locus[0].match(/[^(")]\w+?(?=")/g)[0];
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
      res.write(" ]; </script>");
      if(error){
        res.writeHead(404);
        res.write('File not found!');
      } else {
        res.write(data);
        res.end();
      }
    });
  });
});

module.exports = router;