import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenomicContextEditorComponent } from './genomic-context-editor.component';

describe('GenomicContextEditorComponent', () => {
  let component: GenomicContextEditorComponent;
  let fixture: ComponentFixture<GenomicContextEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenomicContextEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenomicContextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
