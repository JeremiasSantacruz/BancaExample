/**
 * Estados posibles para una Cuenta (dominio `EstadoCuenta`).
 */
export type CuentaEstado = 'ACTIVA' | 'BLOQUEADA' | 'INACTIVA' | 'CERRADA';

/**
 * Únicamente `ACTIVA` permite operar sobre la cuenta.
 */
export const CUENTA_ESTADOS: readonly CuentaEstado[] = [
  'ACTIVA',
  'BLOQUEADA',
  'INACTIVA',
  'CERRADA',
];

/**
 * Tipos de cuenta disponibles (dominio `TipoCuenta`).
 */
export type TipoCuenta = 'AHORRO' | 'CORRIENTE' | 'PLAZO_FIJO';

export const TIPOS_CUENTA: readonly TipoCuenta[] = ['AHORRO', 'CORRIENTE', 'PLAZO_FIJO'];

/**
 * Cuenta bancaria. Refleja `CuentaResponse`, que expone el saldo en `saldo`.
 */
export interface Cuenta {
  cuentaId: string;
  clienteId: string;
  tipoCuenta: TipoCuenta;
  estado: CuentaEstado;
  saldo: number;
}

/**
 * `CreateCuentaRequest`: solo admite cliente y tipo, el saldo inicial lo
 * define el backend.
 */
export interface CuentaCreateDTO {
  clienteId: string;
  tipoCuenta: TipoCuenta;
}

/**
 * `CuentaRequest`. Ojo: el comando de actualización sigue llamándose
 * `saldoInicial` aunque la respuesta lo devuelva como `saldo`.
 */
export interface CuentaUpdateDTO {
  clienteId?: string;
  tipoCuenta?: TipoCuenta;
  estado?: CuentaEstado;
  saldoInicial?: number;
}

/**
 * Filtros de `GET /cuentas/buscar`.
 */
export interface CuentaFilters {
  clienteId?: string;
  tipoCuenta?: TipoCuenta;
  estado?: CuentaEstado;
}

/**
 * Lo que devuelve el formulario de cuentas.
 *
 * El alta solo necesita cliente y tipo (`CreateCuentaRequest`), pero la
 * actualización admite estado y saldo (`CuentaRequest`). Un único tipo evita
 * que la sección tenga que conocer la forma de cada endpoint.
 */
export interface CuentaFormValue {
  /** Presente solo en modo edición. */
  cuentaId?: string;
  clienteId: string;
  tipoCuenta: TipoCuenta;
  estado: CuentaEstado;
  saldoInicial?: number;
}