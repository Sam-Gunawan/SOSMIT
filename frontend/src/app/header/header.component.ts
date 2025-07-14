import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpnameSession } from '../model/opname-session.model';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  notif!: OpnameSession;

  notifications = [
    { message: 'New Opname session created...', isRead: false},
    { message: 'Opname session completed...', isRead: true},
  ];
}
