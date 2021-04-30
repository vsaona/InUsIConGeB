function newGenomaData(id) {
    var genomaData = document.createElement("div");
    genomaData.classList.add("genomaData");
    genomaData.id = "genomaData" + id;

    var genomaSource = document.createElement("div");
    genomaSource.id = "genomaSource0";

    var genomaSourceType = document.createElement("mwc-select");
    genomaSourceType.outlined = true;
    genomaSourceType.label = "Contexto " + (id + 1);
    genomaSourceType.id = "GenomaSourceType" + id;
    genomaSourceType.onchange = (function() {
        changeGenomaSource(genomaSourceType.value, id);
    });

    var sourceFile = document.createElement("mwc-list-item");
    sourceFile.value = "file";
    sourceFile.innerText = "Desde archivo";
    var sourceLocus = document.createElement("mwc-list-item");
    sourceLocus.value = "locus";
    sourceLocus.innerText = "locus tag";
    var sourceAccesion = document.createElement("mwc-list-item");
    sourceAccesion.value = "accesion";
    sourceAccesion.innerText = "Número de acceso";
    var sourceFasta = document.createElement("mwc-list-item");
    sourceFasta.value = "fasta";
    sourceFasta.innerText = "secuencia fasta";

    genomaSourceType.appendChild(sourceFile);
    genomaSourceType.appendChild(sourceLocus);
    genomaSourceType.appendChild(sourceAccesion);
    //genomaSourceType.appendChild(sourceFasta);

    genomaSource.appendChild(genomaSourceType);
    genomaSource.appendChild(document.createElement("br"));

    var fileSpan = document.createElement("span");
    fileSpan.id = "file0";
    fileSpan.classList.add("genomaSpec");
    fileSpan.classList.add("file");
    fileSpan.classList.add("invisible");

    var fileInputDiv = document.createElement("div");
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.classList.add("form-control-file");
    fileInput.name = "file" + id;
    fileInputDiv.appendChild(fileInput);
    fileSpan.appendChild(fileInputDiv);

    var fileButton = document.createElement("mwc-button");
    fileButton.onclick = "selectFile('"+id+"')";
    fileButton.label = "Elegir archivo";
    fileButton.outlined = true;
    fileSpan.appendChild(fileButton);

    var fileNameDiv = document.createElement("div");
    fileNameDiv.id = "fileName" + id;
    fileNameDiv.innerText = "No file selected";
    fileSpan.appendChild(fileNameDiv);

    genomaSource.appendChild(fileSpan);

    var locusDef = document.createElement("mwc-textfield");
    locusDef.outlined = true;
    locusDef.id = "locus" + id;
    locusDef.label = "locus tag";
    locusDef.classList.add("genomaSpec");
    locusDef.classList.add("locus");
    locusDef.classList.add("invisible");
    genomaSource.appendChild(locusDef);

    var accesionDef = document.createElement("mwc-textfield");
    accesionDef.outlined = true;
    accesionDef.id = "accesion" + id;
    accesionDef.label = "número de acceso";
    accesionDef.classList.add("genomaSpec");
    accesionDef.classList.add("accesion");
    accesionDef.classList.add("invisible");
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
    desde.label = "Desde";
    desde.id = "desde" + id;
    genomaBoundaries.appendChild(desde);
    var hasta = document.createElement("mwc-textfield");
    hasta.outlined = true;
    hasta.label = "Hasta";
    hasta.id = "hasta" + id;
    genomaBoundaries.appendChild(hasta);
    extraInput.appendChild(genomaBoundaries);

    var context = document.createElement("div");
    context.classList.add("genomaContext");
    context.classList.add("invisible");
    context.id = "genomaContext" + id;
    context.innerHTML =  `
    <div class = "row mwc-typography">
                Incluir
                <mwc-textfield
                  outlined
                  label="genes"
                  id = "contextoAntes` + id + `"
                  min = "0">
                </mwc-textfield>
                antes
              </div>
              <div class = "row">
                y
                <mwc-textfield
                  outlined
                  label="genes"
                  id = "contextoDespues` + id + `"
                  min = "0">
                </mwc-textfield>
                después
              </div>
    `
    extraInput.appendChild(context);
    genomaData.appendChild(extraInput);
    
    return(genomaData);
}