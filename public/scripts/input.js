function changeTab(activeTabIndex) {
    for(let tabContent of document.getElementsByClassName("tabContent")) {
        if(tabContent.id == "tab" + activeTabIndex) {
            tabContent.classList.remove("invisible");
        } else {
            tabContent.classList.add("invisible");
        }
    }
    // This is for solving textField positioning bug
    var textFields = document.getElementsByTagName("mwc-textfield");
    for(var i = textFields.length - 1; i > -1; i--) {
        textFields[i].focus();
        textFields[i].blur();
    }
}

var addedInputGenomaisEven = true;
var genomas = 1;
function addGenoma() {
    var clone = newGenomaData(genomas);
    var hr = document.createElement("div");
    hr.classList.add("hr");
    hr.innerHTML = `<hr>Context ` + (genomas + 1);
    if(addedInputGenomaisEven) {
        clone.classList.add("mdc-theme--secondary-bg");
        hr.classList.add("mdc-theme--secondary-bg");
    }
    addedInputGenomaisEven = !addedInputGenomaisEven;
    document.getElementById("genomaList").appendChild(hr);
    document.getElementById("genomaList").appendChild(clone);
    genomas++;
    
    [...clone.getElementsByTagName("mwc-textfield")].forEach(element => {
       element.layout(); 
    });
}

function changeGenomaSource(value, id) {
    if(!value) return;
    var element;
    if(id != 'SearchSource') {
        element = document.getElementById("genomaList").getElementsByClassName("genomaData")[id];
    } else {
        element = document.getElementById("genomaSearchData");
        var extraDataSpace = document.getElementById("querySpecificationExtraInput");
        extraDataSpace.style.width = "300px";
        if(value == "fasta") {
            extraDataSpace.style.width = "0px";
        }
    }
    for(let el of element.children[0].children) {
        if(el.classList.contains("genomaSpec")) {
            el.classList.add("invisible");
            if(el.classList.contains(value)) {
                el.classList.remove("invisible");
            }
        }
    }
    for(let el of element.getElementsByClassName("extraInput")[0].children) {
        el.classList.add("invisible");
        if((value == "file" || value == "accesion") && el.classList.contains("genomaBoundaries")) {
            el.classList.remove("invisible");
        } else if(value == "locus" && el.classList.contains("genomaContext")) {
            el.classList.remove("invisible");
        }
    }
    var textFields = element.getElementsByTagName("mwc-textfield");
    for(var i = 0; i < textFields.length; i++) {
        textFields[i].focus();
        textFields[i].blur();
    }
}

function selectFile(id) {
    document.getElementById('fileSelectButton' + id).click();
}
function updateFileName(value, id) {
    var path = value.split('\\');
    document.getElementById('fileName' + id).innerText = path[path.length - 1];
}

// drag-and-drop functionality
function preventDefaults (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  function highlight(e) {
    for(let i = 0; i < e.path.length; i++) {
      if(e.path[i].classList && e.path[i].classList.contains("genomaData")) {
        if(!e.path[i].classList.contains("highlight")) {
          e.path[i].classList.add("highlight");
        }
        break;
      }
    }
  }
  function unhighlight(e) {
    for(let i = 0; i < e.path.length; i++) {
      if(e.path[i].classList && e.path[i].classList.contains("genomaData")) {
        if(e.path[i].classList.contains("highlight")) {
          e.path[i].classList.remove("highlight");
        }
        break;
      }
    }
  }

  function handleDrop(e) {
    for(let i = 0; i < e.path.length; i++) {
      if(e.path[i].classList && e.path[i].classList.contains("genomaData")) {
        e.path[i].getElementsByClassName("genomaSourceType")[0].value = "file";
        e.path[i].getElementsByClassName("genomaSourceType")[0].onchange();
        e.path[i].getElementsByClassName("form-control-file")[0].files = e.dataTransfer.files;
        e.path[i].getElementsByClassName("form-control-file")[0].onchange();
        break;
      }
    }
  }
