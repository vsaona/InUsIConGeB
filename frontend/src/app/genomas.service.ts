import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GenomasService {

  genomas = [];

  constructor() { }
}

// Hice esto porque es util guardar en un servicio los nombres de los genomas que se leen en file-uploader, para usarlos en genomic-context-editor