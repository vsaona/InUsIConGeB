// I think I'm using too much global variables :(
Array.prototype.last = function(){return this[this.length - 1];};
Array.prototype.first = function(){return this[0];};
var genomaHeight = 1;
var fontSize = 24;
var activeElement = null;
var arrowStyle = "clearlyNotATriangle";
var difference = -1;
var minStart = 0;
var maxEnd = 0;
var genomas;
var viewBox = [];
var genomaElement = null;
var d3Genomas;

var dragHandler = d3.drag().on("start", function () {
    var current = d3.select(this);
    deltaX = current.attr("x") - d3.event.x;
    deltaY = current.attr("y") - d3.event.y;
}).on("drag", function () {
    d3.select(this)
        .attr("x", d3.event.x + deltaX)
        .attr("y", d3.event.y + deltaY)
});            

/*getJSONP('/prueba', function(data){
    console.log(data);
    drawAll([{name: "prueba", genes: data.genomas}])
    
});*/ 

/*g1 = {name: "pseudococco",
        genes: [{start: 5790, end: 6020, name: "A1", color: "#FF0000", complement: false, interest: true},
                {start: 6440, end: 6650, name: "A2", color: "#00FF00", complement: false, interest: false},
                {start: 7230, end: 7530, name: "A3", color: "#0000FF", complement: true, interest: false}]};

g2 = {name: "pseudomonas furukawaii KF707",
        genes: [{start: 2790, end: 3120, name: "A1", color: "#FF0000", complement: false, interest: true},
                {start: 3340, end: 3550, name: "A2", color: "#00FF00", complement: false, interest: false},
                {start: 3930, end: 4230, name: "A3", color: "#0000FF", complement: true, interest: false},
                {start: 4500, end: 4600, name: "A4", color: "#FF00FF", complement: true, interest: false}]};
g3 = {name: "pseudomonas inverted",
        genes: [{start: 4900, end: 4850, name: "A4", color: "#FF00FF", complement: false, interest: false},
                {start: 4600, end: 4500, name: "A1", color: "#FF0000", complement: true, interest: true},
                {start: 4230, end: 3930, name: "A2", color: "#00FF00", complement: true, interest: false},
                {start: 3550, end: 3340, name: "A3", color: "#0000FF", complement: false, interest: false}]};
*/
function updateShownData(data, isGene) {
    if(isGene) {
        document.getElementById("geneLocusContent").innerText = data.locus;
        document.getElementById("geneInferenceContent").innerText = data.inference;
        document.getElementById("geneNoteContent").innerText = data.note;
        document.getElementById("geneProductContent").innerText = data.product;
        document.getElementById("geneTranslationContent").innerText = data.translation;
        d3.select("#geneData").classed("invisible", false);
    } else {
        document.getElementById("genomaDefinitionContent").innerText = data.definition;
        document.getElementById("genomaAccessionContent").innerText = data.accesion;
        document.getElementById("genomaFtpPathContent").innerText = data.ftpPath;
        document.getElementById("genomaSubmitterContent").innerText = data.submitter;
        document.getElementById("genomaTaxidContent").innerText = data.taxid;
        d3.select("#genomaData").classed("invisible", false);
    }
}
function activate(type, element, data) {
    d3.select("#arrowToolBar").classed("invisible", true);
    d3.select("#arrowTextToolBar").classed("invisible", true);
    d3.select("#globalToolBar").classed("invisible", true);
    d3.select("#genomaData").classed("invisible", true);
    d3.select("#geneData").classed("invisible", true);
    if(type == "arrow") {
        d3.select("#arrowToolBar").classed("invisible", false);
        var arrowColor = document.getElementById("arrowColor");
        document.getElementById("arrowStrokeWidthMwcTextField").layout();
        document.getElementById("arrowOpacity").layout();
        document.getElementById("arrowColor").layout();
        arrowColor.value = data.color;
        d3.select(arrowColor).style("background-color", arrowColor.value);
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

function draw(genoma, y, group){
    group.selectAll("g").data(genoma.genes).enter().append("g").classed("jscolor", true).each(function(gene, index) {
        var arrow = d3.select(this).attr("id", genoma.name+"__"+gene.name).append("polygon").classed("arrow", true).attr("id", genoma.name+"__"+gene.name+"__"+"arrow");
        if(gene.complement) {
            start = gene.end;
            end = gene.start;
        } else {
            start = gene.start;
            end = gene.end;
        }
        if (arrowStyle == "triangle") {
            arrow.attr("points", start+","+(y - genomaHeight/4)+" "+start+","+(y + genomaHeight/4)+" "+end+","+y);
        } else {
            middle = (start + end * 3) / 4
            arrow.attr("points", start+","+(y - genomaHeight/6)+" "+start+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/4)+" "+end+","+y+" "+middle+","+(y - genomaHeight/4)+" "+middle+","+(y - genomaHeight/6));
        }
        if(gene.color) {
            arrow.style("fill", gene.color);
        } else {
            gene.color = "#D7D7D7";
            arrow.style("fill", gene.color);
        }
        if(gene.identity) {
            arrow.style("fill-opacity", gene.identity);
        } else {
            gene.identity = 1;
        }
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

function updateColor(input) {
    d3.select(activeElement).style('fill', input.value);
    d3.select(activeElement).data()[0].color = input.value;
}
function updateStrokeWidth(input) {
    d3.selectAll(".arrow").style("stroke-width", input.value);
}
function updateIdentity(input) {
    d3.select(activeElement).style("fill-opacity", input.value / 100);
    d3.select(activeElement).data()[0].identity = input.value / 100;
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
                if(genomas[i].genes[j].interest && genomas[i].genes[j].end < 0) {
                    // Now we handle the reversed issue
                    // I should implement this
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
    var difference = d3.select(activeElement).data()[0].start;

    for(var j = 0; j < genoma.genes.length; j++) {
        genoma.genes[j].start -= difference;
        genoma.genes[j].end   -= difference;
        if(reverseAll) {
            temp = -genoma.genes[j].start;
            genoma.genes[j].start = -genoma.genes[j].end;
            genoma.genes[j].end = temp;
            genoma.genes[j].complement = !genoma.genes[j].complement;
        }
        if(genoma.genes[j].start < minStart)
            minStart = genoma.genes[j].start;
        if(genoma.genes[j].end > maxEnd)
            maxEnd   = genoma.genes[j].end;
        if(genoma.genes[j].end > localMaxEnd)
            localMaxEnd = genoma.genes[j].end;
    }
    // Resetting viewbox
    var begin = minStart - 10;
    var width = maxEnd + 10 - begin  + 15*fontSize;
    viewBox = [begin, viewBox[1], width, viewBox[3]];
    document.getElementById("canvas").setAttribute("viewBox", ""+viewBox[0]+" "+viewBox[1]+" "+viewBox[2]+" "+viewBox[3]);
    // We move the genoma tag
    d3.select(genomaElement).select(".genomaTag").attr("x", localMaxEnd + 20);
    // We move the genoma
    redraw(genoma, index*genomaHeight, genomaElement);
    // And now we move the texts
    console.log("alo?");
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
        if (arrowStyle == "triangle") {
            arrow.attr("points", start+","+(y - genomaHeight/4)+" "+start+","+(y + genomaHeight/4)+" "+end+","+y);
        } else {
            middle = (start + end * 3) / 4
            arrow.attr("points", start+","+(y - genomaHeight/6)+" "+start+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/6)+" "+middle+","+(y + genomaHeight/4)+" "+end+","+y+" "+middle+","+(y - genomaHeight/4)+" "+middle+","+(y - genomaHeight/6));
        }
        d3.select(this).select("text").attr("x", (start + end) / 2 - (end-start)/3);
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
            if(j < 6) {
                console.log(data.genes[j]);
            }
            if(data.genes[j].interest) {
                difference = data.genes[j].start;
                reverseAll = data.genes[j].complement;
            }
        }
        if(difference == -1) {
            console.log("No interest gene found");
            console.log(data);
            data.genes[0].interest = true;
            difference = data.genes[0].start;
            if(data.genes[0].complement) {
                reverseAll = true;
            }
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
            genomaHeight = (localMaxEnd- minStart)/data.genes.length;
        fontSize = Math.round(genomaHeight/6);
        draw(data, index * genomaHeight, d3.select(this));
        d3.select(this).append("text").text(data.name).attr("y", index * genomaHeight).style("font-size", fontSize+"px").attr("x", localMaxEnd + 20).classed("genomaTag", true).attr("id", "genomaTag_"+index);
        this.getElementsByTagName("text")[this.getElementsByTagName("text").length - 1].addEventListener("click", function(){activate("global", this, data);}, false);
        dragHandler(d3.select(this.getElementsByTagName("text")[this.getElementsByTagName("text").length - 1]));
        d3.select(this).insert("line", ":first-child") // Le annadimos la linea central al genoma
            .attr("id", data.name+"__midLine")
            .attr("x1", localMinStart - 100)
            .attr("x2", localMaxEnd + 100)
            .attr("y1", index * genomaHeight)
            .attr("y2", index * genomaHeight)
            .attr("stroke-width", genomaHeight / 30.0)
            .attr("stroke", "#444444")
            .classed("midLine", true);
        document.getElementById(data.name+"__midLine").addEventListener("click", function(){activate("global", document.getElementById("genomaTag_"+index), data);}, false);
    });
    
    document.getElementById("midLineWidth").value = Math.round(genomaHeight / 30.0);
    console.log(d3Genomas);
    // We build the scale indicator arrow
    scaleGroup = d3.select("#canvas").append("g");
    scaleData = {genes: [{start: maxEnd - 1000, end: maxEnd, name: "(1kb)"}], name: " "}
    draw(scaleData, genomas.length * genomaHeight, scaleGroup);
    // Setting viewbox
    var begin = minStart - 100;
    var width = maxEnd + 10 - begin  + 15*fontSize;
    viewBox = [begin, (-(genomaHeight)), width, (genomaHeight*(genomas.length + 1.5))];
    document.getElementById("canvas").setAttribute("viewBox", ""+viewBox[0]+" "+viewBox[1]+" "+viewBox[2]+" "+viewBox[3]);
    return(true);
}