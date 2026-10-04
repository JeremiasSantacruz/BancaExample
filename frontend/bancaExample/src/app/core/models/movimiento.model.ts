/**
 * Estados posibles para un Movimiento
 */
export type MovimientoEstado =
  | 'APPROVED'
  | 'REVERSED'
  | 'REVERSED_CORRECTION'
  | 'REJECTED';

/**
 * Tipos de movimientos disponibles
 */
export type MovimientoTipo = 'DEPOSITO' | 'RETIRO';

/**
 * Modelo que representa un Movimiento (transacción)
 */
export interface Movimiento {
  movimientoId: string;
  cuentaId: string;
  fecha: string;
  tipoMovimiento: MovimientoTipo;
  valor: number;
  estado: MovimientoEstado;
}

/**
 * DTO para crear un nuevo movimiento
 */
export interface MovimientoCreateDTO {
  cuentaId: string;
  fecha: string;
  tipoMovimiento: MovimientoTipo;
  valor: number;
  estado?: MovimientoEstado;
}

/**
 * DTO para actualizar un movimiento existente
 */
export interface MovimientoUpdateDTO {
  estado: 'REVERSED';
}
