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
    for(var i = 0; i < textFields.length; i++) {
        textFields[i].focus();
        textFields[i].blur();
    }
}

var addedInputGenomaisEven = true;
var genomas = 1;
function addGenoma() {
    var clone = newGenomaData(genomas);
    if(addedInputGenomaisEven) {
        clone.classList.add("mdc-theme--secondary-bg");
    }
    addedInputGenomaisEven = !addedInputGenomaisEven;
    document.getElementById("genomaList").appendChild(clone);
    genomas++;
    clone.getElementsByTagName("mwc-textfield").layout();
}

function changeGenomaSource(value, id) {
    if(!value) return;
    var element;
    if(id != 'SearchSource') {
        element = document.getElementById("genomaList").children[id];
    } else {
        element = document.getElementById("genomaSearchData");
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
    var textFields = document.getElementsByTagName("mwc-textfield");
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
