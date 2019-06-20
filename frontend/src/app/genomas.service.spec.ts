import { TestBed } from '@angular/core/testing';

import { GenomasService } from './genomas.service';

describe('GenomasService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GenomasService = TestBed.get(GenomasService);
    expect(service).toBeTruthy();
  });
});
