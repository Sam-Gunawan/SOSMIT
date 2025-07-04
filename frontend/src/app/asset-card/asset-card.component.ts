import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assetinfo } from '../model/assetinfo.model';
import { AssetPageComponent } from '../asset-page/asset-page.component';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, AssetPageComponent],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  assetCard = input.required<Assetinfo>();
}
