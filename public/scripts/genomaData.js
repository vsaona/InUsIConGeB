amountOfContexts = 1;
function newGenomaData(id) {
  amountOfContexts++;
  var genomaData = document.createElement("div");
  genomaData.classList.add("genomaData");
  genomaData.id = "genomaData" + id;

  var genomaSource = document.createElement("div");
  genomaSource.id = "genomaSource" + id;

  var genomaSourceType = document.createElement("mwc-select");
  genomaSourceType.outlined = true;
  genomaSourceType.label = "Source";
  genomaSourceType.id = "genomaSourceType" + id;
  genomaSourceType.classList.add("formData");
  genomaSourceType.onchange = (function() {
      changeGenomaSource(genomaSourceType.value, id);
  });

  var sourceFile = document.createElement("mwc-list-item");
  sourceFile.value = "file";
  sourceFile.innerText = "From file";
  var sourceLocus = document.createElement("mwc-list-item");
  sourceLocus.value = "locus";
  sourceLocus.innerText = "locus tag";
  var sourceAccesion = document.createElement("mwc-list-item");
  sourceAccesion.value = "accesion";
  sourceAccesion.innerText = "Accession number";
  var sourceFasta = document.createElement("mwc-list-item");
  sourceFasta.value = "fasta";
  sourceFasta.innerText = "secuencia fasta";

  genomaSourceType.appendChild(sourceFile);
  genomaSourceType.appendChild(sourceLocus);
  genomaSourceType.appendChild(sourceAccesion);
  //genomaSourceType.appendChild(sourceFasta);

  var helpGenomaSourceType = document.createElement("span");
  helpGenomaSourceType.classList.add("tooltip");
  helpGenomaSourceType.innerHTML = `<img src = 'images/help_outline_black_24dp.svg' style = 'width: 20px;'><span class = 'tooltiptext'>
              Where to get the context from. It may be from a GenBank flat file (.gbff), specifying locus tag or accession number, so whe can get it from the database.
            </span>`;

  genomaSource.appendChild(genomaSourceType);
  genomaSource.appendChild(helpGenomaSourceType);
  genomaSource.appendChild(document.createElement("br"));

  var fileSpan = document.createElement("span");
  fileSpan.id = "file0";
  fileSpan.classList.add("genomaSpec");
  fileSpan.classList.add("file");
  fileSpan.classList.add("invisible");

  fileSpan.innerHTML = `
            <div>
              <input id = "fileSelectButton`+id+`" onChange = "updateFileName(this.value, `+id+`)" type="file" class="form-control-file" name="file`+id+`">
            </div>
            <mwc-button onclick = "selectFile(`+id+`)" label = "Browse file" outlined></mwc-button>
            <div id = "fileName`+id+`">No file selected</div>
  `;
  /*
  var fileInputDiv = document.createElement("div");
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.classList.add("form-control-file");
  fileInput.name = "file" + id;
  fileInput.id = "fileSelectButton" + id;
  fileInput.onChange = "updateFileName(this.value, " + id + ")";
  fileInputDiv.appendChild(fileInput);
  fileSpan.appendChild(fileInputDiv);

  var fileButton = document.createElement("mwc-button");
  fileButton.onclick = "selectFile(" + id + ")";
  console.log(id)
  fileButton.label = "Elegir archivo";
  fileButton.outlined = true;
  fileSpan.appendChild(fileButton);

  var fileNameDiv = document.createElement("div");
  fileNameDiv.id = "fileName" + id;
  fileNameDiv.innerText = "No file selected";
  fileSpan.appendChild(fileNameDiv);
  */
  genomaSource.appendChild(fileSpan);

  var locusDef = document.createElement("mwc-textfield");
  locusDef.outlined = true;
  locusDef.id = "locus" + id;
  locusDef.label = "Locus tag";
  locusDef.classList.add("genomaSpec");
  locusDef.classList.add("locus");
  locusDef.classList.add("invisible");
  locusDef.classList.add("formData");
  genomaSource.appendChild(locusDef);

  var accesionDef = document.createElement("mwc-textfield");
  accesionDef.outlined = true;
  accesionDef.id = "accesion" + id;
  accesionDef.label = "Accession number";
  accesionDef.classList.add("genomaSpec");
  accesionDef.classList.add("accesion");
  accesionDef.classList.add("invisible");
  accesionDef.classList.add("formData");
  genomaSource.appendChild(accesionDef);

  genomaData.appendChild(genomaSource);

  var extraInput = document.createElement("div");
  extraInput.classList.add("extraInput");
  extraInput.id = "extraInput" + id;

  var genomaBoundaries = document.createElement("div");
  genomaBoundaries.classList.add("genomaBoundaries");
  genomaBoundaries.classList.add("invisible");
  genomaBoundaries.id = "genomaBoundaries" + id;
  var desde = document.createElement("mwc-textfield");
  desde.outlined = true;
  desde.label = "From";
  desde.id = "desde" + id;
  desde.classList.add("formData");
  genomaBoundaries.appendChild(desde);
  var hasta = document.createElement("mwc-textfield");
  hasta.outlined = true;
  hasta.label = "To";
  hasta.id = "hasta" + id;
  hasta.classList.add("formData");
  genomaBoundaries.appendChild(hasta);

  var helpGenomaBoundaries = document.createElement("span");
  helpGenomaBoundaries.classList.add("tooltip");
  helpGenomaBoundaries.innerHTML = `<img src = 'images/help_outline_black_24dp.svg' style = 'width: 20px;'><span class = 'tooltiptext'>
    Which adjacent genes you wish to draw. Please specify the first and last locus tag to be included.
  </span>`;
  genomaBoundaries.appendChild(helpGenomaBoundaries);
  extraInput.appendChild(genomaBoundaries);

  var context = document.createElement("div");
  context.classList.add("genomaContext");
  context.classList.add("invisible");
  context.id = "genomaContext" + id;
  context.innerHTML =  `
    <div class = "row mwc-typography">
      Include
      <mwc-textfield
        outlined
        type = "number"
        value = "3"
        min = "0"
        id = "contextoAntes` + id + `"
        class = "formData">
      </mwc-textfield>
      genes before and
    </div>
    <div class = "row">
      <mwc-textfield
        outlined
        type = "number"
        value = "3"
        min = "0"
        id = "contextDespues` + id + `"
        class = "formData">
      </mwc-textfield>
      genes after
      <span class = 'tooltip'>
        <img src = 'images/help_outline_black_24dp.svg' style = 'width: 20px;'>
        <span class = 'tooltiptext'>
          Starting from the specified gene, how many more should be drawn upstream and downstream.
        </span>
      </span>
    </div>
  `
  extraInput.appendChild(context);
  genomaData.appendChild(extraInput);
  
  return(genomaData);
}