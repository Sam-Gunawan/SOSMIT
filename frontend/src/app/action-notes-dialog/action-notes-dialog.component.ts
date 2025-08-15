import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ActionNotesDialogData {
  initialNotes: string;
  assetTag: string;
}

@Component({
  selector: 'app-action-notes-dialog',
  standalone: true,
  imports: [MatDialogModule, FormsModule, CommonModule],
  templateUrl: './action-notes-dialog.component.html',
  styleUrl: './action-notes-dialog.component.scss',
})
export class ActionNotesDialogComponent {
  notes: string;
  initialNotes: string;
  assetTag: string;

  constructor(
    private dialogRef: MatDialogRef<ActionNotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActionNotesDialogData
  ) {
    this.notes = data.initialNotes || '';
    this.assetTag = data.assetTag || '';
    this.initialNotes = this.notes;
  }

  onSave(): void {
    this.dialogRef.close({ action: 'save', notes: this.notes.trim() });
  }
  onDelete(): void {
    this.dialogRef.close({ action: 'delete' });
  }
  onCancel(): void {
    this.dialogRef.close({ action: 'cancel' });
  }
}
