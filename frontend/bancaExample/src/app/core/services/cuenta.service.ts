import {Injectable} from '@angular/core';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Cuenta, CuentaCreateDTO, CuentaEstado, CuentaUpdateDTO} from '../models/cuenta.model';
import {ApiService} from './api.service';

/**
 * Servicio para gestionar operaciones de Cuentas
 * Implementa Single Responsibility Principle (SRP)
 * Solo maneja la lógica de negocio relacionada con cuentas
 *
 * @example
 * this.cuentaService.obtenerCuentasDelCliente(clienteId).subscribe(cuentas => {
 *   console.log(cuentas);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class CuentaService {
  private readonly endpoint = '/cuentas';

  constructor(private readonly api: ApiService) {
  }

  buscarEnServidor(filters: Record<string, string>): Observable<Cuenta[]> {
    return this.api.get<Cuenta[]>(this.endpoint + '/buscar', filters);
  }

  /**
   * Obtiene las cuentas de un cliente específico
   */
  obtenerCuentasDelCliente(clienteId: string): Observable<Cuenta[]> {
    return this.api.get<Cuenta[]>(`${this.endpoint}/${clienteId}`);
  }

  /**
   * Obtiene las cuentas de múltiples clientes
   */
  obtenerCuentasDeMultiplesClientes(clienteIds: string[]): Observable<Cuenta[]> {
    if (clienteIds.length === 0) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    return forkJoin(clienteIds.map((clienteId) => this.obtenerCuentasDelCliente(clienteId))).pipe(
      map((resultados) => resultados.flat()),
    );
  }

  /**
   * Crea una nueva cuenta
   */
  crearCuenta(cuenta: CuentaCreateDTO): Observable<Cuenta> {
    return this.api.post<Cuenta>(this.endpoint, cuenta);
  }

  /**
   * Actualiza una cuenta existente
   */
  actualizarCuenta(
    clienteId: string,
    cuentaId: string,
    cuenta: CuentaUpdateDTO,
  ): Observable<Cuenta> {
    return this.api.put<Cuenta>(`${this.endpoint}/${clienteId}/${cuentaId}`, cuenta);
  }

  /**
   * Elimina una cuenta (la cierra)
   */
  eliminarCuenta(clienteId: string, cuentaId: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${clienteId}/${cuentaId}`);
  }

  /**
   * Normaliza el estado de una cuenta
   */
  normalizarEstado(estado: string): CuentaEstado {
    const estadoNormalizado = estado.toUpperCase();
    const estadosValidos: CuentaEstado[] = ['ACTIVA', 'BLOQUEADA', 'INACTIVA', 'CERRADA'];

    if (estadosValidos.includes(estadoNormalizado as CuentaEstado)) {
      return estadoNormalizado as CuentaEstado;
    }

    throw new Error(`Estado de cuenta no reconocido: ${estado}`);
  }

  /**
   * Cuenta las cuentas con un estado específico
   */
  contarPorEstado(cuentas: Cuenta[], estado: CuentaEstado): number {
    return cuentas.filter((cuenta) => cuenta.estado === estado).length;
  }

  /**
   * Calcula el saldo total de un conjunto de cuentas
   */
  calcularSaldoTotal(cuentas: Cuenta[]): number {
    return cuentas.reduce((total, cuenta) => total + Number(cuenta.saldoInicial), 0);
  }

  /**
   * Busca cuentas por término (busca en múltiples campos)
   */
  buscar(
    cuentas: Cuenta[],
    termino: string,
    nombreClienteFn?: (clienteId: string) => string,
  ): Cuenta[] {
    const termoBuscado = termino.trim().toLocaleLowerCase();

    if (!termoBuscado) {
      return cuentas;
    }

    return cuentas.filter((cuenta) => {
      const clienteName = nombreClienteFn ? nombreClienteFn(cuenta.clienteId) : '';
      return [
        cuenta.cuentaId,
        cuenta.clienteId,
        clienteName,
        cuenta.tipoCuenta,
        cuenta.estado,
        cuenta.saldoInicial.toString(),
      ].some((valor) => String(valor).toLocaleLowerCase().includes(termoBuscado));
    });
  }

  /**
   * Filtra cuentas por cliente
   */
  filtrarPorCliente(cuentas: Cuenta[], clienteId: string | null | undefined): Cuenta[] {
    if (!clienteId) {
      return cuentas;
    }
    return cuentas.filter((cuenta) => cuenta.clienteId === clienteId);
  }

  /**
   * Obtiene cuentas activas
   */
  obtenerActivas(cuentas: Cuenta[]): Cuenta[] {
    return cuentas.filter((cuenta) => cuenta.estado === 'ACTIVA');
  }
}
