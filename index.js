import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";
import child_process from "child_process";
import cookieParser from "cookie-parser";

const PORT = 3030;

/* I wish there was a more efficient way to do this, I would like to re-think this.
 * Probably integrating it with the rest of the analysis would help.
 */
function assignColors(genomas) {
  var DifferentColors = 0;
  var names = [];
  var colors = [];
  console.log("[AssignColors] assigning colors");
  for(var i = 0; i < genomas.length; i++) {
    for(var j = 0; j < genomas[i].genes.length; j++) {
      var gene = genomas[i].genes[j];
      if(names.includes(gene.name) || names.includes(gene.product)) {
        for(var k = 0; k < colors.length; k++) {
          if(colors[k].names.includes(gene.name) || colors[k].names.includes(gene.product)) {
            colors[k].count++;
            if(!colors[k].names.includes(gene.name)) {
              colors[k].names.push(gene.name);
            } else if(!colors[k].names.includes(gene.product)) {
              colors[k].names.push(gene.product);
            }
          }
        }
      }
      else {
        names.push(gene.name); names.push(gene.product);
        if(gene.interest) {
          colors.push({
            names: [gene.name, gene.product],
            count: 1,
            color: "#BD3B32"
          });
        } else {
          colors.push({
            names: [gene.name, gene.product],
            count: 1
          });
        }
      }
    }
  }
  for(var k = 0; k < colors.length; k++) {
    if(colors[k].count == 1 && !colors[k].color) {
      colors[k].names.forEach( name => {
        names.splice(names.indexOf(name), 1);
      });
    } else {
      colors[k].color = colors[k].color ?? colorsys.hsv2Hex(DifferentColors++ * 0.618033988749895 % 1.0 * 360, 50, 100);
    }
  }
  for(var i = 0; i < genomas.length; i++) {
    for(var j = 0; j < genomas[i].genes.length; j++) {
      if(names.includes(genomas[i].genes[j].name) || names.includes(genomas[i].genes[j].product)) {
        for(var k = 0; k < colors.length; k++) {
          if(colors[k].names.includes(genomas[i].genes[j].name) || colors[k].names.includes(genomas[i].genes[j].product)) {
            genomas[i].genes[j].color = colors[k].color;
          }
        }
      }
    }
  }
  return(genomas);
}

function download_gbff(fileName) {
  try {
    if (!fs.existsSync(fileName)) {
      console.log("[ProcessFile] Downloading " + fileName);
      console.log(`wget -r -l 0 https://${fileName.substring(9)}.gz -O ${fileName}.gz`);
      process.chdir('../blast');
      console.log(shelljs.exec(`wget -r -l 0 https://${fileName.substring(9)}.gz`).stdout);
      console.log(shelljs.exec(`gzip --decompress --force ${fileName}.gz`).stdout);
    }
    return(true);
  } catch(err) {
    console.error(err);
    return(false);
  } finally {
    process.chdir('../InUsIConGeB');
  }
}

app.use('/favicon.ico', express.static('public/images/favicon.png'));

// create application/json parser
app.use(express.json({ limit: "1000mb" }));
app.use(cookieParser());
app.use(express.urlencoded({
  extended: true
}));

app.all("/*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  next();
});

app.get("/", function(req, res, next) {
  if(req.cookies.drawnDiagram == undefined) {
    if(req.cookies.knowsTutorial == undefined) {
      fs.readFile('./public/index.html', null, function(error,data){
        if(error){
          res.writeHead(404);
          res.write('File not found!');
        } else {
          res.cookie('knowsTutorial', "yes", { maxAge: 90000000000 });
          
          res.writeHead(200,{'Content-Type':'text/html'});
          res.write(`<html lang="en">
                      <head>
                      <meta charset="UTF-8"></meta>
                      <script>var tutorial = true;</script>`);
          res.write(data);
          
          res.end();
        }
      });
    } else {
      fs.readFile('./public/index.html', null, function(error,data){
        if(error){
          res.writeHead(404);
          res.write('File not found!');
        } else {
          res.writeHead(200,{'Content-Type':'text/html'});
          res.write(`<html lang="en">
                      <head>
                      <meta charset="UTF-8"></meta>`);
          res.write(data);
          
          res.end();
        }
      });
    }
  } else {
  }
});

app.use(express.static(path.join(process.cwd(), 'public')));

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
        var newpath = './data/' + files["file" + j].name + Date.now();
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
  try {
    var contextSources;
    var UPSTREAMCONTEXTAMOUNT = 5;
    var DOWNSTREAMCONTEXTAMOUNT = 5;
    contextSources = JSON.parse(req.body.contextSources);
    var genomas = [];
    var thereIsAnError = "";
    for(var j = 0; j < contextSources.length; j++) {
      var thisFtpPath; var thisTaxid; var thisSubmitter;
      var liner;
      var genomaName; var genomaDefinition = null ; var genomaAccession = null;
      if(contextSources[j]["type"] == "accesion") {
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
            if(!download_gbff(contextSources[j]["fileName"])) {
              res.json({"Error": `Error con ${contextSources[j]["fileName"]}: No se ha logrado descargar el archivo.`});
            }
            break;
          }
        }
        liner.close();
      }

      var contents = "";
      var line;
      console.log("[processFile] contextSources");
      console.log(contextSources);
    
      var interestGenes = false;
      var lastGene = false;
      liner = new readlines(contextSources[j]["fileName"]);
      var fileName = contextSources[j]["fileName"].split("/")[contextSources[j]["fileName"].split("/").length - 1];
      genomaName = fileName.split(".").slice(0, fileName.split(".").length - 1).join('');
      var isRegionSpecified = contextSources[j]["locusBegin"].match(/^\d/); // TODO: What if one is region and the other is locus tag? (begin - end)
      if(isRegionSpecified) {
        contextSources[j]["locusBegin"] = parseInt(contextSources[j]["locusBegin"]);
        contextSources[j]["locusEnd"] = parseInt(contextSources[j]["locusEnd"]);
      }
      while (line = liner.next()) {
        line = line.toString("UTF-8");

        // Extracting key data from the genoma
        if(line.match(/\s*ORGANISM\s+(.*)/))
          genomaName = line.match(/\s*ORGANISM\s+(.*)/)[1];
        else if(line.match(/\s*DEFINITION\s+(.*)/))
          genomaDefinition = line.match(/\s*DEFINITION\s+(.*)/)[1];
        else if(line.match(/\s*ACCESSION\s+(.*)/))
          genomaAccession = line.match(/\s*ACCESSION\s+(.*)/)[1];

        // Extracting genes data
        if(!isRegionSpecified) {
          contents = contents + line + "\n";
          if(!interestGenes) {
            if(contextSources[j]["locusBegin"] && line.includes(contextSources[j]["locusBegin"])) {
              interestGenes = true;
            } else if(!contextSources[j]["locusBegin"] && line.match(/^..\s{3}\w+\s{2}/)) {
              if(!line.match(/^..\s{3}source\s{10}/)) {
                contents = line + "\n";
                interestGenes = true;
              }
            } else if(line.match(/^..\s{3}\w+\s{2}.*\d+\.\./)){
              contents = line + "\n";
            }
          } else {
            if(contextSources[j]["locusEnd"] && line.includes(contextSources[j]["locusEnd"])) {
              lastGene = true;
            } else if(lastGene && (line.match(/^..\s{3}\w+\s{2}/) || line.match(/^..[^\s]/))) {
              break;
            }
            if(line.match(/^..[^\s]/) || line.match(/^\/\//)) {
              break;
            }
          }
        } else {
          var featureDefinition = line.match(/^..\s{3}\w+\s{2}.*?(\d+)\.\.(?:\d+\s,\s\d+\.\.)?(\d+)/);
          if(featureDefinition) {
            console.log("featureDefinition");
            console.log(featureDefinition);
          }
          if(!interestGenes) {
            if(featureDefinition) {
              if(parseInt(featureDefinition[1]) >= contextSources[j]["locusBegin"]) {
                console.log("Begin!");
                interestGenes = true;
                contents = line + "\n";
              }
            }
          } else {
            if(featureDefinition && parseInt(featureDefinition[2]) > contextSources[j]["locusEnd"]) {
              interestGenes = false;
              break;
            } else {
              contents = contents + line + "\n";
            }
          }
        }
      }
      genomaDefinition = genomaDefinition ?? genomaName;
      genomaAccession = genomaAccession ?? "";
      var array = contents.split(/\n(?=..\s{3}\w+\s{2})/g); // \u0020 -> caracter espacio
      var genes = [];
      /*console.log("\n\n\nContents:");
      console.log(contents);
      console.log("Contents end\n\n\n");*/
      if(contents.match(/$\s+^/)) {
        thereIsAnError = thereIsAnError + " ; " + `Error con ${genomaName}: No se han encontrado los locus tag especificados.`;
        continue;
      }
      var lastJson = null;
      for(var i = 0; i < array.length;i++){
        var json = {};
        var fields = array[i].match(/.+/g);
        if (fields != null){
          if(array[i].match(/..\s{10,}\/pseudo/)) {
            continue;
          }
          var length = array[i].match(/<?(\d+)\.\.>?(\d+)/g)[0];
          var start = length.match(/\d+/g)[0];
          var end = length.match(/\d+/g)[1];
          if(array[i].match(/^.*join\(<?(\d+)\.\.>?(\d+)\s*,\s*<?(\d+)\.\.>?(\d+)\)/)) {
            length = array[i].match(/(?<=^.*)join\(<?(\d+)\.\.>?(\d+)\s*,\s*<?(\d+)\.\.>?(\d+)\)/)[0];
            start = length.match(/\d+/g)[0];
            end = length.match(/\d+/g)[3];
          }
          if(lastJson && start === lastJson.start && end === lastJson.end) {
            json = {...json, ...lastJson};
          } else {
            json["start"] = start;
            json["end"] = end;
            if(lastJson) {
              genes.push(lastJson);
            }
          }
          json["complement"] = array[i].includes("complement(" + length + ")");

          // We extract the data for showing outside the graphic
          var inference = array[i].match(/\/inference=\s*"((?:.|\n)*?)"/);
          if(inference != null) {
            json["inference"] = inference[1].replace("\n", " ").replace(/\s+/g, " ");
          }
          var note = array[i].match(/\/note=\s*"((?:.|\n)*?)"/);
          if(note != null) {
            json["note"] = note[1].replace("\n", " ").replace(/\s+/g, " ");
          }
          var product = array[i].match(/\/product=\s*"((?:.|\n)*?)"/);
          if(product != null) {
            json["product"] = product[1].replace("\n", " ").replace(/\s+/g, " ");
          }
          var translation = array[i].match(/\/translation=\s*"((?:.|\n)*?)"/);
          if(translation != null) {
            json["translation"] = translation[1].replace("\n", " ").replace(/\s+/g, " ");
          }

          var old_locus = array[i].match(/\/old_locus_tag=.+/g);
          if(old_locus != null) {
            json["name"] = old_locus[0].match(/[^(")]\w+?(?=")/g)[0];
          }
          var locus = array[i].match(/\/locus_tag=.+/g);
          if(locus != null) {
            try {
              json["name"] = locus[0].match(/[^(")]\w+?(?=")/g)[0].split("_")[1];
              json["locus"] = locus[0].match(/[^(")]\w+?(?=")/g)[0];
            } catch(ex){}
          }
          var nombre = array[i].match(/\/gene=.+/g);
          if(nombre != null) {
            json["name"] = nombre[0].match(/".+?"/g)[0].slice(1,-1);
          }

          if(array[i].match(/^..\s{3}tRNA\s{3}/)) {
            json["name"] = json["product"];
          } else if (array[i].match(/^..\s{3}rRNA\s{3}/)) {
            if(json["product"].match(/.* ribosomal RNA/)) {
              json["name"] = json["product"].replace("ribosomal RNA", "RNA");
            } else {
              json["name"] = "rRNA"
            }
          }
          json["interest"] = false;
          lastJson = json;
        }
      }
      genes.push(lastJson);
      genomas.push({genes: genes, name: genomaName, definition: genomaDefinition, accesion: genomaAccession, ftpPath: thisFtpPath, taxid: thisTaxid, submitter: thisSubmitter});
    }
    if(thereIsAnError) {
      res.json({genomas: assignColors(genomas), error: thereIsAnError});
    }
    res.json({genomas: assignColors(genomas)});
  } catch (ex) {
    console.error(ex);
    res.json({error: "Ha habido un error desconocido. Favor contactar a los desarrolladores."});
  }
});

app.post('/searchAndDraw', function(req, res, next) {
  var form = new formidable.IncomingForm();
  console.log("hola");
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    var child = child_process.fork('searchAndDraw.js');
    console.log("Se hizo el child");
    // So we can see the console logs // console.log("");
    child.on('message', function(message) {
      console.log('[parent] received message from child:', message);
      if(message.ready) {
        child.send({fields: fields, files: files});
      } else if(message.error) {
        res.writeHead(message.errorCode,{'Content-Type':'text/html'});
        res.write(`<html lang="en"> <head><meta charset="UTF-8"></head>
          <body><h2>Error</h2>
          <p> ${message.error}</p>`
        );
        res.end();
      } else {
        res.writeHead(200,{'Content-Type':'text/html'});
        res.write(`<html lang="en">
        <head>
          <meta charset="UTF-8">`);
        res.write("<script> ");
        res.write("var genomas = ");
        res.write(JSON.stringify(message.genomas));
        fs.readFile('./public/fullRender.html', null, function(error,data){
          res.write("; </script>");
          if(error){
            res.write('File not found!');
          } else {
            res.write(data);
          }
          res.end();
        });
      }  
    });
  });
});

app.post('/updateDatabases', function(req, res, next) {
  console.log(req.body);
  if("password" == req.body.password) {
    // First, taxonomic database
    console.log("Updating!");
    if("password" == req.body.tax) {
      console.log(shelljs.exec("wget https://ftp.ncbi.nih.gov/pub/taxonomy/taxdump.tar.gz -O ../.taxonkit/taxdump.tar.gz").stdout);
      console.log(shelljs.exec("gzip --decompress --force ../.taxonkit/taxdump.tar.gz").stdout);
    }
    // Second, we update the .gbff files
    if("password" == req.body.summary) {
      console.log(shelljs.exec("wget https://ftp.ncbi.nlm.nih.gov/genomes/refseq/assembly_summary_refseq.txt").stdout);
      console.log(shelljs.exec("wget https://ftp.ncbi.nlm.nih.gov/genomes/genbank/assembly_summary_genbank.txt").stdout);
    }
    if("password" == req.body.gbffs) {
      console.log(shelljs.exec("python3 ../blast/download_gbffs.py").stdout);
    }
    // Last, we update BLAST databases
    if("password" == req.body.blast) {
      for(var i = 0; i < 26; i++) {
        var twoDigitIndex = i < 10 ? "0" + i : i;
        shelljs.exec(`wget https://ftp.ncbi.nlm.nih.gov/blast/db/refseq_protein.${twoDigitIndex}.tar.gz -O ../blast/refseq_protein/refseq_protein.${twoDigitIndex}.tar.gz`);
        shelljs.exec(`gzip --decompress --force ../blast/refseq_protein/refseq_protein.${twoDigitIndex}.tar.gz`);
      }
    }
  }
  res.end();
});

app.post('/freeSpace', function(req, res, next) { // We remove files.
  console.log(req.body);
  if("password" == req.body.password) {
    console.log("Deleting temporal data!");
    console.log(shelljs.exec("rm -f data/*").stdout);
    console.log(shelljs.exec("rm -f blast_outputs/*").stdout);
    console.log(shelljs.exec("rm -f blast_inputs/*").stdout);
    console.log(shelljs.exec("rm -r -f ../blast/ftp.ncbi.nlm.nih.gov/*").stdout);
  }
  res.end();
});
app.listen(PORT, function () {
  console.log('Listening on port ' + PORT);
});
