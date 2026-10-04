import { Movimiento } from './movimiento.model';

/**
 * `Report`: una cuenta del cliente con los movimientos del rango consultado.
 */
export interface Reporte {
  clienteId: string;
  cuentaId: string;
  tipoCuenta: string;
  estado: string;
  saldo: number;
  movimientos: Movimiento[];
}