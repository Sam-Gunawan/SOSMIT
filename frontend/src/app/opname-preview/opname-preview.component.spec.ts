import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpnamePreviewComponent } from './opname-preview.component';

describe('OpnamePreviewComponent', () => {
  let component: OpnamePreviewComponent;
  let fixture: ComponentFixture<OpnamePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpnamePreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpnamePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
