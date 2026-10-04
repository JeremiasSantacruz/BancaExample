import { Component, input, output } from '@angular/core';
import { Movimiento } from '../../core/model';
import { MovimientoRow } from '../movimiento-row/movimiento-row';

/**
 * Tabla de movimientos.
 *
 * La comparten la sección de movimientos y el reporte, así el listado se ve
 * igual en los dos lugares y el formateo queda en un solo lado.
 */
@Component({
  selector: 'app-movimientos-table',
  imports: [MovimientoRow],
  templateUrl: './movimientos-table.html',
  styleUrl: './movimientos-table.css',
})
export class MovimientosTable {
  readonly movimientos = input.required<readonly Movimiento[]>();
  readonly canReverse = input(false);
  readonly busy = input(false);
  /** Texto de la fila vacía, para que cada sección lo adapted. */
  readonly emptyMessage = input('No hay movimientos para mostrar.');

  readonly reverse = output<Movimiento>();
}