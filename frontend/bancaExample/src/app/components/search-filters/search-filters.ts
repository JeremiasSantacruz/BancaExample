import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';

export interface SearchField {
  key: string;
  label: string;
  options?: readonly string[];
}

@Component({
  selector: 'app-search-filters',
  imports: [FormsModule],
  templateUrl: './search-filters.html',
  styleUrl: './search-filters.css',
})
export class SearchFilters implements OnChanges {
  @Input({required: true}) fields!: readonly SearchField[];
  @Input() values: Record<string, string> = {};
  @Input() loading = false;
  @Output() readonly filtersSearch = new EventEmitter<Record<string, string>>();
  draft: Record<string, string> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['fields'] && !changes['values']) return;
    this.draft = Object.fromEntries(
      this.fields.map((field) => [field.key, this.values[field.key] ?? '']),
    );
  }

  submit(): void {
    if (!this.loading) this.filtersSearch.emit({...this.draft});
  }

  clear(): void {
    this.draft = Object.fromEntries(this.fields.map((field) => [field.key, '']));
    this.submit();
  }
}
