import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';
import {
  Cliente,
  ClienteCreateDTO,
  ClienteEstado,
  ClienteFilters,
  ClienteUpdateDTO,
  normalizarEstado,
  Pagina,
  SIN_LIMITE,
} from '../model';
import { ApiService } from './api.service';
import { EntityStore } from './entity-store';
import { conRetardo } from './retardo-busqueda';

/**
 * Datos y operaciones de clientes.
 *
 * Es la única fuente de verdad del listado: los componentes leen los signals
 * derivados y llaman a los métodos de escritura.
 *
 * Mantiene dos colecciones distintas:
 *
 * - `items`: la página que muestra la tabla de clientes.
 * - `catalogo`: todos los clientes (`size=all`), del que salen los selectores,
 *   los nombres de los titulares y las tarjetas de resumen. Un select que solo
 *   tuviera la página actual dejaría fuera clientes válidos.
 */
@Injectable({ providedIn: 'root' })
export class ClienteService extends EntityStore<Cliente> {
  private readonly api = inject(ApiService);
  private readonly endpoint = '/clientes';

  private readonly filtersState = signal<ClienteFilters>({});
  private readonly searchTermState = signal('');
  private readonly catalogoState = signal<Cliente[]>([]);
  private readonly catalogoCargadoState = signal(false);
  private readonly loadedState = signal(false);
  private readonly paginaSuciaState = signal(false);
  private readonly catalogoSucioState = signal(false);

  /** Último filtro enviado al backend. */
  readonly filters = this.filtersState.asReadonly();
  /** Búsqueda rápida que se envía al backend. */
  readonly searchTerm = this.searchTermState.asReadonly();
  /** Todos los clientes, sin paginar. */
  readonly catalogo = this.catalogoState.asReadonly();
  /** `true` cuando el catálogo ya se trajo al menos una vez. */
  readonly catalogoCargado = this.catalogoCargadoState.asReadonly();
  /** `true` cuando la tabla ya trajo al menos una página. */
  readonly loaded = this.loadedState.asReadonly();

  /** Filas de la tabla: la página que pidió el backend, ya normalizada. */
  readonly visibleClientes = computed(() => this.items());

  readonly totalCatalogo = computed(() => this.catalogoState().length);
  readonly activeClientesCount = computed(() => this.contarCatalogoPorEstado('ACTIVO'));
  readonly blockedClientesCount = computed(() => this.contarCatalogoPorEstado('BLOQUEADO'));
  readonly hayCatalogo = computed(() => this.catalogoState().length > 0);

  /**
   * Índice `clienteId -> nombre` para que cuentas, movimientos y reportes
   * resuelvan el titular sin volver a pedir los clientes.
   */
  readonly nombresPorId = computed(() => {
    const indice = new Map<string, string>();
    for (const cliente of this.catalogoState()) {
      indice.set(cliente.clienteId, cliente.nombre);
    }
    return indice;
  });

  /** Clientes que pueden recibir cuentas o movimientos. */
  readonly clientesOperativos = computed(() =>
    this.catalogoState().filter((cliente) => cliente.estado === 'ACTIVO'),
  );

  /** Envía la búsqueda al backend una vez que el usuario deja de escribir. */
  private readonly buscar = conRetardo<string>(() => this.reiniciarPaginaYConsultar());

  /**
   * Carga el listado solo si todavía no está.
   *
   * Como el servicio es singleton, varias secciones pueden necesitar los
   * clientes sin generar requests de más.
   */
  ensureLoaded(): void {
    if (!this.loadedState() || this.paginaSuciaState()) {
      this.cargarClientes();
    }
  }

  /**
   * Carga el catálogo completo si todavía no está.
   *
   * Lo necesitan los selectores y las tarjetas de resumen, que no pueden
   * trabajar con una sola página.
   */
  ensureCatalogo(): void {
    if (!this.catalogoCargadoState() || this.catalogoSucioState()) {
      this.cargarCatalogo();
    }
  }

  /**
   * Marca los datos como desactualizados, sin pedir nada.
   *
   * El backend es la fuente de verdad: cuando otra pantalla modificó algo, se
   * marca acá y el próximo `ensureLoaded`/`ensureCatalogo` vuelve a preguntar al
   * servidor en lugar de mostrar la copia vieja.
   */
  invalidar(): void {
    this.paginaSuciaState.set(true);
    this.catalogoSucioState.set(true);
  }

  /**
   * Marca lo que quedó viejo y lo vuelve a pedir de una vez.
   *
   * Solo consulta lo que ya se había cargado, así invalidar desde una pantalla
   * que nunca se abrió no genera peticiones de más.
   */
  refrescar(): void {
    this.invalidar();

    if (this.loadedState()) {
      this.ensureLoaded();
    }

    if (this.catalogoCargadoState()) {
      this.ensureCatalogo();
    }
  }

  /**
   * Nombre de un cliente, o un placeholder si todavía no está cargado.
   */
  nombreDe(clienteId: string): string {
    return this.nombresPorId().get(clienteId) ?? `Cliente ${clienteId}`;
  }

  /**
   * `GET /clientes` con los filtros, la búsqueda y la página pedida.
   *
   * Cada filtro nuevo arranca en la primera página.
   */
  cargarClientes(filtros: ClienteFilters = this.filtersState()): void {
    this.filtersState.set(filtros);
    this.reiniciarPaginaYConsultar();
  }

  /** Vuelve a pedir la página actual, con los filtros ya aplicados. */
  protected cargarPagina(): void {
    this.consultar();
  }

  /**
   * `GET /clientes?size=all`: todos los clientes en una sola página.
   */
  cargarCatalogo(): void {
    this.api
      .get<Pagina<Cliente>>(this.endpoint, { size: SIN_LIMITE })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => {
          this.catalogoState.set((pagina.content ?? []).map((cliente) => this.normalizar(cliente)));
          this.catalogoCargadoState.set(true);
          this.catalogoSucioState.set(false);
        },
        error: (error: Error) => this.setError(error.message),
      });
  }

  /**
   * `GET /clientes/{clienteId}`.
   */
  obtenerCliente(clienteId: string): Observable<Cliente> {
    return this.api
      .get<Cliente>(`${this.endpoint}/${clienteId}`)
      .pipe(tap((cliente) => this.normalizar(cliente)));
  }

  /**
   * `POST /clientes`.
   *
   * Después del alta se recarga la página y el catálogo: el registro puede caer
   * fuera de la página o del filtro actual, y las tarjetas de resumen lo usan.
   */
  crearCliente(cliente: ClienteCreateDTO): Observable<Cliente> {
    this.startLoading();

    return this.api.post<Cliente>(this.endpoint, cliente).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `PUT /clientes/{clienteId}`.
   */
  actualizarCliente(clienteId: string, cambios: ClienteUpdateDTO): Observable<Cliente> {
    this.startLoading();

    return this.api.put<Cliente>(`${this.endpoint}/${clienteId}`, cambios).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `DELETE /clientes/{clienteId}`. El backend hace borrado lógico: las cuentas
   * del cliente pasan a `INACTIVA`, por eso no alcanza con sacar la fila.
   */
  eliminarCliente(clienteId: string): Observable<void> {
    this.startLoading();

    return this.api.delete<void>(`${this.endpoint}/${clienteId}`).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  /** Búsqueda rápida: viaja al backend, así que hay que recargar la tabla. */
  setSearchTerm(termino: string): void {
    this.searchTermState.set(termino);
    this.buscar(termino);
  }

  /** Deja los filtros y la búsqueda local limpios. */
  limpiarFiltros(): void {
    this.filtersState.set({});
    this.searchTermState.set('');
    this.reiniciarPaginaYConsultar();
  }

  private consultar(): void {
    this.startLoading();

    this.api
      .get<Pagina<Cliente>>(this.endpoint, {
        ...this.filtersState(),
        search: this.searchTermState(),
        page: this.page(),
        size: this.size(),
      })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => {
          this.setPagina(pagina, (cliente) => this.normalizar(cliente));
          this.loadedState.set(true);
          this.paginaSuciaState.set(false);
        },
        error: (error: Error) => this.setError(error.message),
      });
  }

  private reiniciarPaginaYConsultar(): void {
    this.setPaginaActual(0);
    this.consultar();
  }

  private refrescarListados(): void {
    this.consultar();

    if (this.catalogoCargadoState()) {
      this.cargarCatalogo();
    }
  }

  private contarCatalogoPorEstado(estado: ClienteEstado): number {
    return this.catalogoState().filter((cliente) => cliente.estado === estado).length;
  }

  /**
   * El backend responde `estado` en minúsculas, así que lo subimos a mayúsculas
   * y validamos contra el dominio.
   */
  private normalizar(cliente: Cliente): Cliente {
    return {
      ...cliente,
      estado: normalizarEstado<ClienteEstado>(cliente.estado) ?? 'CERRADO',
      edad: Number(cliente.edad),
    };
  }
}