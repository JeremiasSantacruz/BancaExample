import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Movimiento, MovimientoCreateDTO, MovimientoUpdateDTO,} from '../models/movimiento.model';
import {ApiService} from './api.service';

/**
 * Servicio para gestionar operaciones de Movimientos (transacciones)
 * Implementa Single Responsibility Principle (SRP)
 * Solo maneja la lógica de negocio relacionada con movimientos
 *
 * @example
 * this.movimientoService.obtenerMovimientos().subscribe(movimientos => {
 *   console.log(movimientos);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class MovimientoService {
  private readonly endpoint = '/movimientos';

  constructor(private readonly api: ApiService) {
  }

  buscarEnServidor(filters: Record<string, string>): Observable<Movimiento[]> {
    return this.api.get<Movimiento[]>(this.endpoint + '/buscar', filters);
  }

  /**
   * Obtiene todos los movimientos registrados
   */
  obtenerMovimientos(): Observable<Movimiento[]> {
    return this.api.get<Movimiento[]>(this.endpoint);
  }

  /**
   * Crea un nuevo movimiento
   */
  crearMovimiento(movimiento: MovimientoCreateDTO): Observable<Movimiento> {
    const payload = this.normalizarFecha(movimiento);
    return this.api.post<Movimiento>(this.endpoint, payload);
  }

  /**
   * Actualiza un movimiento existente
   */
  actualizarMovimiento(
    movimientoId: string,
    movimiento: MovimientoUpdateDTO,
  ): Observable<Movimiento> {
    return this.api.put<Movimiento>(`${this.endpoint}/${movimientoId}`, {estado: movimiento.estado});
  }

  /**
   * Elimina un movimiento
   */
  eliminarMovimiento(movimientoId: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${movimientoId}`);
  }

  /**
   * Calcula la suma de movimientos de depósito APPROVEDs
   */
  calcularDepositos(movimientos: Movimiento[]): number {
    return movimientos
      .filter((m) => m.tipoMovimiento === 'DEPOSITO' && ['APPROVED', 'APPROVED'].includes(m.estado))
      .reduce((total, m) => total + Number(m.valor), 0);
  }

  /**
   * Calcula la suma de movimientos de retiro APPROVEDs
   */
  calcularRetiros(movimientos: Movimiento[]): number {
    return movimientos
      .filter((m) => m.tipoMovimiento === 'RETIRO' && ['APPROVED', 'APPROVED'].includes(m.estado))
      .reduce((total, m) => total + Number(m.valor), 0);
  }

  /**
   * Busca movimientos por término
   */
  buscar(movimientos: Movimiento[], termino: string): Movimiento[] {
    const termoBuscado = termino.trim().toLocaleLowerCase();

    if (!termoBuscado) {
      return movimientos;
    }

    return movimientos.filter((movimiento) =>
      [
        movimiento.movimientoId,
        movimiento.cuentaId,
        movimiento.tipoMovimiento,
        movimiento.estado,
        movimiento.fecha,
        movimiento.valor.toString(),
      ].some((valor) => String(valor).toLocaleLowerCase().includes(termoBuscado)),
    );
  }

  /**
   * Filtra movimientos por rango de fechas
   */
  filtrarPorFecha(movimientos: Movimiento[], desde: string, hasta: string): Movimiento[] {
    return movimientos.filter((movimiento) => {
      const fecha = movimiento.fecha.slice(0, 10);
      const estaEnRango = (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
      return estaEnRango;
    });
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      if (Number.isNaN(date.getTime())) {
        return fecha;
      }

      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return fecha;
    }
  }

  /**
   * Normaliza la fecha al formato requerido por el servidor
   */
  private normalizarFecha(
    movimiento: MovimientoCreateDTO,
  ): MovimientoCreateDTO {
    if (!movimiento.fecha) {
      return movimiento;
    }

    const fecha = movimiento.fecha;
    const tieneSegundos = fecha.length > 16;

    if (!tieneSegundos && fecha.length === 16) {
      return {
        ...movimiento,
        fecha: `${fecha}:00`,
      };
    }

    return movimiento;
  }
}
