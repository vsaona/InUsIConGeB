import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";

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
        res.write((j? `, `: ``) + `{ "type": "file", "fileName": "${newpath}", "locusBegin": "${fields["desde"+j]}", "locusEnd": "${fields["hasta"+j]}"}`);    // Todo lo que se necesita saber del formulario
      } else if(fields["genomaSourceType" + j] == "locus") {
        res.write((j? `, `: ``) + `{ "type": "locus", "locusTag": "${fields["locus"+j]}", "genesBefore": "${fields["contextoAntes"+j]}", "genesAfter": "${fields["contextoDespues"+j]}"}`);
      }else if(fields["genomaSourceType" + j] == "accesion") {
        res.write((j? `, `: ``) + `{ "type": "accesion", "accesion": "${fields["accesion"+j]}", "locusBegin": "${fields["desde"+j]}", "locusEnd": "${fields["hasta"+j]}"}`);
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
  var contextSources;
  var UPSTREAMCONTEXTAMOUNT = 5;
  var DOWNSTREAMCONTEXTAMOUNT = 5;
  contextSources = JSON.parse(req.body.contextSources);
  var genomas = [];
  var names = [];
  var colors =[];
  for(var j = 0; j < contextSources.length; j++) {
    var liner;
    if(contextSources[j]["type"] == "accesion") { // || contextSources[j]["type"] == "midAccesion") {
      liner = new readlines("../blast/assembly_summary_refseq.txt");
      if(contextSources[j]["accesion"].includes("GCA")) {
        liner = new readlines("../blast/assembly_summary_genbank.txt");
      }
      var line;
      /*if (contextSources[j]["type"] == "midAccesion") {
        while (line = liner.next()) {
          line = line.toString("UTF-8");
          if(line.match(contextSources[j]["taxid"])) {
            var ftpPath = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]+)\t/)[1];
            contextSources[j]["fileName"] = "../blast/" + ftpPath.substring(6) + "/" + ftpPath.split("/")[ftpPath.split("/").length - 1] + "_genomic.gbff"; // + ".gz"
            break;
          }
        }
      } else {*/
        while (line = liner.next()) {
          line = line.toString("UTF-8");
          if(line.match(contextSources[j]["accesion"])) {
            var ftpPath = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]+)\t/)[1];
            contextSources[j]["fileName"] = "../blast/" + ftpPath.substring(6) + "/" + ftpPath.split("/")[ftpPath.split("/").length - 1] + "_genomic.gbff"; // + ".gz"
            break;
          }
        }
      //}
      liner.close();
    }

    var fileName = contextSources[j]["fileName"].split("/")[contextSources[j]["fileName"].split("/").length - 1];
    var interestGenes = false;
    var lastGene = false;
    var contents = "";
    liner = new readlines(contextSources[j]["fileName"]);
    
    var line;
    if (contextSources[j]["type"] == "midAccesion") {
      var interestIndex = -1;
      console.log(contextSources[j]["midLocus"]);
      while (line = liner.next()) {
        line = line.toString("UTF-8");
        
        if(line.match(contextSources[j]["midLocus"])) {
          console.log("---\n\n\nbreaking!\n\n\n---");
          break;
        } else if(line.match(/\s*gene\s+\w*\(*<?\d+\.\.>?\d+/)) {
          interestIndex++;
        }
      }
      liner.reset();
      var minInterest = interestIndex - UPSTREAMCONTEXTAMOUNT;
      var maxInterest = interestIndex + DOWNSTREAMCONTEXTAMOUNT;
      interestIndex = -1;
      while (line = liner.next()) {
        line = line.toString("UTF-8");
        if(interestIndex >= minInterest && interestIndex <= maxInterest) {
          contents = contents + line;
        } else if(line.match(/\s*gene\s+\w*\(*<?\d+\.\.>?\d+/)) {
          interestIndex++;
        }
      }
    } else {
      while (line = liner.next()) {
        line = line.toString("UTF-8");
        
        if(line.includes(contextSources[j]["locusBegin"])) {
          interestGenes = true;
        }
        if(interestGenes && line.includes(contextSources[j]["locusEnd"])) {
          lastGene = true;
        }
        if(lastGene && line.includes("gene\u0020\u0020")) {
          break;
        }
        if(interestGenes) {
          contents = contents + line + "\n";
        }
      }
    }
    
    console.log(contents);
    console.log("These are");
    // var contents = fs.readFileSync(contextSources[j]["fileName"], 'utf8');

    //for(var i = 0; fileStream.)
    var array = contents.split(/gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    //array = array.slice(1);
    var genes = []
    for(var i = 0; i < array.length;i++){
      var json = {};
      json["color"] = "#D7D7D7";
      var fields = array[i].match(/.+/g);
      if (fields != null){
        var length = array[i].match(/<?(\d+)\.\.>?(\d+)/g);
        console.log(length[0]);
        console.log(length[0].match(/\d+/g));
        json["start"] = length[0].match(/\d+/g)[0];
        json["end"] = length[0].match(/\d+/g)[1];
        var complement = array[i].match("complement(" + length[0] + ")");
        if(complement == null){
          json["complement"] = false;
        } else {
          json["complement"] = true;
        }
        var nombre = array[i].match(/\/gene=.+/g);
        if(nombre != null) {
          json["name"] = nombre[0].match(/[^(")]\w+?(?=")/g)[0];
        } else {
          var locus = array[i].match(/\/locus_tag=.+/g);
          if(locus != null && !json["name"]) {
            json["name"] = locus[0].match(/[^(")]\w+?(?=")/g)[0];
          } else {
            var old_locus = array[i].match(/\/old_locus_tag=.+/g);
            if(old_locus != null && !json["name"]) {
              json["name"] = old_locus[0].match(/[^(")]\w+?(?=")/g)[0];
            } else {
              json["name"] = "no";
            }
          }
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
  var form = new formidable.IncomingForm();
  var filePath;
  var identifier = Date.now() + Math.random();
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    console.log(fields);
    var fastaSequence;
    if(fields["genomaSearchSourceType"] == "file") {
      filePath = files["fileSearchSource"].path;
      
      // We extract the fasta sequence
      var liner = new readlines(filePath);
      var interestGene = false;
      var line;
      while (line = liner.next()) {
        line = line.toString("UTF-8");
        if(line.includes(fields["searchFileLocusTag"])) {
          interestGene = true;
        }
        if(interestGene) console.log(line);
        if(interestGene && line.match(/\/translation\s*=/)) {
          fastaSequence = line.match(/translation\s*=\s*"(\w+)/)[1];
          while (line = liner.next()) {
            line = line.toString("UTF-8");
            fastaSequence = fastaSequence + line.match(/\s*(\w+)"?/)[1];
            if(line.includes('"')) {
              break;
            }
          }
          break;
        }
      }
      // End of fasta extracting
    } else if(fields["genomaSearchSourceType"] == "fasta") {
      fastaSequence = fields["fastaSearchSource"];
    } else if(fields["genomaSearchSourceType"] == "accesion") {
      console.log("To be implemented: Get the file path, get the file and do the staff from above");
    }
    
    var query = "blast_inputs/" + identifier + ".fas";
    fs.writeFileSync(query, ">" + identifier + "\n" + fastaSequence);

    // Search homologous
    var outFileName = "blast_outputs/results_" + identifier + ".out";

    shelljs.exec("blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 8 -max_target_seqs " + fields["contextsQuantity"]);

    var liner = new readlines(outFileName);
    var line;
    var taxids = []; var coverages = []; var identities = []; var paths = []; var accesions = [];
    while (line = liner.next()) {
      line = line.toString("UTF-8");
      console.log(line);
      var fields = line.match(/(\d+)\t(\d+)\t((?:\d|\.)+)\t(.*)/);
      taxids.push(fields[1]);
      coverages.push(parseFloat(fields[2]));
      identities.push(parseFloat(fields[3]));
      accesions.push(fields[4]);
    }
    
    var summaryLiner = new readlines("../blast/assembly_summary_refseq.txt");
    var contextsToDraw = taxids.length;
    while ((line = summaryLiner.next()) && contextsToDraw) {
      line = line.toString("UTF-8");
      if(line[0] == "#") {
        continue;
      }
      var fields = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t(\d+)\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]+)/);
      if(taxids.includes(fields[1])) {
        console.log(line);
        contextsToDraw--;
        paths.push("../blast/" + fields[2].substring(6) + "/" + fields[2].split("/")[fields[2].split("/").length - 1] + "_genomic.gbff");
      }
    }
    console.log(paths);
   
    // We need to get the specific locus of interest

    // This part is identical to the "fileUploadAndRender" function

    res.writeHead(200,{'Content-Type':'text/html'});
    res.write("<script> ");
    res.write("var contextSources = [");
    for(var j = 0; j < paths.length; j++) {
      res.write((j? `, `: ``) + `{ "type": "midAccesion", "fileName": "${paths[j]}", "taxid": "${taxids[j]}", "midLocus": "${accesions[j]}", "upStream": "5", "downStream": "5"}`);
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

app.listen(3000, function () {
  console.log('Listening on port 3000');
});