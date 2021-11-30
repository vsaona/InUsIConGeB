// I think I'm using too much global variables :(
Array.prototype.last = function(){return this[this.length - 1];};
Array.prototype.first = function(){return this[0];};
window.genomaHeight = 1;
window.fontSize = 24;
window.activeElement = null;
window.arrowStyle = "arrow";
window.difference = -1;
window.minStart = 0;
window.maxEnd = 0;
window.viewBox = [];
window.genomaElement = null;
window.d3Genomas;
window.itIsTheFirstTimeTheySelect = true;
window.lastDeletedgene = null;

window.dragHandler = d3.drag().on("start", function () {
    var current = d3.select(this);
    deltaX = current.attr("x") - d3.event.x;
    deltaY = current.attr("y") - d3.event.y;
}).on("drag", function () {
    var newX = d3.event.x + deltaX;
    var newY = d3.event.y + deltaY;
    var rotationDegree = d3.select(this).classed("genomaTag") ? "0" : "-15";
    d3.select(this)
        .attr("x", newX)
        .attr("y", newY)
        .attr("transform", `rotate(${rotationDegree}, ${newX}, ${newY})`)
    ;
});            

function updateShownData(data, isGene) {
    if(isGene) {
        document.getElementById("geneLocusContent").innerText = data.locus || data.locus_tag;
        document.getElementById("geneInferenceContent").innerText = data.inference;
        document.getElementById("geneNoteContent").innerText = data.note || data.key;
        document.getElementById("geneProductContent").innerText = data.product;
        document.getElementById("geneTranslationContent").innerText = data.translation;
        document.getElementById("geneSizeContent").innerText = data.end - data.start;
        d3.select("#geneData").classed("invisible", false);
        if(data.identity || data.coverage) {
            document.getElementById("geneIdentityContent").innerText = data.identity;
            document.getElementById("geneCoverageContent").innerText = data.coverage;
            d3.select("#interestGeneData").classed("invisible", false);
        }
        if(itIsTheFirstTimeTheySelect) {
            document.getElementById("geneLocusContent").scrollIntoView({ behavior: 'smooth', block: 'nearest'});
            itIsTheFirstTimeTheySelect = false;
        }
    } else {
        document.getElementById("genomaDefinitionContent").innerText = data.definition;
        document.getElementById("genomaAccessionContent").innerText = data.accesion;
        document.getElementById("genomaFtpPathContent").innerText = data.ftpPath;
        document.getElementById("genomaSubmitterContent").innerText = data.submitter;
        document.getElementById("genomaTaxidContent").innerText = data.taxid;
        d3.select("#genomaData").classed("invisible", false);
        if(itIsTheFirstTimeTheySelect) {
            document.getElementById("genomaDefinitionContent").scrollIntoView();
            itIsTheFirstTimeTheySelect = false;
        }
    }
}
function activate(type, element, data) {
    d3.select("#arrowToolBar").classed("invisible", true);
    d3.select("#arrowTextToolBar").classed("invisible", true);
    d3.select("#globalToolBar").classed("invisible", true);
    d3.select("#genomaData").classed("invisible", true);
    d3.select("#geneData").classed("invisible", true);
    d3.select("#interestGeneData").classed("invisible", true);
    d3.select("#invitationToEditData").classed("invisible", true);
    /* Show animation */
    d3.select("#goToBarIndicator").classed("invisible", false);
    var el = document.getElementById('goToBarIndicator');
    el.style.animation = 'none';
    setTimeout(function() {
        el.style.animation = '';
    }, 10);

    if(type == "arrow") {
        d3.select("#arrowToolBar").classed("invisible", false);
        var arrowColor = document.getElementById("arrowColor");
        document.getElementById("arrowStrokeWidthMwcTextField").layout();
        //document.getElementById("arrowOpacity").layout();
        document.getElementById("arrowColor").layout();
        // setTimeout(function() { document.getElementById("arrowStyleSelector").value = arrowStyle; }, 200);
        arrowColor.value = data.color;
        d3.select(arrowColor).style("background-color", arrowColor.value);
        d3.select("#geneHideButton").classed("invisible", data.hidden != null && data.hidden);
        d3.select("#geneShowButton").classed("invisible", data.hidden == null || !data.hidden);
        d3.select("#alignGeneButton").classed("invisible", data.scale);
        updateShownData(data, true);
    } else if (type == "arrowText") {
        d3.select("#arrowTextToolBar").classed("invisible", false);
        d3.select("#arrowTextToolBar").select("#geneName").attr("value", data.name);
        d3.select("#geneFontSize").attr("value", $(element).css("font-size").slice(0,-2));
        document.getElementById("geneFontSize").layout();
        updateShownData(data, true);
    } else if (type == "global") {
        d3.select("#globalToolBar").classed("invisible", false);
        d3.select("#globalToolBar").select("#genomaName").attr("value", data.name);
        d3.select("#genomaTextSizeInput").attr("value", $(element).css("font-size").slice(0,-2));
        document.getElementById("genomaTextSizeInput").layout();
        document.getElementById("midLineWidth").layout();
        updateShownData(data, false);
    } else {
        console.log("You should implement '" + type + "' now!");
    }
    activeElement = element;
}

function draw(genoma, y, group, scale = false){
    group.selectAll("g").data(genoma.genes).enter().append("g").each(function(gene, index) {
        var arrow = d3.select(this).attr("id", scale? "scaleGroup" : "group__"+y+"__"+index).append("polygon").classed("arrow", true).attr("id", "arrow__"+y+"__"+index);
        if(gene.complement) {
            start = gene.end;
            end = gene.start;
        } else {
            start = gene.start;
            end = gene.end;
        }
        if (arrowStyle == "triangle") {
            arrow.attr("points", start+","+(y - genomaHeight/4)+" "+start+","+(y + genomaHeight/4)+" "+end+","+y);
        } else if (arrowStyle == "tag") {
            middle = (start + end * 3) / 4;
            arrow.attr("points", start+","+(y - genomaHeight/6)+" "+start+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/6)+" "+end+","+y+" "+middle+","+(y - genomaHeight/6));
        } else {
            middle = (start + end * 3) / 4;
            arrow.attr("points", start+","+(y - genomaHeight/6)+" "+start+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/4)+" "+end+","+y+" "+middle+","+(y - genomaHeight/4)+" "+middle+","+(y - genomaHeight/6));
        }
        if(gene.color) {
            arrow.style("fill", gene.color);
        } else {
            gene.color = "#A7A7A7";
            arrow.style("fill", gene.color);
        }
        if(gene.opacity) {
            arrow.style("fill-opacity", gene.opacity);
        } else {
            gene.opacity = 1;
        }
        gene.scale = scale;
        this.getElementsByTagName("polygon")[0].addEventListener("click", function(){activate("arrow", this, gene);}, false);
        var textGeneX = (gene.start + gene.end) / 2 - ((gene.end - gene.start) / 3);
        var textGeneY = y - genomaHeight/4;
        d3.select(this).append("text")
          .attr("x", textGeneX).attr("y", textGeneY)
          .text(gene.name)
          .classed("geneTag", true)
          .attr("text-anchor", "start")
          .attr("transform", "rotate(-15,"+textGeneX+","+textGeneY+")");
        d3.selectAll(".geneTag").style("font-size", fontSize+"px");
        text = this.getElementsByTagName("text")[0];
        text.addEventListener("click", function(){activate("arrowText", this, gene);}, false);
        // Now we make the text to be draggable
        dragHandler(d3.select(text));
    });
    return(true);
}

function updateColorField(picker) {
    document.getElementById('arrowColor').value = picker.toHEXString();
    d3.select("#arrowColor").style("background-color", picker.toHEXString());
    d3.select(activeElement).style('fill', picker.toHEXString());
    d3.select(activeElement).data()[0].color = picker.toHEXString();
}
function updateColor(input) {
    if(input.value.match(/^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/)) {
        d3.select("#arrowColor").style("background-color", input.value);
        d3.select(activeElement).style('fill', input.value);
        d3.select(activeElement).data()[0].color = input.value;
    }
}
function updateStrokeWidth(input) {
    d3.selectAll(".arrow").style("stroke-width", input.value);
}
function updateOpacity(input) {
    d3.select(activeElement).style("fill-opacity", input.value / 100);
    d3.select(activeElement).data()[0].opacity = input.value / 100;
}
function updateGeneFontSize(input) {
    d3.selectAll(".geneTag").style('font-size', input.value+"px");
}
function updateGenomaFontSize(input) {
    d3.selectAll(".genomaTag").style('font-size', input.value+"px");
}
function updateMidLineWidth(input) {
    d3.selectAll(".midLine").attr('stroke-width', input.value);
}
function updateName(input) {
    d3.select(activeElement).text(input.value);
}
function hideContext() {
    for(var i = 0; i < genomas.length; i++) {
        //var data = d3.select(activeElement).data()[0];
        if(genomas[i] == d3.select(activeElement).data()[0]) {
            genomas.splice(i, 1);
        }
    }
    document.getElementById("canvas").innerHTML="";
    minStart = 0;
    maxEnd = 0;
    drawAll(genomas);
}
function hideGene(shouldItBeHidden) {
    var geneToRemove = d3.select(activeElement).data()[0];
    if(geneToRemove.scale) {
        d3.select(activeElement.parentElement).style("opacity", shouldItBeHidden? "0" : "100");
    } else for(var i = 0; i < genomas.length; i++) {
        if(genomas[i].genes.includes(geneToRemove)) {
            var index = genomas[i].genes.indexOf(geneToRemove);
            genomas[i].genes[index].hidden = shouldItBeHidden;
            d3.select(activeElement.parentElement).style("opacity", shouldItBeHidden? "0" : "100");
        }
    }
    d3.select("#geneHideButton").classed("invisible", shouldItBeHidden);
    d3.select("#geneShowButton").classed("invisible", !shouldItBeHidden);
}
function updateArrowStyle(input) {
    arrowStyle = input.value;
    d3.selectAll("#canvas > g").each(function(genoma, y) {
        y = y * genomaHeight;
        redraw(genoma, y, this);
        
        return(true);
    });
}

function setInterestGene() {
    /* Bugs (I should fix these):
        * What happens when the genoma is reversed?
        */
    interestGene = d3.select(activeElement).data()[0];
    var genoma = null;
    var index = -1;
    minStart = 0;
    maxEnd = 0;
    for(i = 0; i < genomas.length; i++) {
        if(genomas[i].genes.includes(interestGene)) {
            index = i;
            genoma = genomas[i];
        }
        if(index != i) {
            for(j = 0; j < genomas[i].genes.length; j++) {
                if(genomas[i].genes[j].start < minStart) {
                    minStart = genomas[i].genes[j].start;
                }
                if(genomas[i].genes[j].end > maxEnd) {
                    maxEnd = genomas[i].genes[j].end;
                }
            }
        } else {
            for(j = 0; j < genomas[i].genes.length; j++) {
                if(genomas[i].genes[j] == interestGene){
                    if(genomas[i].genes[j].interest)
                        return(0);
                }
            }
        }
    }
    // Now we recover the actual DOM element
    d3.select("#canvas").selectAll("g").each( function(data, i) {
        if(!data) return(0);
        if(data.start) return(0);
        if(data == genoma)
            genomaElement = this;
    });
    for(j = 0; j < genoma.genes.length; j++) {
        genoma.genes[j].interest = false;
    }
    d3.select(activeElement).data()[0].interest = true;
    // redraw();

    var reverseAll = d3.select(activeElement).data()[0].complement;
    var localMaxEnd = 0;
    var localMinStart = 0;
    var difference = reverseAll ? d3.select(activeElement).data()[0].end : d3.select(activeElement).data()[0].start;

    for(var j = 0; j < genoma.genes.length; j++) {
        genoma.genes[j].start -= difference;
        genoma.genes[j].end   -= difference;
        if(reverseAll) {
            temp = -genoma.genes[j].start;
            genoma.genes[j].start = -genoma.genes[j].end;
            genoma.genes[j].end = temp;
            genoma.genes[j].complement = !genoma.genes[j].complement;
        }
        if(genoma.genes[j].start < localMinStart) {
            localMinStart = genoma.genes[j].start;
            if(genoma.genes[j].start < minStart) {
                minStart = genoma.genes[j].start;
            }
        }
        if(genoma.genes[j].end > localMaxEnd) {
            localMaxEnd = genoma.genes[j].end;
            if(genoma.genes[j].end > maxEnd) {
                maxEnd   = genoma.genes[j].end;
            }
        }
    }
    // Resetting viewbox
    var begin = minStart - 100;
    var width = maxEnd + 10 - begin + 20 * fontSize;
    viewBox = [begin, viewBox[1], width, viewBox[3]];
    document.getElementById("canvas").setAttribute("viewBox", ""+viewBox[0]+" "+viewBox[1]+" "+viewBox[2]+" "+viewBox[3]);
    // We move the genoma tag
    d3.selectAll(".genomaTag").attr("x", maxEnd + 200);
    // We move the genoma
    redraw(genoma, index*genomaHeight, genomaElement);
    // And now we move the line
    console.log("localMinStart");
    console.log(localMinStart);
    d3.select(genomaElement).select(`.realMidLine`).attr("x1", localMinStart - 100)
        .attr("x2", localMaxEnd + 100);
    d3.select("#canvas").selectAll(".phantomMidLine").each(function(_, index) {
        d3.select(this).attr("x1", minStart - 25)
            .attr("x2", maxEnd + 25);
    });
    // And now we move the scale
    console.log(d3.select("#scaleGroup"));
    console.log(d3.select("#scaleGroup").data());
    d3.select("#scaleGroup").attr("transform", `translate(${maxEnd - d3.select("#scaleGroup").data()[0].end}, 0)`);
    
}

function redraw(genoma, y, el) {
    d3.select(el).selectAll("g").each(function(gene, index) {
        var arrow = d3.select(this).select("polygon");
        if(gene.complement) {
            start = gene.end;
            end = gene.start;
        } else {
            start = gene.start;
            end = gene.end;
        }
        let g6 = genomaHeight/(2*2*1.61803398874);
        if (arrowStyle == "triangle") {
            arrow.attr("points", start+","+(y - genomaHeight/4)+" "+start+","+(y + genomaHeight/4)+" "+end+","+y);
        } else if (arrowStyle == "tag") {
            middle = (start + end * 3) / 4;
            arrow.attr("points", start+","+(y - g6)+" "+start+","+(y + g6)+" "+middle+","+(y + g6)+" "+end+","+y+" "+middle+","+(y - g6));
        } else {
            middle = (start + end * 3) / 4
            arrow.attr("points", start+","+(y - g6)+" "+start+","+(y + g6)+" "+middle+","+(y + g6)+" "+middle+","+(y + genomaHeight/4)+" "+end+","+y+" "+middle+","+(y - genomaHeight/4)+" "+middle+","+(y - g6));
        }
        var textTag = d3.select(this).select("text");
        var textTagX = (start + end) / 2 - (Math.abs(end-start))/3;
        var textTagY = textTag.attr("y");
        textTag.attr("x", textTagX)
            .attr("transform", "rotate(-15, " + textTagX + ", " + textTagY + ")");
    });
    return(0);
}

function drawAll(genomas) {
    d3Genomas = d3.select("#canvas").selectAll("g").data(genomas).enter().append("g").each(function(data, index) {
        difference = -1;
        var localMaxEnd = 0;
        var localMinStart = Number.MAX_VALUE;
        var reverseAll = false;
        for(var j = 0; j < data.genes.length; j++) {
            if(data.genes[j].interest) {
                reverseAll = data.genes[j].complement;
                difference = reverseAll ? data.genes[j].end : data.genes[j].start;
            }
        }
        if(difference == -1) {
            data.genes[0].interest = true;
            reverseAll = data.genes[0].complement;
            difference = reverseAll ? data.genes[data.genes.length - 1].end : data.genes[0].start;
        }
        for(var j = 0; j < data.genes.length; j++) {
            data.genes[j].start -= difference;
            data.genes[j].end   -= difference;
            if(reverseAll) {
                temp = -data.genes[j].start;
                data.genes[j].start = -data.genes[j].end;
                data.genes[j].end = temp;
                data.genes[j].complement = !data.genes[j].complement;
            }
            if(data.genes[j].start < minStart)
                minStart = data.genes[j].start;
            if(data.genes[j].end > maxEnd)
                maxEnd   = data.genes[j].end;
            if(data.genes[j].end > localMaxEnd)
                localMaxEnd = data.genes[j].end;
            if(data.genes[j].start < localMinStart)
                localMinStart = data.genes[j].start;
        }
        if(genomaHeight == 1)
            genomaHeight = Math.round((localMaxEnd- minStart)/data.genes.length);
        fontSize = Math.round(genomaHeight/6);
        draw(data, index * genomaHeight, d3.select(this));
        d3.select(this).insert("line", ":first-child") // Le annadimos la linea central al genoma
            .attr("id", "midLine__"+index)
            .attr("x1", localMinStart - 100)
            .attr("x2", localMaxEnd + 100)
            .attr("y1", index * genomaHeight)
            .attr("y2", index * genomaHeight)
            .attr("stroke-width", genomaHeight / 30.0)
            .attr("stroke", "#888")
            .classed("midLine", true).classed("realMidLine", true);
        document.getElementById("midLine__"+index).addEventListener("click", function(){activate("global", document.getElementById("genomaTag_"+index), data);}, false);
    });
    d3Genomas.each(function(data, index) {
        d3.select(this).append("text").text(data.name).attr("y", index * genomaHeight).style("font-size", fontSize+"px").attr("x", maxEnd + 200).classed("genomaTag", true).attr("id", "genomaTag_"+index);
        this.getElementsByTagName("text")[this.getElementsByTagName("text").length - 1].addEventListener("click", function(){activate("global", this, data);}, false);
        dragHandler(d3.select(this.getElementsByTagName("text")[this.getElementsByTagName("text").length - 1]));
        d3.select(this).insert("line", ":first-child") // Le annadimos la linea central al genoma
            .attr("id", "phantomMidLine__"+index)
            .attr("x1", minStart - 25)
            .attr("x2", maxEnd + 25)
            .attr("y1", index * genomaHeight)
            .attr("y2", index * genomaHeight)
            .attr("stroke-width", genomaHeight / 30.0)
            .attr("stroke", "#CCC")
            .attr("stroke-dasharray", "100, 100")
            .classed("midLine", true)
            .classed("phantomMidLine", true);
        document.getElementById("phantomMidLine__"+index).addEventListener("click", function(){activate("global", document.getElementById("genomaTag_"+index), data);}, false);
    });
        
    document.getElementById("midLineWidth").value = Math.round(genomaHeight / 30.0);
    console.log(d3Genomas);
    // We build the scale indicator arrow
    scaleGroup = d3.select("#canvas").append("g");
    scaleData = {genes: [{start: maxEnd - 1000, end: maxEnd, name: "(1kb)", locus: "Scale", note: "Just a size reference. Length is 1kb"}], name: ""}
    draw(scaleData, genomas.length * genomaHeight, scaleGroup, true);
    // Setting viewbox
    var begin = minStart - 100;
    var width = maxEnd + 10 - begin + 20 * fontSize;
    var height = (genomaHeight*(genomas.length + 1.5));
    viewBox = [begin, (-(genomaHeight)), width, height];
    document.getElementById("canvas").setAttribute("viewBox", ""+viewBox[0]+" "+viewBox[1]+" "+viewBox[2]+" "+viewBox[3]);
    if(width / height > 10) {
        zoom("50");
    }
    return(true);
}

function zoom(value) {
    var canvas = document.getElementById("canvas");
    canvas.style.width = "auto";
    canvas.style.height = `${value}%`;
    d3.select("body").style("min-width", document.getElementsByTagName("svg")[0].scrollWidth)
}
function triggerZoomOut() {
    var zoomBar = document.getElementById('zoomBar');
    zoomBar.value -= 10;
    zoom(zoomBar.value);
}
function triggerZoomIn() {
    var zoomBar = document.getElementById('zoomBar');
    zoomBar.value += 10;
    zoom(zoomBar.value);
}

function toogleItalic() {
    d3.selectAll('.genomaTag').classed('italic', !window.italic);
    window.italic = !window.italic;
}
function toogleUnderlined() {
    d3.selectAll('.genomaTag').classed('underlined', !window.underlined);
    window.underlined = !window.underlined;
}