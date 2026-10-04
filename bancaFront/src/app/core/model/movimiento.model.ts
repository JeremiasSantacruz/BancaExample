/**
 * Tipos de movimiento (dominio `TipoMovimiento`).
 *
 * La API también acepta los valores legados `DEBITO` y `CREDITO`, que el
 * backend normaliza a `RETIRO` y `DEPOSITO`.
 */
export type MovimientoTipo = 'DEPOSITO' | 'RETIRO';

export const MOVIMIENTO_TIPOS: readonly MovimientoTipo[] = ['DEPOSITO', 'RETIRO'];

/**
 * Estados de transacción (dominio `EstadoTransaccionMovimiento`).
 */
export type MovimientoEstado =
  | 'APPROVED'
  | 'REVERSED'
  | 'REVERSED_CORRECTION'
  | 'REJECTED';

export const MOVIMIENTO_ESTADOS: readonly MovimientoEstado[] = [
  'APPROVED',
  'REVERSED',
  'REVERSED_CORRECTION',
  'REJECTED',
];

/**
 * Estados que efectivamente mueven el saldo de la cuenta. Una corrección
 * (`REVERSED_CORRECTION`) también lo hace, y por eso cuenta como aplicada.
 */
export const ESTADOS_APLICADOS: readonly MovimientoEstado[] = ['APPROVED', 'REVERSED_CORRECTION'];

/**
 * Movimiento (transacción). Refleja `MovimientoResponse`.
 */
export interface Movimiento {
  movimientoId: string;
  cuentaId: string;
  /** `LocalDateTime` en ISO, por ejemplo `2026-10-04T10:15:00`. */
  fecha: string;
  tipoMovimiento: MovimientoTipo;
  valor: number;
  estado: MovimientoEstado;
}

/**
 * `MovimientoRequest`: todos los campos son obligatorios y el valor debe ser positivo.
 */
export type MovimientoCreateDTO = Omit<Movimiento, 'movimientoId'>;

/**
 * Filtros de `GET /movimientos/buscar`. Las fechas son `YYYY-MM-DD`.
 */
export interface MovimientoFilters {
  cuentaId?: string;
  inicio?: string;
  fin?: string;
}

/**
 * `SaldoExtraccionesDiariasResponse`.
 */
export interface ExtraccionDiaria {
  cuentaId: string;
  fecha: string;
  totalExtraido: number;
}