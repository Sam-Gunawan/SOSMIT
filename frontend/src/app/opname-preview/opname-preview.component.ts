import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AssetInfo } from '../model/asset-info.model';

@Component({
  selector: 'app-opname-preview',
  imports: [CommonModule],
  templateUrl: './opname-preview.component.html',
  styleUrl: './opname-preview.component.scss'
})
export class OpnamePreviewComponent {
  @Output() closePreviewEvent = new EventEmitter<void>();

  closePreview() {
    this.closePreviewEvent.emit();
  }

  // errorMessage: string = '';
  // showToast: boolean = false;
  // isLoading: boolean = true;
}
