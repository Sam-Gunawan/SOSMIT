import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-opname-page',
  imports: [CommonModule, AssetCardComponent],
  templateUrl: './opname-page.component.html',
  styleUrl: './opname-page.component.scss'
})
export class OpnamePageComponent implements OnInit {
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    if (window.innerWidth >= 768) {
      // Large screens: use compact variant with location
      this.cardVariant = 'compact';
      this.showLocation = true;
    } else {
      // Small screens: use default variant without location
      this.cardVariant = 'default';
      this.showLocation = false;
    }
  }
}