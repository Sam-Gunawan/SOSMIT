import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetPageComponent } from './asset-page.component';

describe('AssetPageComponent', () => {
  let component: AssetPageComponent;
  let fixture: ComponentFixture<AssetPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
