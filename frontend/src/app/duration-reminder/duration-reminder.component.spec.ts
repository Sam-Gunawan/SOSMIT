import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DurationReminderComponent } from './duration-reminder.component';

describe('DurationReminderComponent', () => {
  let component: DurationReminderComponent;
  let fixture: ComponentFixture<DurationReminderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DurationReminderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DurationReminderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
