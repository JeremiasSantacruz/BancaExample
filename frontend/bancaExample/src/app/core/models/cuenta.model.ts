/**
 * Estados posibles para una Cuenta
 */
export type CuentaEstado = 'ACTIVA' | 'BLOQUEADA' | 'INACTIVA' | 'CERRADA';

/**
 * Tipos de cuenta disponibles
 */
export type TipoCuenta = 'AHORRO' | 'CORRIENTE' | 'PLAZO_FIJO';

/**
 * Modelo que representa una Cuenta bancaria
 */
export interface Cuenta {
  cuentaId: string;
  clienteId: string;
  tipoCuenta: TipoCuenta;
  estado: CuentaEstado;
  saldoInicial: number;
}

/**
 * DTO para crear una nueva cuenta
 */
export interface CuentaCreateDTO {
  clienteId: string;
  tipoCuenta: TipoCuenta;
}

/**
 * DTO para actualizar una cuenta existente
 */
export interface CuentaUpdateDTO {
  tipoCuenta?: TipoCuenta;
  estado?: CuentaEstado;
  saldoInicial?: number;
}

