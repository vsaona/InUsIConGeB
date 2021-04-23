function changeTab(activeTabIndex) {
    console.log(activeTabIndex);
    for(let tabContent of document.getElementsByClassName("tabContent")) {
        if(tabContent.id == "tab" + activeTabIndex) {
            tabContent.classList.remove("invisible");
        } else {
            tabContent.classList.add("invisible");
        }
    }
}

var addedInputGenomaisEven = true;
var genomas = 1;
function addGenoma() {
    var original = document.getElementById("genomaData0");
    var clone = newGenomaData(genomas);
    if(addedInputGenomaisEven) {
        clone.classList.add("mdc-theme--secondary-bg");
    }
    addedInputGenomaisEven = !addedInputGenomaisEven;
    document.getElementById("genomaList").appendChild(clone);
    genomas++;
}

function changeGenomaSource(value, id) {
    if(id != 'SearchSource') {
        var element = document.getElementById("genomaList").children[id];
    } else {
        var element = document.getElementById("genomaSearchData");
    }
    for(let el of element.children[0].children) {
        if(el.classList.contains("genomaSpec")) {
            el.classList.add("invisible");
            if(el.classList.contains(value)) {
                el.classList.remove("invisible");
            }
        }
    }
    console.log(element);
    console.log(element.getElementsByClassName("extraInput"));
    console.log(element.getElementsByClassName("extraInput")[0]);
    console.log(element.getElementsByClassName("extraInput")[0].children);
    for(let el of element.getElementsByClassName("extraInput")[0].children) {
        el.classList.add("invisible");
        if((value == "file" || value == "accesion") && el.classList.contains("genomaBoundaries")) {
            el.classList.remove("invisible");
        } else if(value == "locus" && el.classList.contains("genomaContext")) {
            el.classList.remove("invisible");
        }
    }
}
document.getElementById("tabIndicator0").click();