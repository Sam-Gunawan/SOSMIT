import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-container',
  imports: [CommonModule, HeaderComponent, RouterOutlet],
  templateUrl: './container.component.html',
  styleUrl: './container.component.scss'
})
export class ContainerComponent {

}
