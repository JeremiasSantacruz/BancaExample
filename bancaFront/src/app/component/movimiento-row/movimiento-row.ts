import { Component, computed, inject, input, output } from '@angular/core';
import { Movimiento } from '../../core/model';
import { FormattingService } from '../../core/service';
import { StatusBadge } from '../status-badge/status-badge';

/**
 * Fila de un movimiento.
 *
 * Se usa como componente de fila (`tr[app-movimiento-row]`) para que el
 * formateo de fecha, importe y estado no se repita en cada tabla.
 */
@Component({
  selector: 'tr[app-movimiento-row]',
  imports: [StatusBadge],
  templateUrl: './movimiento-row.html',
  styleUrl: './movimiento-row.css',
})
export class MovimientoRow {
  readonly movimiento = input.required<Movimiento>();
  /** Habilita la acción de reversa, que solo el backend acepta sobre `APPROVED`. */
  readonly canReverse = input(false);
  readonly busy = input(false);

  readonly reverse = output<Movimiento>();

  protected readonly formatting = inject(FormattingService);

  protected formatDate(fecha: string): string {
    return this.formatting.formatDateTime(fecha);
  }

  protected formatCurrency(valor: number): string {
    return this.formatting.formatCurrency(valor);
  }
}