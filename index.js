import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";

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
    res.write("var contextSources = [");
    console.log(fields["amountOfContexts"]);
    for(var j = 0; j < fields["amountOfContexts"]; j++) {
      if(fields["genomaSourceType" + j] == "file") {
        var oldpath = files["file" + j].path;
        var newpath = './data/' + files["file" + j].name;
        fs.renameSync(oldpath, newpath);
        res.write((j? `, `: ``) + `{ "type": "${fields["genomaSourceType"+j]}", "fileName": "${newpath}", "locusBegin": "${fields["desde"+j]}", "locusEnd": "${fields["hasta"+j]}"}`);    // Todo lo que se necesita saber del formulario
      } else if(fields["genomaSourceType" + j] == "locus") {
        res.write((j? `, `: ``) + `{ "type": "${fields["genomaSourceType"+j]}", "locusTag": "${field["locus"+j]}", "genesBefore": "${fields["contextoAntes"+j]}", "genesAfter": "${fields["contextoDespues"+j]}"}`);
      }else if(fields["genomaSourceType" + j] == "accesion") {
        res.write((j? `, `: ``) + `{ "type": "${fields["genomaSourceType"+j]}", "accesion": "${field["accesion"+j]}", "locusBegin": "${fields["desde"+j]}", "locusEnd": "${fields["hasta"+j]}"}`);
      }
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
  console.log(req.body.contextSources);
  var contextSources;
  contextSources = JSON.parse(req.body.contextSources);
  var genomas = [];
  var names = [];
  var colors =[];
  for(var j = 0; j < contextSources.length; j++) {
    console.log("\nhere comes context source \n");

    console.log(contextSources);
    console.log(contextSources[j]);
    var fileName = contextSources[j]["fileName"].split("/")[contextSources[j]["fileName"].split("/").length - 1]
    var contents = fs.readFileSync(contextSources[j]["fileName"],'utf8');
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