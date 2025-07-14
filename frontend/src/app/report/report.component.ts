import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetCardComponent } from '../asset-card/asset-card.component';

@Component({
  selector: 'app-report',
  imports: [CommonModule, AssetCardComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  currentView: string = 'list';
}
