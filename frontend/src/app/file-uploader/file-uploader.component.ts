import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpRequest, HttpEventType } from '@angular/common/http';
import { GenomasService } from '../genomas.service';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.css']
})
export class FileUploaderComponent implements OnInit {

  filesCount = 0;
  public files: Set<File> = new Set();
  @ViewChild('file', {static: true}) file;
  uploadedFiles: Array<File>;

  // La idea de esta funcion es enviar los datos a Node, recibir la respuesta, y luego cargar la vista genomic-context-editor
  upload() {
    var sentData = {files: this.files};
    console.log(this.files);
    const headers = new HttpHeaders()
          .set("Authorization", "my-auth-token")
          .set("Content-Type", "application/json");
    this.http.post("http://localhost:3000/read/fileupload", JSON.stringify(sentData), {headers: headers}).subscribe(data => {
      console.log("Aqui viene la data");
      console.log(data);
      this.genomasService.genomas = data["genomas"];
    });
  }

  onFilesAdded() {
    const files: { [key: string]: File } = this.file.nativeElement.files;
    for (let key in files) {
      if (!isNaN(parseInt(key))) {
        this.files.add(files[key]);
      }
    }
  }

  newFile() {
      this.filesCount++;
      var newButton = document.createElement("input");
      newButton.setAttribute("type", "file");
      newButton.setAttribute("class", "form-control-file");
      newButton.setAttribute("name", "file" + this.filesCount);
      document.getElementById("files").appendChild(newButton);
  }

  constructor(private http: HttpClient, private genomasService: GenomasService) { }

  ngOnInit() {
  }
  fileChange(element) {
    this.uploadedFiles = element.target.files;
  }

  subir() {
    let formData = new FormData();
    for (var i = 0; i < this.uploadedFiles.length; i++) {
        formData.append("uploads[]", this.uploadedFiles[i], this.uploadedFiles[i].name);
    }
    this.http.post('/read/angularFile', formData)
    .subscribe((response) => {
         console.log('response received is ', response);
    })
  }
}
