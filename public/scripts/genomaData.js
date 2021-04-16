function newGenomaData(id) {
    var genomaData = document.createElement("div");
    genomaData.classList.add("genomaData");
    genomaData.id = "genomaData" + id;

    var genomaSource = document.createElement("div");
    genomaSource.id = "genomaSource0";

    var genomaSourceType = document.createElement("mwc-select");
    genomaSourceType.outlined = true;
    genomaSourceType.label = "Genoma " + (id + 1);
    genomaSourceType.id = "GenomaSourceType" + id;
    genomaSourceType.onchange = (function() {
        changeGenomaSource(genomaSourceType.value, id);
    });

    var sourceFile = document.createElement("mwc-list-item");
    sourceFile.value = "file";
    sourceFile.innerText = "Desde archivo";
    var sourceGi = document.createElement("mwc-list-item");
    sourceGi.value = "gi";
    sourceGi.innerText = "gi";
    var sourceAccesion = document.createElement("mwc-list-item");
    sourceAccesion.value = "accesion";
    sourceAccesion.innerText = "Número de acceso";
    var sourceFasta = document.createElement("mwc-list-item");
    sourceFasta.value = "fasta";
    sourceFasta.innerText = "secuencia fasta";

    genomaSourceType.appendChild(sourceFile);
    genomaSourceType.appendChild(sourceGi);
    genomaSourceType.appendChild(sourceAccesion);
    genomaSourceType.appendChild(sourceFasta);

    genomaSource.appendChild(genomaSourceType);
    genomaSource.appendChild(document.createElement("br"));

    var fileSpan = document.createElement("span");
    fileSpan.id = "file0";
    fileSpan.classList.add("genomaSpec");
    fileSpan.classList.add("file");
    fileSpan.classList.add("invisible");
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.classList.add("form-control-file");
    fileInput.name = "file" + id;
    fileSpan.appendChild(fileInput);
    genomaSource.appendChild(fileSpan);

    var giDef = document.createElement("mwc-textfield");
    giDef.outlined = true;
    giDef.id = "gi" + id;
    giDef.label = "gi";
    giDef.classList.add("genomaSpec");
    giDef.classList.add("gi");
    giDef.classList.add("invisible");
    genomaSource.appendChild(giDef);

    var accesionDef = document.createElement("mwc-textfield");
    accesionDef.outlined = true;
    accesionDef.id = "accesion" + id;
    accesionDef.label = "número de acceso";
    accesionDef.classList.add("genomaSpec");
    accesionDef.classList.add("accesion");
    accesionDef.classList.add("invisible");
    genomaSource.appendChild(accesionDef);

    /*
        // No se debería poder especificar más de un fasta, pero lo dejo aca por si acaso.
        var fastaDef = document.createElement("mwc-textarea");
        fastaDef.outlined = true;
        fastaDef.id = "fasta" + id;
        fastaDef.label = "secuencia fasta";
        fastaDef.classList.add("genomaSpec");
        fastaDef.classList.add("fasta");
        fastaDef.classList.add("invisible");
        genomaSource.appendChild(fastaDef);
    */

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
    desde.type = "number";
    desde.id = "desde" + id;
    genomaBoundaries.appendChild(desde);
    var hasta = document.createElement("mwc-textfield");
    hasta.outlined = true;
    hasta.label = "Hasta";
    hasta.type = "number";
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
                  type = "number"
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
                  type = "number"
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