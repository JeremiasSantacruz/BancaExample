import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-table-toolbar',
  imports: [FormsModule],
  templateUrl: './table-toolbar.html',
  styleUrl: './table-toolbar.css',
  host: {style: 'display: block'},
})
export class TableToolbar {
  @Input({required: true}) title!: string;
  @Input({required: true}) recordCount!: number;
  @Input({required: true}) searchTerm!: string;
  @Input({required: true}) searchLabel!: string;
  @Input({required: true}) searchPlaceholder!: string;
  @Output() readonly searchTermChange = new EventEmitter<string>();
}
