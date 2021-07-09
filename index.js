import express from "express"; //var express = require('express');
var app = express();
import fs from "fs"; //"var fs = require('fs');
import path from "path";
import formidable from "formidable";
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";

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

download_gbff(fileName) {
  try {
    if (!fs.existsSync(fileName)) {
      console.log("[ProcessFile] Downloading " + fileName);
      console.log(`wget -r -l 0 https://${fileName.substring(9)}.gz -O ${fileName}.gz`);
      process.chdir('../blast');
      console.log(shelljs.exec(`wget -r -l 0 https://${fileName.substring(9)}.gz`).stdout);
      console.log(shelljs.exec(`gzip --decompress --force ${fileName}.gz`).stdout);
      process.chdir('../InUsIConGeB');
    }
  } catch(err) {
    console.error(err);
    continue;
  }
}

app.use('/favicon.ico', express.static('public/images/favicon.png'));

// create application/json parser
app.use(express.json({ limit: 1000000 }));
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
        
        download_gbff(fileName);
        
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
      download_gbff(contextSources[j]["fileName"]);
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
    /*console.log("\n\n\nContents:");
    console.log(contents);
    console.log("Contents end\n\n\n");*/
    if(contents.match(/$\s+^/)) {
      res.json({"Error": `Error con ${genomaName}: No se han encontrado los locus tag especificados.`})
    }
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
  res.json({genomas: assignColors(genomas)});
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
    console.log("BLAST command")
    console.log("blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 8");
    shelljs.exec("blastp -db ../blast/refseq_protein/refseq_protein.00 -query " + query + " -out " + outFileName + " -outfmt \"6 staxid qcovs pident sacc\" -num_threads 8");
    shelljs.exec("rm blast_inputs/" + identifier + ".fas");

    var liner = new readlines(outFileName);
    var line;
    var taxids = []; var coverages = []; var identities = []; var paths = []; var accesions = []; var taxonGroups = [];
    var failures = 0;
    while ((line = liner.next()) && (identities.length < parseInt(fields["contextsQuantity"]) * 1.5) && (failures < 3)) {
      line = line.toString("UTF-8");
      console.log("[searchHomologous] Reading blast result line:");
      console.log(line);
      var lineFields = line.match(/(\d+)\t(\d+)\t((?:\d|\.)+)\t(.*)/);
      var taxid = lineFields[1];
      var coverage = parseFloat(lineFields[2]);
      var identity = parseFloat(lineFields[3]);
      if(coverage >= fields["minCoverage"] && identity >= fields["minIdentity"]) {
        if(parseInt(fields["oneOfEach"]) < 6 || fields["includeOnly"] != "") {
          var taxonomicGroup = shelljs.exec(`echo ${taxid} | taxonkit${process.platform == "win32" ? ".exe" : ""} reformat -I 1 --data-dir "../.taxonkit"`);
          var allTaxGroups = taxonomicGroup.stdout.slice(0, taxonomicGroup.stdout.length - 1).split("\t")[1].split(";");
          taxonomicGroup = taxonomicGroup.stdout.slice(0, taxonomicGroup.stdout.length - 1).split("\t")[1].split(";")[fields["oneOfEach"]];
          if(!taxonGroups.includes(taxonomicGroup) && (fields["includeOnly"] == "" || allTaxGroups.includes(fields["includeOnly"]))) {
            taxids.push(taxid);
            coverages.push(coverage);
            identities.push(identity);
            accesions.push(lineFields[4]);
            taxonGroups.push(taxonomicGroup);
          }
        } else if(fields["oneOfEach"] == "6") {
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
        res.write((isFirst? ``: `, `) + `{ "type": "midAccesion", "fileName": ${JSON.stringify(paths[j])}, "midLocus": "${accesions[j]}", "upStream": "5", "downStream": "5", "taxid": "${taxids[j]}", "identity": "${identities[j]}", "coverage": "${coverages[j]}"}`);
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
    console.log("Updating!");
    console.log(shelljs.exec("rm -f data/*").stdout);
    console.log(shelljs.exec("rm -f blast_outputs/*").stdout);
    console.log(shelljs.exec("rm -f blast_inputs/*").stdout);
    console.log(shelljs.exec("rm -r -f ../blasy/ftp.ncbi.nlm.nih.gov/*").stdout);
  }
  res.end();
});
app.listen(PORT, function () {
  console.log('Listening on port ' + PORT);
});