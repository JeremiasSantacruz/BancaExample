import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Movimiento} from '../../core/models/movimiento.model';
import {MovimientoRow} from '../movimiento-row/movimiento-row';

@Component({
  selector: 'app-movimientos-table',
  imports: [MovimientoRow],
  templateUrl: './movimientos-table.html',
  styleUrl: './movimientos-table.css',
  host: {style: 'display: block'},
})
export class MovimientosTable {
  @Input() busy = false;
  @Input({required: true}) movimientos!: Movimiento[];
  @Output() readonly editMovimiento = new EventEmitter<Movimiento>();
  @Output() readonly deleteMovimiento = new EventEmitter<Movimiento>();
}
