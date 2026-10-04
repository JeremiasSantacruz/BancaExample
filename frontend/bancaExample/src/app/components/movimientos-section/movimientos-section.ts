import {SearchField, SearchFilters} from '../search-filters/search-filters';
import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {SummaryCard} from '../summary-card/summary-card';
import {TableToolbar} from '../table-toolbar/table-toolbar';
import {MovimientosTable} from '../movimientos-table/movimientos-table';
import {Movimiento} from '../../core/models/movimiento.model';
import {FormattingService} from '../../core/services/formatting.service';

@Component({
  selector: 'app-movimientos-section',
  imports: [SearchFilters, SummaryCard, TableToolbar, MovimientosTable],
  templateUrl: './movimientos-section.html',
  styleUrl: './movimientos-section.css',
  host: {style: 'display: block'},
})
export class MovimientosSection {
  readonly filterFields: readonly SearchField[] = [{key: 'cuentaId', label: 'ID de cuenta'}];
  @Input() filterValues: Record<string, string> = {};
  @Input() searching = false;
  @Output() readonly filtersSearch = new EventEmitter<Record<string, string>>();
  @Input() busy = false;
  @Input({required: true}) movimientos!: Movimiento[];
  @Input({required: true}) appliedDeposits!: number;
  @Input({required: true}) appliedWithdrawals!: number;
  @Input({required: true}) filteredMovimientos!: Movimiento[];
  @Input({required: true}) searchTerm!: string;

  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly editMovimiento = new EventEmitter<Movimiento>();
  @Output() readonly deleteMovimiento = new EventEmitter<Movimiento>();

  private readonly formatting = inject(FormattingService);

  formatCurrency(value: number): string {
    return this.formatting.formatearMoneda(value);
  }
}
