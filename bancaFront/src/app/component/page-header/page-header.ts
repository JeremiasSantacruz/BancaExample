import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.css'
})
export class PageHeaderComponent {
  eyebrow = input<string>('BANCA · ADMINISTRACIÓN');
  title = input.required<string>();
  description = input<string>('');
}
