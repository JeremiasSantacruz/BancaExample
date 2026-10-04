import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';
import {
  Cuenta,
  CuentaCreateDTO,
  CuentaEstado,
  CuentaFilters,
  CuentaUpdateDTO,
  normalizarEstado,
  Pagina,
  SIN_LIMITE,
  TipoCuenta,
} from '../model';
import { ApiService } from './api.service';
import { EntityStore } from './entity-store';
import { conRetardo } from './retardo-busqueda';

/**
 * Datos y operaciones de cuentas.
 *
 * El backend no expone un listado global de cuentas: `GET /cuentas/buscar` sin
 * filtros devuelve todas, y `GET /cuentas/{clienteId}` las de un cliente.
 *
 * Igual que en clientes, `items` es la página de la tabla y `catalogo` son todas
 * las cuentas, que es lo que necesitan los selectores de movimientos y reportes.
 */
@Injectable({ providedIn: 'root' })
export class CuentaService extends EntityStore<Cuenta> {
  private readonly api = inject(ApiService);
  private readonly endpoint = '/cuentas';

  private readonly filtersState = signal<CuentaFilters>({});
  private readonly searchTermState = signal('');
  private readonly catalogoState = signal<Cuenta[]>([]);
  private readonly catalogoCargadoState = signal(false);
  private readonly loadedState = signal(false);
  private readonly paginaSuciaState = signal(false);
  private readonly catalogoSucioState = signal(false);

  readonly filters = this.filtersState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  /**
   * Filtro por titular, que viaja al backend en `clienteId`.
   *
   * Se deriva de los filtros para que el selector de la barra y la tarjeta de
   * filtros no puedan quedar desincronizados.
   */
  readonly clienteFilter = computed(() => this.filtersState().clienteId ?? '');
  /** Todas las cuentas, sin paginar. */
  readonly catalogo = this.catalogoState.asReadonly();
  /** `true` cuando el catálogo ya se trajo al menos una vez. */
  readonly catalogoCargado = this.catalogoCargadoState.asReadonly();
  /** `true` cuando la tabla ya trajo al menos una página. */
  readonly loaded = this.loadedState.asReadonly();

  readonly activeCuentasCount = computed(
    () => this.catalogoState().filter((cuenta) => cuenta.estado === 'ACTIVA').length,
  );

  /** Suma de los saldos de todas las cuentas del catálogo. */
  readonly totalSaldo = computed(() =>
    this.catalogoState().reduce((total, cuenta) => total + Number(cuenta.saldo ?? 0), 0),
  );

  /** Filas de la tabla: la página que pidió el backend. */
  readonly visibleCuentas = computed(() => this.items());

  /** Cuentas activas del catálogo, para los selectores de la aplicación. */
  readonly cuentasOperativas = computed(() =>
    this.catalogoState().filter((cuenta) => cuenta.estado === 'ACTIVA'),
  );

  /**
   * `cuentaId -> cuenta`, para resolver movimientos y reportes sin repetir
   * peticiones.
   */
  readonly cuentasPorId = computed(() => {
    const indice = new Map<string, Cuenta>();
    for (const cuenta of this.catalogoState()) {
      indice.set(cuenta.cuentaId, cuenta);
    }
    return indice;
  });

  /** Envía la búsqueda al backend una vez que el usuario deja de escribir. */
  private readonly buscar = conRetardo<string>(() => this.reiniciarPaginaYConsultar());

  /** Cuentas de un cliente, tomadas del catálogo. */
  cuentasDe(clienteId: string): Cuenta[] {
    return this.catalogoState().filter((cuenta) => cuenta.clienteId === clienteId);
  }

  /** Carga las cuentas solo si todavía no están. */
  ensureLoaded(): void {
    if (!this.loadedState() || this.paginaSuciaState()) {
      this.cargarCuentas();
    }
  }

  /** Carga el catálogo completo si todavía no está. */
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

  /** Saldo de una cuenta, o `null` si todavía no está cargada. */
  saldoDe(cuentaId: string): number | null {
    return this.cuentasPorId().get(cuentaId)?.saldo ?? null;
  }

  /**
   * `GET /cuentas/buscar`. Sin filtros devuelve todas las cuentas.
   *
   * Cada filtro nuevo arranca en la primera página.
   */
  cargarCuentas(filtros: CuentaFilters = this.filtersState()): void {
    this.filtersState.set(filtros);
    this.reiniciarPaginaYConsultar();
  }

  /** Vuelve a pedir la página actual, con los filtros ya aplicados. */
  protected cargarPagina(): void {
    this.consultar();
  }

  /**
   * `GET /cuentas/buscar?size=all`: todas las cuentas en una sola página.
   */
  cargarCatalogo(): void {
    this.api
      .get<Pagina<Cuenta>>(`${this.endpoint}/buscar`, { size: SIN_LIMITE })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => {
          this.catalogoState.set((pagina.content ?? []).map((cuenta) => this.normalizar(cuenta)));
          this.catalogoCargadoState.set(true);
          this.catalogoSucioState.set(false);
        },
        error: (error: Error) => this.setError(error.message),
      });
  }

  /**
   * `GET /cuentas/{clienteId}?size=all`.
   *
   * Pide todas las cuentas del cliente porque el resultado se cruza contra el
   * catálogo, y un catálogo al que le falten cuentas rompería los selectores.
   */
  cargarCuentasDe(clienteId: string): Observable<Pagina<Cuenta>> {
    this.startLoading();

    return this.api.get<Pagina<Cuenta>>(`${this.endpoint}/${clienteId}`, { size: SIN_LIMITE }).pipe(
      tap((pagina) => this.registrarCuentasDe(clienteId, pagina)),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `GET /cuentas/{clienteId}/{cuentaId}`.
   */
  obtenerCuenta(cuentaId: string): Observable<Cuenta> {
    return this.api
      .get<Cuenta>(`${this.endpoint}/${this.clienteDe(cuentaId)}/${cuentaId}`)
      .pipe(tap((cuenta) => this.normalizar(cuenta)));
  }

  /**
   * `POST /cuentas`. El cliente debe estar `ACTIVO`; el backend valida la regla
   * y responde 422 si no lo está.
   */
  crearCuenta(cuenta: CuentaCreateDTO): Observable<Cuenta> {
    this.startLoading();

    return this.api.post<Cuenta>(this.endpoint, cuenta).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `PUT /cuentas/{clienteId}/{cuentaId}`. El comando sigue llamándose
   * `saldoInicial` aunque la respuesta lo devuelva como `saldo`.
   */
  actualizarCuenta(
    clienteId: string,
    cuentaId: string,
    cambios: CuentaUpdateDTO,
  ): Observable<Cuenta> {
    this.startLoading();

    return this.api.put<Cuenta>(`${this.endpoint}/${clienteId}/${cuentaId}`, cambios).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `DELETE /cuentas/{clienteId}/{cuentaId}`. El backend la deja `CERRADA`, así
   * que sale del listado de cuentas activas pero no del histórico.
   */
  eliminarCuenta(clienteId: string, cuentaId: string): Observable<void> {
    this.startLoading();

    return this.api.delete<void>(`${this.endpoint}/${clienteId}/${cuentaId}`).pipe(
      tap(() => this.refrescarListados()),
      finalize(() => this.stopLoading()),
    );
  }

  setSearchTerm(termino: string): void {
    this.searchTermState.set(termino);
    this.buscar(termino);
  }

  /** Filtra la tabla por titular; el filtro viaja al backend. */
  setClienteFilter(clienteId: string): void {
    this.filtersState.update((filtros) => ({ ...filtros, clienteId: clienteId || undefined }));
    this.reiniciarPaginaYConsultar();
  }

  limpiarFiltros(): void {
    this.filtersState.set({});
    this.searchTermState.set('');
    this.reiniciarPaginaYConsultar();
  }

  private consultar(): void {
    this.startLoading();

    this.api
      .get<Pagina<Cuenta>>(`${this.endpoint}/buscar`, {
        ...this.filtersState(),
        search: this.searchTermState(),
        page: this.page(),
        size: this.size(),
      })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => {
          this.setPagina(pagina, (cuenta) => this.normalizar(cuenta));
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

  /** Reemplaza en el catálogo las cuentas del cliente que acaban de llegar. */
  private registrarCuentasDe(clienteId: string, pagina: Partial<Pagina<Cuenta>> | null): void {
    const cuentas = (pagina?.content ?? []).map((cuenta) => this.normalizar(cuenta));

    this.catalogoState.update(
      (catalogo) => [...catalogo.filter((cuenta) => cuenta.clienteId !== clienteId), ...cuentas],
    );
    this.catalogoCargadoState.set(true);
  }

  /** El backend responde `estado` en minúsculas. */
  private normalizar(cuenta: Cuenta): Cuenta {
    return {
      ...cuenta,
      estado: normalizarEstado<CuentaEstado>(cuenta.estado) ?? 'CERRADA',
      tipoCuenta: cuenta.tipoCuenta as TipoCuenta,
      saldo: Number(cuenta.saldo ?? 0),
    };
  }

  /** Resuelve el `clienteId` de una cuenta a partir del catálogo cargado. */
  private clienteDe(cuentaId: string): string {
    return this.cuentasPorId().get(cuentaId)?.clienteId ?? '';
  }
}