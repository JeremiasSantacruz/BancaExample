import {Component, Input} from '@angular/core';

@Component({
  selector: 'article[app-summary-card]',
  templateUrl: './summary-card.html',
  styleUrl: './summary-card.css',
  host: {class: 'summary-card'},
})
export class SummaryCard {
  @Input({required: true}) icon!: string;
  @Input({required: true}) tone!: 'blue' | 'green' | 'amber';
  @Input({required: true}) label!: string;
  @Input({required: true}) value!: string | number;
  @Input({required: true}) caption!: string;
}
