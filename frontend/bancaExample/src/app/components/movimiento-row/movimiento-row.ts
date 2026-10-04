import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {Movimiento} from '../../core/models/movimiento.model';
import {FormattingService} from '../../core/services/formatting.service';

@Component({
  selector: 'tr[app-movimiento-row]',
  templateUrl: './movimiento-row.html',
  styleUrl: './movimiento-row.css',
})
export class MovimientoRow {
  @Input() busy = false;
  @Input({required: true}) movimiento!: Movimiento;
  @Output() readonly editMovimiento = new EventEmitter<Movimiento>();
  @Output() readonly deleteMovimiento = new EventEmitter<Movimiento>();
  private readonly formatting = inject(FormattingService);

  formatCurrency(value: number): string {
    return this.formatting.formatearMoneda(value);
  }

  formatDate(value: string): string {
    return this.formatting.formatearFecha(value);
  }
}
