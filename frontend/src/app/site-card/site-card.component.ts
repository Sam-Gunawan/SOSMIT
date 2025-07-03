import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Siteinfo } from '../siteinfo';

@Component({
  selector: 'app-site-card',
  imports: [CommonModule],
  templateUrl: './site-card.component.html',
  styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  siteCard = input.required<Siteinfo>();
}
