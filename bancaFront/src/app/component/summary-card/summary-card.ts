import { Component, input } from '@angular/core';

export type CardTone = 'blue' | 'green' | 'amber' | 'red';

@Component({
  selector: 'article[app-summary-card]',
  templateUrl: './summary-card.html',
  styleUrl: './summary-card.css',
  host: {
    '[class]': '"tone-" + tone()',
  },
})
export class SummaryCard {
  label = input.required<string>();
  value = input.required<number | string>();
  caption = input<string>('');
  icon = input<string>('');
  tone = input<CardTone>('blue');
}
