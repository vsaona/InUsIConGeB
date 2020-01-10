import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GenomasService } from '../genomas.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-genomic-context-editor',
  templateUrl: './genomic-context-editor.component.html',
  styleUrls: ['./genomic-context-editor.component.css']
})


export class GenomicContextEditorComponent implements OnInit {

  genomas = [];
  genomaHeight = 862;
  fontSize = 24;
  selectedElements = [];
  arrowStyle = "triangle";
  difference = -1;
  minStart = Infinity;
  maxEnd = -Infinity;
  localBounds = [];
  viewBox = [];
  genomaElement = null;
  filePaths: string;
  currentType = 'none';

  select(element, type) {
    if(type == 'arrow' && this.currentType == 'none') {
      this.currentType = 'arrow';
    }
    if(this.selectedElements.includes(element)) {
      this.selectedElements.splice(this.selectedElements.indexOf(element));
    } else {
      this.selectedElements.push(element);
    }
    console.log("Currently selected elements are:");
    console.log(this.selectedElements);
  }

  updateColor(input) {
    for(var i = 0; i < this.selectedElements.length ;i++) {
      this.selectedElements[i].color = input.value; /* Do something about this */
    }
  }

  // This function aligns a genoma in the canvas, setting the interesting gene at x = 0
  align(genoma){
    var difference = -1;
    var reverseAll = false;
    var temp;
    var localMin = Infinity; var localMax = -Infinity;
    genoma.genes.forEach(gene => {
      if(gene.interest) {
        difference = gene.interest;
        reverseAll = gene.complement;
      }
    });
    if(difference == -1) {
      genoma.genes[0].interest = true;
      difference = genoma.genes[0].interest;
      reverseAll = genoma.genes[0].complement;
    }
    genoma.genes.forEach(gene => {
      gene.start -= difference;
      gene.end -= difference;
      if(reverseAll) {
        temp = -gene.start;
        gene.start = -gene.end;
        gene.end = temp;
        gene.complement = !gene.complement;
      }
      if(gene.start < localMin)
        localMin = gene.start;
      if(gene.end > localMax)
        localMax = gene.end;
    });
    this.genomaHeight = (localMax- localMin)/genoma.genes.length;
    this.fontSize = this.genomaHeight/6;
    return([localMin, localMax]);
  }
  

  constructor(private http: HttpClient, private activatedRoute: ActivatedRoute, private router: Router) {
    const headers = new HttpHeaders()
          .set("Authorization", "my-auth-token")
          .set("Content-Type", "application/json");
    // Los datos utilizados en este http.post deberian extraerse de genomas.service
    console.log("filePaths");
    console.log(this.filePaths);
    console.log(this.router.getCurrentNavigation().extras.state.filePaths);
    this.http.post("http://localhost:3000/read/prueba", JSON.stringify({filePath: this.router.getCurrentNavigation().extras.state.filePaths}), {headers: headers}).subscribe(data => {
      this.genomas = data["genomas"];
      this.genomas.forEach(genoma => {
        this.localBounds = this.align(genoma);
        if(this.localBounds[0] < this.minStart) {
          this.minStart = this.localBounds[0];
        }
        if(this.localBounds[1] > this.maxEnd) {
          this.maxEnd = this.localBounds[1];
        }
      });
      var i = 0
      this.genomas.forEach(genoma => {
        genoma.y = (i++) * this.genomaHeight;
        genoma.genes.forEach(gene => {
          if(gene.complement) {
            gene.start = gene.end;
            gene.end = gene.start;
          }
          gene.middle = (gene.start + (gene.end * 3)) / 4;
        });
      });
      this.viewBox = ["" + this.minStart + " " + -this.genomaHeight/2 + " " + (this.maxEnd - this.minStart) + " " + (this.genomas.length + 1) * this.genomaHeight];
      document.getElementById("canvas").setAttribute("viewBox", this.viewBox[0]); // Esto es necesario para refresacar la propiedad viewBox en la página
    });
  }

  ngOnInit() {
    this.filePaths = this.activatedRoute.snapshot.queryParamMap.get("paths");
    this.activatedRoute.queryParamMap.subscribe(queryParams => {
      this.filePaths = queryParams.get("paths")
    });
  }
}
