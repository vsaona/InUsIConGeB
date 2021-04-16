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

function searchCustomizationChangeVisibility() {
    var original = document.getElementById("searchCustomization");
    if(original.classList.contains("invisible")) {
        original.classList.remove("invisible");
    } else {
        original.classList.add("invisible");
    }
}

function changeGenomaSource(value, id) {
    var element = document.getElementById("genomaList").children[id];
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
        if(value == "file" && el.classList.contains("genomaBoundaries")) {
            el.classList.remove("invisible");
        } else if((value == "gi" || value == "accesion") && el.classList.contains("genomaContext")) {
            el.classList.remove("invisible");
        }
    }
}