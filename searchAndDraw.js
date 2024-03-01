import fs from "fs"; //"var fs = require('fs');
import colorsys from "colorsys";
import shelljs from "shelljs";
import readlines from "n-readlines";
import axios from "axios";
import Buffer from "buffer";
import zlib from "zlib";

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
            color: "#BD3B32" // "#D60019" corresponde al rojo de la marca USM
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



async function getBlastAnswer(apiUrl, getParamsString, config) {
  axios.put(apiUrl, getParamsString, config).then(response => {
    return new Promise(function(resolve, reject) {
      console.log("\n\n\nresponse.data");
      console.log(response.data);

      console.log("\n\n\ndecompressed response.data");
      var responseData = zlib.inflate(Buffer.Buffer.from(response.data), (error, result) => {
        console.log("decompressed result")
        console.log(result);
      });

      console.log(responseData);
      let results = JSON.parse(responseData);
      console.log("results");
      console.log(results);
      if(results) {
        
        resolve(promise);

        process.send({
          genomas  : assignColors(results),
          errorMessage: thereIsAnError
        });
        process.disconnect();
      } else {
        setTimeout( () => {getBlastAnswer(apiUrl, getParamsString, config);}, 30_000);
      }
    });
  }).catch(error => {
    console.error('Error:', error.message);
  });
}

function searchAndDraw(fields, files)
{
  try {
    console.log("function begins!");
    var filePath;
    var identifier = Date.now() + Math.random();
    var thereIsAnError;
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
            thereIsAnError = thereIsAnError + `There's been an error downloading ${thisFtpPath}, so you will probably see one context less. Please try again later.`// `Ha habido un error al descargar desde ${thisFtpPath}. Esto puede hacer que no se vea uno de los contextos encontrados. Por favor inténtelo de nuevo más tarde`
          }
          break;
        }
      }
      try {
        liner.close();
      } catch {
        process.send({
          error  : ex,
          errorCode: 400,
          errorMessage : "The specified assembly accession number is not part of GenBank assemblies."
        });
        process.disconnect();
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
        if(line.includes(fields["searchFileLocusTag"].toUpperCase())) {
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
      var fastaLines = fields["fastaSearchSource"].split(/\r\n|\n\r|\n|\r/);
      for(var fastaLineIndex = 0; fastaLineIndex < fastaLines.length; fastaLineIndex++) {
        if(!fastaLines[fastaLineIndex].match(/$\>/)) {
          fastaSequence = fastaSequence + fastaLines[fastaLineIndex] + "\n";
        }
      }
    }
    
    var query = "blast_inputs/" + identifier + ".fas";
    fs.writeFileSync(query, ">" + identifier + "\n" + fastaSequence);

    /*// Search homologous
    var outFileName = "blast_outputs/results_" + identifier + ".out";
    console.log("BLAST command")
    var db = fields["databaseToSearch"];
    console.log(`../blastPlus/ncbi-blast-2.12.0+/bin/blastp -db ../blast/${db}/${db} -query ${query} -out ${outFileName} -outfmt "6 staxid qcovs pident sacc" -num_threads 24`);
    shelljs.exec(`blastp -db ../blast/${db}/${db} -query ${query} -out ${outFileName} -outfmt "6 staxid qcovs pident sacc" -num_threads 24`);
    // shelljs.exec(`../blastPlus/ncbi-blast-2.12.0+/bin/blastp -db ../blast/${db}/${db} -query ${query} -out ${outFileName} -outfmt "6 staxid qcovs pident sacc" -num_threads 24`);
    shelljs.exec("rm blast_inputs/" + identifier + ".fas");
*/

    // Search homologous using NCBI web API

    const apiUrl = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi';
    const params = {
      path: '/blast/Blast.cgi',
      method: 'PUT',
      CMD: 'PUT',
      QUERY: "MTALTESSTSKFVKINEKGFSDFNIHYNEAGNGETVIMLHGGGPGAGGWSNYYRNVGPFVDAGYRVILKDSPGFNKSDAVVMDEQRGLVNARAVKGLMDALDIDRAHLVGNSMGGATALNFALEYPDRIGKLILMGPGGLGPSMFAPMPMEGIKLLFKLYAEPSYETLKQMLQVFLYDQSLITEELLQGRWEAIQRQPEHLKNFLISAQKAPLSTWDVTARLGEIKAKTFITWGRDDRFVPLDHGLKLLWNIDDARLHVFSKCGHWAQWEHADEFNRLVIDFLRHA",
      DATABASE:"refseq_protein",
      PROGRAM:"blastp"
    };

    const paramsString = new URLSearchParams(params).toString();

    // Configuring the axios request
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    console.log("axios put");
    axios.put(apiUrl, paramsString, config).then(response => {
      //console.log(response.data);
      let RID = response.data.match(/name\s*=\s*["']RID["']\s*value\s*=\s*["']([\w\d]+)["']/);
      console.log(RID);
      if(!RID || response.status != 200) {
        process.send({
          error  : "",
          errorCode: 400,
          errorMessage : "Blast query was not accepted by NCBI API."
        });
        process.disconnect();
        return;
      }
      RID = RID[1];
      const getParams = {
        path: '/blast/Blast.cgi',
        method: 'GET',
        CMD: 'GET',
        FORMAT_TYPE: "JSON2",
        HITLIST_SIZE: 10,
        NCBI_GI: "T",
        RID: "V2ZTJC69016",//RID,
        FORMAT_OBJECT: "Alignment"
      };
      const getParamsString = new URLSearchParams(getParams).toString();
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };
      getBlastAnswer(apiUrl, getParamsString, config);

      

      /*
      var liner = new readlines(outFileName);
    var line;
    var failures = 0;
    fields["includeOnly"] = fields["useIncludeOnly"] === "true" ? fields["includeOnly"].toLowerCase() : "";
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
            failures = 0;
          }
        } else if(fields["useOneOfEach"] && fields["oneOfEach"] == "6") {
          if(!taxids.includes(taxid)) {
            taxids.push(taxid);
            coverages.push(coverage);
            identities.push(identity);
            accesions.push(lineFields[4]);
            taxonGroups.push(taxonomicGroup);
            failures = 0;
          }
        } else {
          taxids.push(taxid);
          coverages.push(coverage);
          identities.push(identity);
          accesions.push(lineFields[4]);
          taxonGroups.push(taxonomicGroup);
          failures = 0;
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

    var contextSources = [];
    var writtenGenomas = 0;
    for(var j = 0; (j < paths.length) && (writtenGenomas < parseInt(fields["contextsQuantity"])); j++) {
      if(paths[j].length) {
        contextSources.push({fileName: paths[j], midLocus: accesions[j], upStream: 5, downStream: 5, taxid: taxids[j], identity: identities[j], coverage: coverages[j]});
        writtenGenomas++;
      }
    }

    // Aqui va el resto del draw
    var UPSTREAMCONTEXTAMOUNT = 5;
    var DOWNSTREAMCONTEXTAMOUNT = 5;
    var genomas = [];
    for(var j = 0; j < contextSources.length; j++) {
      var thisFtpPath; var thisTaxid; var thisSubmitter;
      var liner;
      var genomaName; var genomaDefinition = null ; var genomaAccession = null;
      
      var contents = "";
      var line;
      console.log("[processFile] contextSources");
      console.log(contextSources);
      for(var file = 0; file < contextSources[j]["fileName"].length; file++) {

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

      genomaDefinition = genomaDefinition ?? genomaName;
      genomaAccession = genomaAccession ?? "";
      var array = contents.split(/\s{5}gene\u0020{10}/g);//\u0020 -> caracter espacio
      var genes = [];

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
          if(array[i].match(/\s*tRNA\s{3,}/)) {
            json["name"] = json["product"];
          } else if (array[i].match(/\s*rRNA\s{3,}/)) {
            if(json["product"].match(/.* ribosomal RNA/)) {
              json["name"] = json["product"].replace("ribosomal RNA", "RNA");
            } else {
              json["name"] = "rRNA"
            }
          }
          if(array[i].includes(contextSources[j]["midLocus"])) {
            json["interest"] = true;
            json["identity"] = contextSources[j].identity;
            json["coverage"] = contextSources[j].coverage;
            console.log("[processFile] Marking this locus as interest gene:");
            console.log(json["locus"]);
          } else {
            json["interest"] = false;
          }
          lastJson = json;
        }
      }
      genes.push(lastJson);
      genomas.push({genes: genes, name: genomaName, definition: genomaDefinition, accesion: genomaAccession, ftpPath: thisFtpPath, taxid: thisTaxid, submitter: thisSubmitter});
    }
    
      */



    }).catch(error => {
      console.error('Error:', error.message);
    });
  } catch (ex) {
    console.log(ex);
    process.send({
      error  : ex,
      errorCode: 500,
      errorMessage : "Ha habido un error desconocido. Por favor contactar a los desarrolladores."
    });
    process.disconnect();
  }
}

process.on("message", function(message) {
  searchAndDraw(message.fields, message.files);
});

process.send({ready: "yes"});