import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Cliente, ClienteCreateDTO, ClienteEstado, ClienteUpdateDTO,} from '../models/cliente.model';
import {ApiService} from './api.service';

/**
 * Servicio para gestionar operaciones de Clientes
 * Implementa Single Responsibility Principle (SRP)
 * Solo maneja la lógica de negocio relacionada con clientes
 *
 * @example
 * this.clienteService.obtenerClientes().subscribe(clientes => {
 *   console.log(clientes);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  private readonly endpoint = '/clientes';

  constructor(private readonly api: ApiService) {
  }

  buscarEnServidor(filters: Record<string, string>): Observable<Cliente[]> {
    return this.api.get<Cliente[]>(this.endpoint + '/buscar', filters);
  }

  /**
   * Obtiene todos los clientes registrados
   */
  obtenerClientes(): Observable<Cliente[]> {
    return this.api.get<Cliente[]>(this.endpoint);
  }

  /**
   * Obtiene un cliente específico por ID
   */
  obtenerCliente(clienteId: string): Observable<Cliente> {
    return this.api.get<Cliente>(`${this.endpoint}/${clienteId}`);
  }

  /**
   * Crea un nuevo cliente
   */
  crearCliente(cliente: ClienteCreateDTO): Observable<Cliente> {
    return this.api.post<Cliente>(this.endpoint, cliente);
  }

  /**
   * Actualiza un cliente existente
   */
  actualizarCliente(clienteId: string, cliente: ClienteUpdateDTO): Observable<Cliente> {
    return this.api.put<Cliente>(`${this.endpoint}/${clienteId}`, cliente);
  }

  /**
   * Elimina un cliente
   */
  eliminarCliente(clienteId: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${clienteId}`);
  }

  /**
   * Normaliza el estado de un cliente (asegura que sea un valor válido)
   */
  normalizarEstado(estado: string): ClienteEstado {
    const estadoNormalizado = estado.toUpperCase();
    const estadosValidos: ClienteEstado[] = ['ACTIVO', 'BLOQUEADO', 'INACTIVO', 'CERRADO'];

    if (estadosValidos.includes(estadoNormalizado as ClienteEstado)) {
      return estadoNormalizado as ClienteEstado;
    }

    throw new Error(`Estado de cliente no reconocido: ${estado}`);
  }

  /**
   * Cuenta los clientes con un estado específico
   */
  contarPorEstado(clientes: Cliente[], estado: ClienteEstado): number {
    return clientes.filter((cliente) => cliente.estado === estado).length;
  }

  /**
   * Busca clientes por término (busca en múltiples campos)
   */
  buscar(clientes: Cliente[], termino: string): Cliente[] {
    const termoBuscado = termino.trim().toLocaleLowerCase();

    if (!termoBuscado) {
      return clientes;
    }

    return clientes.filter((cliente) =>
      [
        cliente.clienteId,
        cliente.nombre,
        cliente.identificacion,
        cliente.telefono,
        cliente.direccion,
        cliente.genero,
        cliente.edad.toString(),
        cliente.estado,
      ].some((valor) => String(valor).toLocaleLowerCase().includes(termoBuscado)),
    );
  }

  /**
   * Obtiene el nombre de un cliente por ID
   */
  obtenerNombre(clientes: Cliente[], clienteId: string): string {
    return (
      clientes.find((cliente) => cliente.clienteId === clienteId)?.nombre ?? `Cliente ${clienteId}`
    );
  }

  /**
   * Valida si un cliente existe en la lista
   */
  existe(clientes: Cliente[], clienteId: string): boolean {
    return clientes.some((cliente) => cliente.clienteId === clienteId);
  }
}
