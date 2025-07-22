import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpnameReviewPageComponent } from './opname-review-page.component';

describe('OpnameReviewPageComponent', () => {
  let component: OpnameReviewPageComponent;
  let fixture: ComponentFixture<OpnameReviewPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpnameReviewPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpnameReviewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
