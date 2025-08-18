import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-duration-reminder',
  imports: [MatCheckboxModule],
  templateUrl: './duration-reminder.component.html',
  styleUrl: './duration-reminder.component.scss'
})
export class DurationReminderComponent {
  constructor(public dialogRef: MatDialogRef<DurationReminderComponent>) {}

  closeDialog(): void {
    this.dialogRef.close();
  }
}
