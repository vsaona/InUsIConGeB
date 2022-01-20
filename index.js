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
import http from 'http';

const PORT = 3030;

function getGenome(type, identifier, beggining, ending, retries=2000) {
  if(type == "accession" && identifier.match(/^\s*[Gg][Cc]([Aa]|[Ff])_.*/)) {
    type = "assembly";
  }
  var query = "";
  switch(type) {
    case "assembly":
      query = `query { getGenomebyAssembly(assembly_accession: "${identifier}",
          locus_start: "${beggining}", locus_end: "${ending}")`;
      break;
    case "accession":
      query = `query { getGenomebyAccession(accession: "${identifier}",
          locus_start: "${beggining}", locus_end: "${ending}")`;
      break;
    case "locus":
      query = `query { getGenomebyLocus(locus_tag: "${identifier}",
          lower_limit: ${beggining}, upper_limit: ${ending})`;
      break;
  }
  var data = new TextEncoder().encode(
    JSON.stringify({
      "query": query + `
      { _id definition
        assembly_info{taxid specie submitter ftp_rpt}
        biosample_info{title organism organization publication_date}
        bioproject_info{organism_name submitter}
      features{ location key mobile_element_type locus_tag gene product translation genome_accession } }}`
    })
  );
  var promise = new Promise((resolve, reject) => {
    var graphReq = http.request({
      hostname: 'localhost',
      port: 4002,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, res => {
      console.log(`statusCode: ${res.statusCode}`);
      res.on('data', d => {
        d = JSON.parse(d);
        if(d.data && (d.data.getGenomebyAssembly || d.data.getGenomebyAccession || d.data.getGenomebyLocus)) {
          resolve(d.data.getGenomebyAssembly || d.data.getGenomebyAccession || d.data.getGenomebyLocus);
        } else if(retries && d.errors && d.errors[0] && d.errors[0].message && (d.errors[0].message == "Genome not found in db but being processed" || d.errors[0].message == "Genome is being processed")) {
          console.log("getting: " + identifier + ", retries left: " + retries + " minutes: " + (new Date().getHours()) + ":" + (new Date().getMinutes())); // --retries
          setTimeout(function(){
            getGenome(type, identifier, beggining, ending, --retries).then( (answer) => {
              resolve(answer);}).catch( (error) => { reject(error)
            });
          }, 1000);
          //resolve( d.errors);//getGenome(type, identifier, beggining, ending, retries--));
        } else {
          console.log(d);
          if(d.errors && d.errors[0] && d.errors[0].message) {
            reject(d.errors[0].message);
          } else {
            reject("Couldn't get the genome for unknown reasons");
          }
        }
      })
    })
    graphReq.on('error', error => {
      console.log("GraphQl error type 1");
      reject(error);
    });
    
    graphReq.write(data);
    graphReq.end();
  });
  return(promise);

}

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
        } else if(gene.product == "hypothetical protein") {
          colors.push({names: [gene.name, gene.product],
            count: 1,
            color: "#C7C7C7"});
        }else {
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

function serveHome(req, res, next) {
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
                      <script>window.tutorial = true;</script>`);
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
}
app.get("/", serveHome);

app.use(express.static(path.join(process.cwd(), 'public')));

// Esta es la funcion original, responde correctamente a las vistas de Node.
app.post('/fileUploadAndRender', function(req, res, next) {
  try {
    console.log("DEBUG: POST FUNCTION /fileUpload");
    var form = new formidable.IncomingForm();
    form.uploadDir = "./data";
    form.parse(req, function (err, fields, files){
      if(err) return; // throw err;
      console.log("[fileUploadAndRender] form fields");
      console.log(fields);
      res.writeHead(200,{'Content-Type':'text/html'});
      res.write(`<html lang="en">
      <head>
        <meta charset="UTF-8">`);
      res.write("<script> ");
      res.write("window.contextSources = [");
      console.log("[fileUploadAndRender] fields[amountOfContexts]");
      console.log(fields["amountOfContexts"]);
      for(var j = 0; j < fields["amountOfContexts"]; j++) {
        fields["desde"+j] = fields["desde"+j] || "";
        fields["hasta"+j] = fields["hasta"+j] || "";
        fields["contextoAntes"+j] = fields["contextoAntes"+j] || "5";
        fields["contextoDespues"+j] = fields["contextoDespues"+j] || "5";
        if(fields["genomaSourceType" + j] == "file" && files["file" + j].size) {
          var oldpath = files["file" + j].path;
          var newpath = './data/' + files["file" + j].name + Date.now();
          fs.renameSync(oldpath, newpath);
          res.write((j? `, `: ``) + `{ "type": "file", "fileName": "${newpath}", "locusBegin": "${fields["desde"+j].toUpperCase()}", "locusEnd": "${fields["hasta"+j].toUpperCase()}"}`);    // Todo lo que se necesita saber del formulario
        } else if(fields["genomaSourceType" + j] == "locus" && fields["locus"+j]) {
          res.write((j? `, `: ``) + `{ "type": "locus", "locusTag": "${fields["locus"+j].toUpperCase()}", "genesBefore": "${fields["contextoAntes"+j]}", "genesAfter": "${fields["contextoDespues"+j]}"}`);
        } else if(fields["genomaSourceType" + j] == "accesion" && fields["accesion"+j]) {
          res.write((j? `, `: ``) + `{ "type": "accesion", "accesion": "${fields["accesion"+j].toUpperCase()}", "locusBegin": "${fields["desde"+j].toUpperCase()}", "locusEnd": "${fields["hasta"+j].toUpperCase()}"}`);
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
    console.log("Unknown error");
    console.log(ex);
    res.write("Oops! There's been an unknown error. Please contact the developers.")
  }
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
      if(contextSources[j]["type"] == "accession" || contextSources[j]["type"] == "file") {
        var isRegionSpecified = contextSources[j]["locusBegin"].match(/^\d/) || contextSources[j]["locusEnd"].match(/^\d/);
      }
      if(contextSources[j]["type"] == "accesion" && !isRegionSpecified) {

        getGenome("accession", contextSources[j]["accesion"], contextSources[j]["locusBegin"], contextSources[j]["locusEnd"]).then( (data) => {

          // Here we will merge features that refer to the same gene. Example: gene and CDS
          var realFeatures = [data.features[0]];
          var j = 0;
          for(var i = 0; i < data.features.length; i++) {
            if(realFeatures[j].location == data.features[i].location) {
              realFeatures[j] = {...(realFeatures[j]), ...(data.features[i])};
            } else {
              realFeatures.push(data.features[i]);
              j++;
            }
            realFeatures[j].name = realFeatures[j].gene || realFeatures[j].locus_tag;
          }

          var name; var definition; var submitter; var ftp_path; var taxid;
          if(data.assembly_info) {
            name = data.assembly_info.specie;
            definition = data.definition;
            submitter = data.assembly_info.submitter;
            ftp_path = data.assembly_info.ftp_rpt;
            taxid = data.assembly_info.taxid || data.assembly_info.specieTaxId;
          }
          if(data.biosample_info) {
            name = name || data.biosample_info.title || data.biosample_info.organism;
            definition = definition || data.biosample_info.title;
            submitter = submitter || data.biosample_info.organization;
          }
          if(data.bioproject_info) {
            name = name || data.bioproject_info.organism_name;
            definition = definition || data.bioproject_info.organism_name;
            submitter = submitter || data.bioproject_info.submitter;
          }
          genomas.push({genes: realFeatures, name: name, definition: definition, accesion: data._id, ftpPath: ftp_path, taxid: taxid, submitter: submitter});
          if(genomas.length == contextSources.length) {
            res.json({genomas: assignColors(genomas), error: thereIsAnError});
          }
          //console.log(data);
        }).catch((error) => {
          console.log("There's been an error");
          console.log(error);
          res.json({error: error});
        });
      } else if(contextSources[j]["type"] == "accesion") {
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
      } else if(contextSources[j]["type"] == "locus") {
        getGenome("locus", contextSources[j]["locusTag"], contextSources[j]["genesBefore"], contextSources[j]["genesAfter"]).then( (data) => {

          // Here we will merge features that refer to the same gene. Example: gene and CDS
          var realFeatures = [data.features[0]];
          var j = 0;
          for(var i = 0; i < data.features.length; i++) {
            if(realFeatures[j].location == data.features[i].location) {
              realFeatures[j] = {...(realFeatures[j]), ...(data.features[i])};
            } else {
              realFeatures.push(data.features[i]);
              j++;
            }
            realFeatures[j].name = realFeatures[j].gene || realFeatures[j].locus_tag;
          }

          var name; var definition; var submitter; var ftp_path; var taxid;
          if(data.assembly_info) {
            name = data.assembly_info.specie;
            definition = data.definition;
            submitter = data.assembly_info.submitter;
            ftp_path = data.assembly_info.ftp_rpt;
            taxid = data.assembly_info.taxid || data.assembly_info.specieTaxId;
          }
          if(data.biosample_info) {
            name = name || data.biosample_info.title || data.biosample_info.organism;
            definition = definition || data.biosample_info.title;
            submitter = submitter || data.biosample_info.organization;
          }
          if(data.bioproject_info) {
            name = name || data.bioproject_info.organism_name;
            definition = definition || data.bioproject_info.organism_name;
            submitter = submitter || data.bioproject_info.submitter;
          }
          genomas.push({genes: realFeatures, name: name, definition: definition, accesion: data._id, ftpPath: ftp_path, taxid: taxid, submitter: submitter});
          if(genomas.length == contextSources.length) {
            res.json({genomas: assignColors(genomas), error: thereIsAnError});
          }
          //console.log(data);
        }).catch((error) => {
          console.log("There's been an error");
          console.log(error);
          res.json({error: error});
        });
      }
      if(contextSources[j]["type"] == "file" || isRegionSpecified) {

        var contents = "";
        var line;
        console.log("[processFile] contextSources");
        console.log(contextSources);
      
        var interestGenes = false;
        var lastGene = false;
        var postLastGene = false;
        liner = new readlines(contextSources[j]["fileName"]);
        var fileName = contextSources[j]["fileName"].split("/")[contextSources[j]["fileName"].split("/").length - 1];
        genomaName = fileName.split(".").slice(0, fileName.split(".").length - 1).join('');
        
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
            
            if(!interestGenes) {
              contents = contents + line + "\n";
              if(contextSources[j]["locusBegin"] && line.includes(contextSources[j]["locusBegin"])) {
                interestGenes = true;
              } else if(!contextSources[j]["locusBegin"] && line.match(/^..\s{3}\w+\s{2}/)) {
                if(!line.match(/^..\s{3}(source\s{10}|region\s{10}|protocluster\s{3}|proto_core\s{5}|cand_cluster\s{3}|Misc\s{11})/)) {
                  contents = line + "\n";
                  interestGenes = true;
                }
              } else if(line.match(/^..\s{3}\w+\s{2}.*\d+\.\./)){
                contents = line + "\n";
              }
            } else {
              if(contextSources[j]["locusEnd"] && line.includes(contextSources[j]["locusEnd"])) {
                contents = contents + line + "\n";
                lastGene = true;
              } else if(lastGene && (line.match(/^..\s{3}\w+\s{2}/) || line.match(/^..[^\s]/))) {
                
                if(line.match(/^..\s{3}\w+\s{2}/) && !contents.includes(line.substring(20))){
                  break;
                }
                contents = contents + line + "\n";
              } else if(line.match(/^..[^\s]/) || line.match(/^\/\//)) {
                break;
              } else {
                contents = contents + line + "\n";
              }
            }
          } else {
            var featureDefinition = line.match(/^..\s{3}\w+\s{2}.*?(\d+)\.\.(?:\d+\s,\s\d+\.\.)?(\d+)/);
            if(!interestGenes) {
              if(featureDefinition) {
                if(parseInt(featureDefinition[1]) >= contextSources[j]["locusBegin"]) {
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
                //console.log(lastJson);
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
    }
    if(thereIsAnError) {
      if(genomas.length == contextSources.length) {
        res.json({genomas: assignColors(genomas), error: thereIsAnError});
      }
    }
    else {
      if(genomas.length == contextSources.length) {
        res.json({genomas: assignColors(genomas)});
      }
    }
  } catch (ex) {
    console.error(ex);
    res.json({error: "Ha habido un error desconocido. Favor contactar a los desarrolladores."});
  }
});

app.post('/searchAndDraw', function(req, res, next) {
  var form = new formidable.IncomingForm();
  console.log("[searchAndDraw] request received.");
  form.uploadDir = "./data"
  form.parse(req, function (err, fields, files){
    var child = child_process.fork('searchAndDraw.js');
    // So we can see the console logs // console.log("");
    child.on('message', function(message) {
      console.log('[parent] received message from child:', message);
      if(message.ready) {
        child.send({fields: fields, files: files});
      } else if(message.error) {
        res.writeHead(message.errorCode,{'Content-Type':'text/html'});
        res.write(`<html lang="en"> <head><meta charset="UTF-8"></head>
          <body><h2>Error</h2>
          <p> ${message.errorMessage}</p>`
        );
        res.end();
      } else {
        res.writeHead(200,{'Content-Type':'text/html'});
        res.write(`<html lang="en">
        <head>
          <meta charset="UTF-8">`);
        res.write("<script> ");
        res.write("window.genomas = ");
        res.write(JSON.stringify(message.genomas));
        fs.readFile('./public/fullRender.html', null, function(error,data) {
          res.write("; </script>");
          if(error){
            res.write('Oops! Looks like something is wrong. Please try again!');
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
app.use(serveHome);
app.listen(PORT, function () {
  console.log('Listening on port ' + PORT);
});
