import { Component, input } from '@angular/core';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class TopbarComponent {
  sectionTitle = input.required<string>();
  userName = input<string>('Administrador');
  userInitials = input<string>('AD');
}
