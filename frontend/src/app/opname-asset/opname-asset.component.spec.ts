import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpnameAssetComponent } from './opname-asset.component';

describe('OpnameAssetComponent', () => {
  let component: OpnameAssetComponent;
  let fixture: ComponentFixture<OpnameAssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpnameAssetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpnameAssetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
