import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";
import child_process from "child_process";

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
      if (contextSources[j]["type"] == "midAccesion") {
        if(!contextSources[j]["fileName"].length && contextSources[j].error) {
          thereIsAnError = thereIsAnError + ";" + contextSources[j].error;
        }
        for(var file = 0; file < contextSources[j]["fileName"].length; file++) {
          var interestGenes = false;
          var lastGene = false;
          
          var fileName = contextSources[j]["fileName"][file]["path"];
          var found = false;
          
          if(!download_gbff(fileName)) {
            continue;
          }
          
          liner = new readlines(fileName);
          fileName = fileName.split("/")[fileName.split("/").length - 1];
          var interestIndex = -1;

          var lineNumber = 0;
          var linesToJump = 0; // This is because some files have this "//" weird thing

          while ((line = liner.next()) && !found) {
            lineNumber++;
            line = line.toString("UTF-8");
            if(line.match(/^\/\/$/)) {
              linesToJump = lineNumber;
              interestIndex = 0;
            }
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
          for(var temporalCounter = 0; temporalCounter < linesToJump; ++temporalCounter && liner.next());
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
          else if(line.match(/\s*DEFINITION\s+(.*)/))
            genomaDefinition = line.match(/\s*DEFINITION\s+(.*)/)[1];
          else if(line.match(/\s*ACCESSION\s+(.*)/))
            genomaAccession = line.match(/\s*ACCESSION\s+(.*)/)[1];

          // Extracting genes data
          else if(!interestGenes) {
            if(contextSources[j]["locusBegin"] && line.includes(contextSources[j]["locusBegin"])) {
              interestGenes = true;
              console.log("BEGIN LINE :: " + line);
            } else if(!contextSources[j]["locusBegin"] && line.match(/..\s{3}gene\s{12}/)) {
              interestGenes = true;
              console.log("BEGIN LINE :: " + line);
            }
          } else {
            if(interestGenes && contextSources[j]["locusEnd"] && line.includes(contextSources[j]["locusEnd"])) {
              lastGene = true;
            }
            if(lastGene && line.includes("\u0020\u0020\u0020gene\u0020\u0020")) {
              console.log("LAST LINE :: " + line);
              break;
            }
            if(line.match(/^ORIGIN\b/) || line.match(/^\/\//)) {
              console.log("LAST LINE :: " + line);
              break;
            }
            contents = contents + line + "\n";
          }
        }
      }
      genomaDefinition = genomaDefinition ?? genomaName;
      genomaAccession = genomaAccession ?? "";
      var array = contents.split(/\s{3,5}gene\u0020{10}/g); // \u0020 -> caracter espacio
      var genes = [];
      /*console.log("\n\n\nContents:");
      console.log(contents);
      console.log("Contents end\n\n\n");*/
      if(contents.match(/$\s+^/)) {
        thereIsAnError = thereIsAnError + " ; " + `Error con ${genomaName}: No se han encontrado los locus tag especificados.`;
        continue;
      }
      for(var i = 0; i < array.length;i++){
        var json = {};
        json["color"] = "#A7A7A7";
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
          if(array[i].match(/\s*tRNA\s{3,}/)) {
            json["name"] = json["product"];
          } else if (array[i].match(/\s*rRNA\s{3,}/)) {
            if(json["product"].match(/.* ribosomal RNA/)) {
              json["name"] = json["product"].replace("ribosomal RNA", "RNA");
            } else {
              json["name"] = "rRNA"
            }
          }
          if(contextSources[j]["type"] == "midAccesion" && array[i].includes(contextSources[j]["midLocus"])) {
            json["interest"] = true;
            json["identity"] = contextSources[j].identity;
            json["coverage"] = contextSources[j].coverage;
            console.log("[processFile] Marking this locus as interest gene:");
            console.log(json["locus"]);
          } else {
            json["interest"] = false;
          }
          genes.push(json);
        }
      }
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

app.post('/searchHomologous', function(req, res, next) {
  try {
    var form = new formidable.IncomingForm();
    var filePath;
    var identifier = Date.now() + Math.random();
    var error;
    form.uploadDir = "./data"
    form.parse(req, function (err, fields, files){
      console.log("[searchHomologous] form fields:");
      console.log(fields);
      var fastaSequence;
      var thisFtpPath;
      var thisSubmitter;
      var thisTaxid;
      if(fields["genomaSearchSourceType"] == "accesion") {
        liner = new readlines("../blast/assembly_summary_refseq.txt");
        if(fields["accesionSearchSource"].includes("GCA")) {
          liner = new readlines("../blast/assembly_summary_genbank.txt");
        }
        var line;
        while (line = liner.next()) {
          line = line.toString("UTF-8");
          if(line.match(fields["accesionSearchSource"])) {
            var summaryData = line.match(/[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t(\d+)\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t([^\t]*)\t[^\t]*\t[^\t]*\t([^\t]+)\t/);
            thisFtpPath = summaryData[3];
            thisSubmitter = summaryData[2];
            thisTaxid = summaryData[1];
            filePath = "../blast/" + thisFtpPath.substring(6) + "/" + thisFtpPath.split("/")[thisFtpPath.split("/").length - 1] + "_genomic.gbff"; // + ".gz"
            if(!download_gbff(filePath)) {
              error = `There's been an error downloading ${thisFtpPath}, so you will probably see one context less. Please try again later.`// `Ha habido un error al descargar desde ${thisFtpPath}. Esto puede hacer que no se vea uno de los contextos encontrados. Por favor inténtelo de nuevo más tarde`
            }
            break;
          }
        }
        try {
          liner.close();
        } catch {
          res.writeHead(400,{'Content-Type':'text/html'});
          res.write(`<html lang="en">
          <body>
          <h1> Error </h1> <p> The specified assembly accession number is not part of GenBank assemblies. </p>
          </body>`);
          res.end();
          return;
        }
      }
      var taxids = []; var coverages = []; var identities = []; var paths = []; var accesions = []; var taxonGroups = [];
      if(fields["genomaSearchSourceType"] == "file" || fields["genomaSearchSourceType"] == "accesion") {
        filePath = filePath ?? files["fileSearchSource"].path;
        // We extract the fasta sequence
        var liner = new readlines(filePath);
        var interestGene = false;
        var line;
        while (line = liner.next()) {
          line = line.toString("UTF-8");
          if(line.includes(fields["searchFileLocusTag"])) {
            interestGene = true;
          }
          if(interestGene && line.match(/\/translation=/)) {
            fastaSequence = line.match(/translation=\s*"(\w+)/)[1];
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
        if(fields["genomaSearchSourceType"] == "file") {
          paths.push([{path: filePath.replace("\\", "/"), submitter: "you"}]);
          taxids.push(0);
        } else {
          paths.push([{path: filePath.replace("\\", "/"), ftpPath: thisFtpPath, submitter: thisSubmitter}]);
          taxids.push(thisTaxid);
        }
        coverages.push(100);
        identities.push(100);
        accesions.push(fields["searchFileLocusTag"]);
        // End of fasta extracting
      } else if(fields["genomaSearchSourceType"] == "fasta") {
        fastaSequence = "";
        var fastaLines = fields["fastaSearchSource"].split(/\n\r?/);
        for(var fastaLineIndex = 0; fastaLineIndex < fastaLines.length; fastaLineIndex++) {
          if(!fastaLines[fastaLineIndex].match(/$\>/)) {
            fastaSequence = fastaSequence + fastaLines[fastaLineIndex];
          }
        }
      }
      
      var query = "blast_inputs/" + identifier + ".fas";
      fs.writeFileSync(query, ">" + identifier + "\n" + fastaSequence);

      // Search homologous
      var outFileName = "blast_outputs/results_" + identifier + ".out";
      console.log("BLAST command")
      console.log( "../blastPlus/ncbi-blast-2.12.0+/bin/blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 24");
      shelljs.exec("blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 24");
      // shelljs.exec("../blastPlus/ncbi-blast-2.12.0+/bin/blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 24");
      shelljs.exec("rm blast_inputs/" + identifier + ".fas");

      var liner = new readlines(outFileName);
      var line;
      var failures = 0;
      fields["includeOnly"] = fields["includeOnly"].toLowerCase();
      fields["useOneOfEach"] = fields["useOneOfEach"] === "true";

      while ((line = liner.next()) && (identities.length < parseInt(fields["contextsQuantity"]) * 1.5) && (failures < 3)) {
        line = line.toString("UTF-8");
        console.log("[searchHomologous] Reading blast result line:");
        console.log(line);
        var lineFields = line.match(/(\d+)\t(\d+)\t((?:\d|\.)+)\t(.*)/);
        var taxid = lineFields[1];
        var coverage = parseFloat(lineFields[2]);
        var identity = parseFloat(lineFields[3]);
        if(coverage >= fields["minCoverage"] && identity >= fields["minIdentity"]) {
          if((fields["useOneOfEach"] && fields["oneOfEach"] < "6") || fields["includeOnly"] != "") {
            var taxonomicGroup = shelljs.exec(`echo ${taxid} | ./taxonkit${process.platform == "win32" ? ".exe" : ""} reformat -I 1 --data-dir "../.taxonkit"`);
            var allTaxGroups = taxonomicGroup.stdout.slice(0, taxonomicGroup.stdout.length - 1).toLowerCase().split("\t")[1].split(";");
            taxonomicGroup = taxonomicGroup.stdout.slice(0, taxonomicGroup.stdout.length - 1).toLowerCase().split("\t")[1].split(";")[fields["oneOfEach"]];
            if((!fields["useOneOfEach"] || !taxonGroups.includes(taxonomicGroup)) && (fields["includeOnly"] == "" || allTaxGroups.includes(fields["includeOnly"]))) {
              taxids.push(taxid);
              coverages.push(coverage);
              identities.push(identity);
              accesions.push(lineFields[4]);
              taxonGroups.push(taxonomicGroup);
            }
          } else if(fields["useOneOfEach"] && fields["oneOfEach"] == "6") {
            if(!taxids.includes(taxid)) {
              taxids.push(taxid);
              coverages.push(coverage);
              identities.push(identity);
              accesions.push(lineFields[4]);
              taxonGroups.push(taxonomicGroup);
            }
          } else {
            taxids.push(taxid);
            coverages.push(coverage);
            identities.push(identity);
            accesions.push(lineFields[4]);
            taxonGroups.push(taxonomicGroup);
          }
        } else {
          failures++;
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
      var writtenGenomas = 0;
      var isFirst = true;
      for(var j = 0; (j < paths.length) && (writtenGenomas < parseInt(fields["contextsQuantity"])); j++) {
        if(paths[j].length) {
          res.write((isFirst? ``: `, `) + `{ "type": "midAccesion", "fileName": ${JSON.stringify(paths[j])}, "midLocus": "${accesions[j]}", "upStream": "5", "downStream": "5", "taxid": "${taxids[j]}", "identity": "${identities[j]}", "coverage": "${coverages[j]}"${error ? ", error: " + error : ""}}`);
          writtenGenomas++;
          isFirst = false;
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
  } catch (ex) {
    console.log(ex);
    res.writeHead(400,{'Content-Type':'text/html'});
    res.write(`<html lang="en">
      <body>
        <h1> Error </h1> <p> ha habido un error desconocido. Por favor contactar a los desarrolladores. </p>
      </body>`
    );
    res.end();
    return;
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
