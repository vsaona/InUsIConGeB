import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";

//import bodyParser from "body-parser"; //var bodyParser = require('body-parser')
 
function generateRandomColor() {
  var colorType = Math.random() * 3;
  var a = Math.round(96 + 144 * Math.random())
  var b = Math.round(96 + 144 * Math.random())
  var c = (Math.round(96 + ((336 - a - b)/* % 255*/)) % 255).toString(16);
  a = a.toString(16);
  b = b.toString(16);
  if(colorType < 1) { // yellow
      return("#"+a+b+c);
  } else if(colorType < 2) {
      return("#"+c+a+b);
  } else {
      return("#"+b+c+a);
  }
}

function generateColorPalette(genes, names, colors) {
  var j = 0;
  for(var i = 0; i < genes.length; i++) {
      if(names.includes(genes[i].name)) {
          genes[i].color = colors[names.indexOf(genes[i].name)];
      } else {
          names.push(genes[i].name);
          //genes[i].color = generateRandomColor();
          var colors = [];
          var color = colorsys.hsv2Hex(j++ * 0.618033988749895 % 1.0 * 240, 50, 100);
          while(colors.includes(color)) {
            color = colorsys.hsv2Hex(j++ * 0.618033988749895 % 1.0 * 240, 50, 100);
          }
          genes[i].color = color;
          colors.push(color);
      }
  }
  return(genes);
}

app.use('/favicon.ico', express.static('public/images/favicon.png'));

// create application/json parser
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.use(express.static(path.join(process.cwd(), 'public')));

app.all("/*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  next();
});

app.get("/", function(req, res, next) {
  console.log("index");
  fs.readFile('./public/index.html', null, function(error,data){
    if(error){
      res.writeHead(404);
      res.write('File not found!');
    } else {
      res.writeHead(200,{'Content-Type':'text/html'});
      res.write(data);
      res.end();
    }
  });
});

// Esta es la funcion original, responde correctamente a las vistas de Node.
app.post('/fileUploadAndRender', function(req, res, next) {
  console.log("DEBUG: POST FUNCTION /fileUpload");
  
  var form = new formidable.IncomingForm();
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    if(err) throw err;
    console.log(fields);
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write("<script> ");
    res.write("var filePath = [");
    for(var j = 0; files["file" + j]; j++) {
      var oldpath = files["file" + j].path;
      var newpath = './data/' + files["file" + j].name;
      fs.renameSync(oldpath, newpath);
      res.write((j?", '":"'")+ newpath + "'");    // Esto escribe la coma al principio si j != 0
    }
    fs.readFile('./public/render.html', null, function(error,data){
      res.write(" ]; </script>");
      if(error){
        //res.writeHead(404);
        res.write('File not found!');
      } else {
        res.write(data);
        res.end();
      }
    });
  });
});

app.post('/processFile', function(req, res, next) {
  console.log(req.body);
  console.log(req.body.filePath);
  var filePath;
  if(!(Array.isArray(req.body.filePath))) {
    filePath = [req.body.filePath];
  } else {
    filePath = req.body.filePath;
  }
  var genomas = [];
  var names = [];
  var colors =[];
  for(var j = 0; j < filePath.length; j++) {
    var fileName = filePath[j].split("/")[filePath[j].split("/").length - 1]
    var contents = fs.readFileSync(filePath[j],'utf8');
    var array = contents.split(/gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    array = array.slice(1);
    var genes = []
    for(var i = 0; i < array.length;i++){
      var json = {};
      json["color"] = "#D7D7D7";
      var fields = array[i].match(/.+/g);
      if (fields != null){
        var large = array[i].match(/\d+/g);
        json["start"] = large[0];
        json["end"] = large[1];
        var complement = fields[0].match(/complement/);
        if(complement == null){
          json["complement"] = false;
        } else {
          json["complement"] = true;
        }
        var nombre = fields[1].match(/\/gene=.+/g);
        var locus = fields[1].match(/\/locus_tag=.+/g);
        var old_locus = fields[1].match(/\/old_locus_tag=.+/g);
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
    var genomaName = fileName.split(".");
    genomaName = genomaName.slice(0, genomaName.length - 1).join('');
    genomas.push({genes:generateColorPalette(genes, names, colors), name: genomaName});
  }
  res.json({genomas: genomas});
});

app.post('/searchHomologous', function(req, res, next) {
  var identifier = Date.now()
  // Get genomic data
  var query = "blast_inputs/.fsa"; // Must be modified

  // Search homologous
  var outFileName = "blast_outputs/results_" + identifier + ".out";
  shelljs.exec("blastp -db ../blast/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt 15 -num_threads 8 -max_target_seqs 10");

  res.end();
});


app.listen(3000, function () {
  console.log('Listening on port 3000');
});