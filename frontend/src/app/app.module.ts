import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { GenomasService } from './genomas.service';

import { AppComponent } from './app.component';
import { FileUploaderComponent } from './file-uploader/file-uploader.component';
import { GenomicContextEditorComponent } from './genomic-context-editor/genomic-context-editor.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

const appRoutes: Routes = [
  { path: 'file-uploader', component: FileUploaderComponent },
  { path: 'genomic-context-editor', component: GenomicContextEditorComponent },
  { path: '', component: GenomicContextEditorComponent },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    FileUploaderComponent,
    GenomicContextEditorComponent,
    PageNotFoundComponent
  ],
  imports: [
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: false } // <-- debugging purposes only
    ),
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    GenomasService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
