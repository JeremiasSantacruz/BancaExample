/**
 * Estados posibles para un Cliente (dominio `EstadoCliente`).
 */
export type ClienteEstado = 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO' | 'CERRADO';

/**
 * Únicamente `ACTIVO` habilita operaciones sobre el cliente y sus cuentas.
 */
export const CLIENTE_ESTADOS: readonly ClienteEstado[] = [
  'ACTIVO',
  'BLOQUEADO',
  'INACTIVO',
  'CERRADO',
];

/**
 * Cliente del sistema bancario.
 *
 * Refleja `ClienteResponse`: el `contrasena` viaja en la respuesta porque el
 * backend no lo excluye, aunque la interfaz nunca lo muestra.
 */
export interface Cliente {
  clienteId: string;
  contrasena: string;
  estado: ClienteEstado;
  nombre: string;
  genero: string;
  edad: number;
  identificacion: string;
  direccion: string;
  telefono: string;
}

/**
 * `ClienteRequest`: el backend valida todos los campos con `@NotNull`,
 * por eso no se puede crear ni actualizar un cliente con campos sueltos.
 */
export type ClienteCreateDTO = Omit<Cliente, 'clienteId'>;

/**
 * `PUT /clientes/{clienteId}` espera el mismo `ClienteRequest` completo.
 */
export type ClienteUpdateDTO = ClienteCreateDTO;

/**
 * Filtros de `GET /clientes`, que acepta `nombre`, `identificacion` y `estado`.
 */
export interface ClienteFilters {
  nombre?: string;
  identificacion?: string;
  estado?: ClienteEstado;
}