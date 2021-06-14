import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";

var colorIndex = 0;
function generateColorPalette(genes, names, colors) {
  for(var i = 0; i < genes.length; i++) {
      if(names.includes(genes[i].name)) {
          genes[i].color = colors[names.indexOf(genes[i].name)];
      } else {
          names.push(genes[i].name);
          //genes[i].color = generateRandomColor();
          var colors = [];
          var color = colorsys.hsv2Hex(colorIndex++ * 0.618033988749895 % 1.0 * 240, 50, 100);
          while(colors.includes(color)) {
            color = colorsys.hsv2Hex(colorIndex++ * 0.618033988749895 % 1.0 * 240, 50, 100);
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
    console.log("[fileUploadAndRender] form fields");
    console.log(fields);
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write(`<html lang="en">
    <head>
      <meta charset="UTF-8">`);
    res.write("<script> ");
    res.write("var contextSources = [");
    console.log("[fileUploadAndRender] fields[amountOfContexts]");
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
      }
      res.end();
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
    var thisFtpPath; var thisTaxid; var thisSubmitter;
    var liner;
    var genomaName; var genomaDefinition = null ; var genomaAccession = null;
    if(contextSources[j]["type"] == "accesion") { // || contextSources[j]["type"] == "midAccesion") {
      liner = new readlines("../blast/assembly_summary_refseq.txt");
      if(contextSources[j]["accesion"].includes("GCA")) {
        liner = new readlines("../blast/assembly_summary_genbank.txt");
      }
      var line;
        while (line = liner.next()) {
          line = line.toString("UTF-8");
          if(line.match(contextSources[j]["accesion"])) {
             var summaryData = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t(\d+)\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]*)\t[^\t]*\t[^\t]*\t([^\t]+)\t/);
             thisTaxid = summaryData[1];
             thisSubmitter = summaryData[2];
             thisFtpPath = summaryData[3];
            contextSources[j]["fileName"] = "../blast/" + thisFtpPath.substring(6) + "/" + thisFtpPath.split("/")[thisFtpPath.split("/").length - 1] + "_genomic.gbff"; // + ".gz"
            break;
          }
        }
      //}
      liner.close();
    }

    var contents = "";
    var line;
    console.log("[processFile] contextSources");
    console.log(contextSources);
    if (contextSources[j]["type"] == "midAccesion") {
      for(var file = 0; file < contextSources[j]["fileName"].length; file++) {
        var interestGenes = false;
        var lastGene = false;
        
        var fileName = contextSources[j]["fileName"][file]["path"];
        var found = false;
        liner = new readlines(fileName);
        fileName = fileName.split("/")[fileName.split("/").length - 1];
        var interestIndex = -1;
        console.log("[processFile] contextSources[j][midLocus]");
        console.log(contextSources[j]["midLocus"]);

        while ((line = liner.next()) && !found) {
          line = line.toString("UTF-8");
          if(line.match(/\s*ORGANISM\s+(.*)/))
            genomaName = line.match(/\s*ORGANISM\s+(.*)/)[1];
          if(line.match(/\s*DEFINITION\s+(.*)/))
            genomaDefinition = line.match(/\s*DEFINITION\s+(.*)/)[1];
          if(line.match(/\s*ACCESSION\s+(.*)/))
            genomaAccession = line.match(/\s*ACCESSION\s+(.*)/)[1];
          if(line.match(contextSources[j]["midLocus"])) {
            console.log("---\n\n\n[processFile] Interest locus tag found. Breaking cycle!\n\n\n---");
            found = true;
          } else if(line.match(/\s*gene\s+\w*\(*<?\d+\.\.>?\d+/)) {
            interestIndex++;
          }
        }
        if(!found) {
          continue;
        }
        thisSubmitter = contextSources[j]["fileName"][file]["submitter"];
        thisTaxid = contextSources[j]["taxid"];
        thisFtpPath = contextSources[j]["fileName"][file]["ftpPath"];
        liner.reset();
        var minInterest = interestIndex - UPSTREAMCONTEXTAMOUNT;
        var maxInterest = interestIndex + DOWNSTREAMCONTEXTAMOUNT;
        interestIndex = -1;
        genomaName = fileName.split(".").slice(0, fileName.split(".").length - 1).join('');
        while ((line = liner.next()) && interestIndex <= maxInterest) {
          line = line.toString("UTF-8");
          if(line.match(/\s*gene\s+\w*\(*<?\d+\.\.>?\d+/)) {
            interestIndex++;
            if(interestIndex > maxInterest) {
              break;
            }
          }
          if(line.match(/\s*ORGANISM\s+(.*)/))
            genomaName = line.match(/\s*ORGANISM\s+(.*)/)[1];
          if(interestIndex >= minInterest) {
            contents = contents + line;
            if(line.match(/\bORIGIN\s+/)) {
              break;
            }
          }
        }
        break;
      }
    } else {
      var interestGenes = false;
      var lastGene = false;
      liner = new readlines(contextSources[j]["fileName"]);
      var fileName = contextSources[j]["fileName"].split("/")[contextSources[j]["fileName"].split("/").length - 1];
      genomaName = fileName.split(".").slice(0, fileName.split(".").length - 1).join('');
      while (line = liner.next()) {
        line = line.toString("UTF-8");
        // Extracting key data from the genoma
        if(line.match(/\s*ORGANISM\s+(.*)/))
          genomaName = line.match(/\s*ORGANISM\s+(.*)/)[1];
        if(line.match(/\s*DEFINITION\s+(.*)/))
          genomaDefinition = line.match(/\s*DEFINITION\s+(.*)/)[1];
        if(line.match(/\s*ACCESSION\s+(.*)/))
          genomaAccession = line.match(/\s*ACCESSION\s+(.*)/)[1];
        // Extracting genes data
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
    genomaDefinition = genomaDefinition ?? genomaName;
    genomaAccession = genomaAccession ?? "";
    var array = contents.split(/\s*gene\u0020\u0020+/g);//\u0020 -> caracter espacio
    var genes = [];
    for(var i = 0; i < array.length;i++){
      var json = {};
      json["color"] = "#D7D7D7";
      var fields = array[i].match(/.+/g);
      if (fields != null){
        var length = array[i].match(/<?(\d+)\.\.>?(\d+)/g);
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
          var locus = array[i].match(/\/locus_tag=.+/g);
          if(locus != null) {
            json["locus"] = locus[0].match(/[^(")]\w+?(?=")/g)[0];
          }
        } else {
          var locus = array[i].match(/\/locus_tag=.+/g);
          if(locus != null && !json["name"]) {
            json["name"] = locus[0].match(/[^(")]\w+?(?=")/g)[0];
            json["locus"] = json["name"];
          } else {
            var old_locus = array[i].match(/\/old_locus_tag=.+/g);
            if(old_locus != null && !json["name"]) {
              json["name"] = old_locus[0].match(/[^(")]\w+?(?=")/g)[0];
            } else {
              json["name"] = "no-name";
            }
          }
        }
        // We extract the data for showing outside the graphic
        var inference = array[i].match(/\/inference\s*=\s*"((?:.|\n)*?)"/);
        if(inference != null) {
          json["inference"] = inference[1].replace("\n", " ").replace(/\s+/g, " ");
        }
        var note = array[i].match(/\/note\s*=\s*"((?:.|\n)*?)"/);
        if(note != null) {
          json["note"] = note[1].replace("\n", " ").replace(/\s+/g, " ");
        }
        var product = array[i].match(/\/product\s*=\s*"((?:.|\n)*?)"/);
        if(product != null) {
          json["product"] = product[1].replace("\n", " ").replace(/\s+/g, " ");
        }
        var translation = array[i].match(/\/translation\s*=\s*"((?:.|\n)*?)"/);
        if(translation != null) {
          json["translation"] = translation[1].replace("\n", " ").replace(/\s+/g, " ");
        }
        if(contextSources[j]["type"] == "midAccesion" && array[i].includes(contextSources[j]["midLocus"])) {
          json["interest"] = true;
          console.log("[processFile] Marking this locus as interest gene:");
          console.log(json["locus"]);
        } else {
          json["interest"] = false;
        }
        genes.push(json);
      }
    }
    genomas.push({genes:generateColorPalette(genes, names, colors), name: genomaName, definition: genomaDefinition, accesion: genomaAccession, ftpPath: thisFtpPath, taxid: thisTaxid, submitter: thisSubmitter});
  }
  res.json({genomas: genomas});
});

app.post('/searchHomologous', function(req, res, next) {
  var form = new formidable.IncomingForm();
  var filePath;
  var identifier = Date.now() + Math.random();
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    console.log("[searchHomologous] form fields:");
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
        if(interestGene) {
          console.log("[searchHomologous] locus found:");
          console.log(line);
        }
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
      console.log("[searchHomologous] To be implemented: Get the file path, get the file and do the staff from above");
    }
    
    var query = "blast_inputs/" + identifier + ".fas";
    fs.writeFileSync(query, ">" + identifier + "\n" + fastaSequence);

    // Search homologous
    var outFileName = "blast_outputs/results_" + identifier + ".out";

    shelljs.exec("blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 8 -max_target_seqs " + fields["contextsQuantity"]);
    shelljs.exec("rm blast_inputs/" + identifier + ".fas");

    var liner = new readlines(outFileName);
    var line;
    var taxids = []; var coverages = []; var identities = []; var paths = []; var accesions = []; var taxonGroups = [];
    while (line = liner.next()) {
      line = line.toString("UTF-8");
      console.log("[searchHomologous] Reading blast result line:");
      console.log(line);
      var lineFields = line.match(/(\d+)\t(\d+)\t((?:\d|\.)+)\t(.*)/);
      var taxid = lineFields[1];
      var coverage = parseFloat(lineFields[2]);
      var identity = parseFloat(lineFields[3]);
      var taxonomicGroup = shelljs.exec(`echo ${taxid} | taxonkit${process.platform == "win32" ? ".exe" : ""} reformat -I 1 --data-dir "../.taxonkit"`);
      taxonomicGroup = taxonomicGroup.stdout.slice(0, taxonomicGroup.stdout.length - 1).split("\t")[1].split(";")[fields["oneOfEach"]];
      if(coverage >= fields["minCoverage"] && identity >= fields["minIdentity"] && !taxonGroups.includes(taxonomicGroup)) {
        taxids.push(taxid);
        coverages.push();
        identities.push();
        accesions.push(lineFields[4]);
        taxonGroups.push(taxonomicGroup);
      }
    }
    shelljs.exec("rm " + outFileName);
    for(var i = 0; i < taxids.length; i++) {
      paths.push([]);
    }
    console.log("[searchHomologous] unique taxids:");
    console.log(taxids);
    var summaryLiner = new readlines("../blast/assembly_summary_refseq.txt");
    while ((line = summaryLiner.next())) {
      line = line.toString("UTF-8");
      if(line[0] == "#") {
        continue;
      }
      var lineFields = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t(\d+)\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]*)\t[^\t]*\t[^\t]*\t([^\t]+)\t/);
      if(taxids.includes(lineFields[1])) {
        var i = taxids.indexOf(lineFields[1]);
        paths[i].push({submitter: lineFields[2], ftpPath: lineFields[3], path: "../blast/" + lineFields[3].substring(6) + "/" + lineFields[3].split("/")[lineFields[3].split("/").length - 1] + "_genomic.gbff"});
      }
    }
    console.log("[searchHomologous] File paths:");
    console.log(paths);
   
    // We need to get the specific locus of interest

    // This part is identical to the "fileUploadAndRender" function

    res.writeHead(200,{'Content-Type':'text/html'});
    res.write(`<html lang="en">
    <head>
      <meta charset="UTF-8">`);
    res.write("<script> ");
    res.write("var contextSources = [");
    for(var j = 0; j < paths.length; j++) {
      res.write((j? `, `: ``) + `{ "type": "midAccesion", "fileName": ${JSON.stringify(paths[j])}, "midLocus": "${accesions[j]}", "upStream": "5", "downStream": "5", "taxid": "${taxids[j]}"}`);
    }
    fs.readFile('./public/render.html', null, function(error,data){
      res.write(" ]; </script>");
      if(error){
        //res.writeHead(404);
        res.write('File not found!');
      } else {
        res.write(data);
      }
      res.end();
    });
  });
});

app.listen(3000, function () {
  console.log('Listening on port 3000');
});