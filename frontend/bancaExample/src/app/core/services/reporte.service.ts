import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from './api.service';
import {Reporte} from '../models/reporte.model';
import {Movimiento} from '../models/movimiento.model';

@Injectable({providedIn: 'root'})
export class ReporteService {
  private readonly api = inject(ApiService);

  obtener(clienteId: string, inicio: string, fin: string): Observable<Reporte[]> {
    return this.api.get<Reporte[]>('http://localhost:8080/reportes', {clienteId, inicio, fin});
  }

  obtenerMovimientos(reportes: Reporte[]): Movimiento[] {
    return reportes.flatMap(reporte => reporte.movimientos);
  }

  calcularDepositos(movimientos: Movimiento[]): number {
    return this.calcularTotal(movimientos, 'DEPOSITO');
  }

  calcularRetiros(movimientos: Movimiento[]): number {
    return this.calcularTotal(movimientos, 'RETIRO');
  }

  private calcularTotal(movimientos: Movimiento[], tipo: Movimiento['tipoMovimiento']): number {
    return movimientos
      .filter(movimiento => movimiento.tipoMovimiento === tipo
        && (movimiento.estado === 'APPROVED' || movimiento.estado === 'REVERSED_CORRECTION'))
      .reduce((total, movimiento) => total + Number(movimiento.valor), 0);
  }
}
