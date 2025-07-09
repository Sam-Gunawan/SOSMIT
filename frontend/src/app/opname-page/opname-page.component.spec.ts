import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpnamePageComponent } from './opname-page.component';

describe('OpnamePageComponent', () => {
  let component: OpnamePageComponent;
  let fixture: ComponentFixture<OpnamePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpnamePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpnamePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
