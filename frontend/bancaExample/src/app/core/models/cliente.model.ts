/**
 * Estados posibles para un Cliente
 */
export type ClienteEstado = 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO' | 'CERRADO';

/**
 * Modelo que representa un Cliente del sistema bancario
 */
export interface Cliente {
  clienteId: string;
  nombre: string;
  identificacion: string;
  direccion: string;
  telefono: string;
  genero: string;
  edad: number;
  estado: ClienteEstado;
  contrasena: string;
}

/**
 * DTO para crear un nuevo cliente (sin clienteId)
 */
export type ClienteCreateDTO = Omit<Cliente, 'clienteId'>;

/**
 * DTO para actualizar un cliente existente (todos los campos opcionales)
 */
export type ClienteUpdateDTO = Partial<ClienteCreateDTO>;

