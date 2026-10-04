import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable, tap } from 'rxjs';
import {
  ESTADOS_APLICADOS,
  ExtraccionDiaria,
  Movimiento,
  MovimientoCreateDTO,
  MovimientoEstado,
  MovimientoFilters,
  normalizarEstado,
  Pagina,
} from '../model';
import { ApiService } from './api.service';
import { EntityStore } from './entity-store';
import { conRetardo } from './retardo-busqueda';

/**
 * Datos y operaciones de movimientos.
 *
 * Un movimiento `APPROVED` o `REVERSED_CORRECTION` es el único que mueve el
 * saldo de la cuenta. Como el listado está paginado, esos totales y los de las
 * tarjetas de resumen son los de la página visible, no los del histórico
 * completo.
 */
@Injectable({ providedIn: 'root' })
export class MovimientoService extends EntityStore<Movimiento> {
  private readonly api = inject(ApiService);
  private readonly endpoint = '/movimientos';

  private readonly filtersState = signal<MovimientoFilters>({});
  private readonly searchTermState = signal('');
  private readonly loadedState = signal(false);
  private readonly paginaSuciaState = signal(false);

  readonly filters = this.filtersState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  /** `true` cuando el historial ya se trajo al menos una vez. */
  readonly loaded = this.loadedState.asReadonly();

  /** Movimientos de la página que efectivamente afectaron el saldo. */
  readonly appliedMovimientos = computed(() =>
    this.items().filter((movimiento) => ESTADOS_APLICADOS.includes(movimiento.estado)),
  );

  readonly appliedDeposits = computed(() => this.totalPorTipo('DEPOSITO'));

  readonly appliedWithdrawals = computed(() => this.totalPorTipo('RETIRO'));

  /** Resultado neto de los movimientos aplicados de la página. */
  readonly netAmount = computed(() => this.appliedDeposits() - this.appliedWithdrawals());

  /** Filas de la tabla: la página que pidió el backend. */
  readonly visibleMovimientos = computed(() => this.items());

  /** Movimientos de una cuenta dentro de la página actual. */
  movimientosDe(cuentaId: string): Movimiento[] {
    return this.items().filter((movimiento) => movimiento.cuentaId === cuentaId);
  }

  /** Envía la búsqueda al backend una vez que el usuario deja de escribir. */
  private readonly buscar = conRetardo<string>(() => this.reiniciarPaginaYConsultar());

  /** Carga el historial solo si todavía no está. */
  ensureLoaded(): void {
    if (!this.loadedState() || this.paginaSuciaState()) {
      this.cargarMovimientos();
    }
  }

  /**
   * `GET /movimientos`, página actual.
   */
  cargarMovimientos(): void {
    this.filtersState.set({});
    this.reiniciarPaginaYConsultar();
  }

  /**
   * `GET /movimientos/buscar` con `cuentaId`, `inicio` y `fin` (`YYYY-MM-DD`).
   */
  cargarMovimientosFiltrados(filtros: MovimientoFilters): void {
    this.filtersState.set(filtros);
    this.reiniciarPaginaYConsultar();
  }

  /** Vuelve a pedir la página actual, con los filtros ya aplicados. */
  protected cargarPagina(): void {
    this.consultar();
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
  }

  /**
   * Marca la página como vieja y la vuelve a pedir, si ya se había cargado.
   */
  refrescar(): void {
    this.invalidar();

    if (this.loadedState()) {
      this.ensureLoaded();
    }
  }

  /**
   * `GET /movimientos/{movimientoId}`.
   */
  obtenerMovimiento(movimientoId: string): Observable<Movimiento> {
    return this.api
      .get<Movimiento>(`${this.endpoint}/${movimientoId}`)
      .pipe(tap((movimiento) => this.normalizar(movimiento)));
  }

  /**
   * `POST /movimientos`. Requiere cuenta y cliente `ACTIVO`/`ACTIVA`, saldo
   * suficiente y, en retiros, el límite diario (`MAXIMO_RETIRO_DIARIO`).
   */
  crearMovimiento(movimiento: MovimientoCreateDTO): Observable<Movimiento> {
    this.startLoading();

    return this.api
      .post<Movimiento>(this.endpoint, this.normalizarFecha(movimiento))
      .pipe(
        tap(() => this.cargarPagina()),
        finalize(() => this.stopLoading()),
      );
  }

  /**
   * `PUT /movimientos/{movimientoId}`.
   *
   * No reemplaza el registro: el backend marca el original como `REVERSED` y
   * crea uno nuevo `REVERSED_CORRECTION` con los datos corregidos. Por eso
   * recargamos el listado en vez de parchearlo localmente.
   */
  revertirMovimiento(movimientoId: string): Observable<Movimiento> {
    this.startLoading();

    return this.api.put<Movimiento>(`${this.endpoint}/${movimientoId}`, null).pipe(
      tap(() => this.cargarPagina()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `DELETE /movimientos/{movimientoId}`.
   */
  eliminarMovimiento(movimientoId: string): Observable<void> {
    this.startLoading();

    return this.api.delete<void>(`${this.endpoint}/${movimientoId}`).pipe(
      tap(() => this.cargarPagina()),
      finalize(() => this.stopLoading()),
    );
  }

  /**
   * `GET /movimientos/cuentas/{cuentaId}/extracciones-diarias?fecha=YYYY-MM-DD`.
   * Devuelve cero cuando no hubo retiros efectivos ese día.
   */
  obtenerExtraccionDiaria(cuentaId: string, fecha: string): Observable<ExtraccionDiaria> {
    return this.api
      .get<ExtraccionDiaria>(`${this.endpoint}/cuentas/${cuentaId}/extracciones-diarias`, {
        fecha,
      })
      .pipe(
        map((respuesta) => ({ ...respuesta, totalExtraido: Number(respuesta.totalExtraido) })),
      );
  }

  /** Búsqueda rápida: viaja al backend, así que hay que recargar la tabla. */
  setSearchTerm(termino: string): void {
    this.searchTermState.set(termino);
    this.buscar(termino);
  }

  limpiarFiltros(): void {
    this.filtersState.set({});
    this.searchTermState.set('');
    this.reiniciarPaginaYConsultar();
  }

  private consultar(): void {
    this.startLoading();

    this.api
      .get<Pagina<Movimiento>>(`${this.endpoint}/buscar`, {
        ...this.filtersState(),
        search: this.searchTermState(),
        page: this.page(),
        size: this.size(),
      })
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => {
          this.setPagina(pagina, (movimiento) => this.normalizar(movimiento));
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

  private totalPorTipo(tipo: Movimiento['tipoMovimiento']): number {
    return this.appliedMovimientos()
      .filter((movimiento) => movimiento.tipoMovimiento === tipo)
      .reduce((total, movimiento) => total + Number(movimiento.valor), 0);
  }

  /** El backend devuelve el enum del estado en mayúsculas. */
  private normalizar(movimiento: Movimiento): Movimiento {
    return {
      ...movimiento,
      estado: normalizarEstado<MovimientoEstado>(movimiento.estado) ?? 'REJECTED',
      valor: Number(movimiento.valor),
    };
  }

  /**
   * El backend espera un `LocalDateTime`, pero `<input type="datetime-local">`
   * entrega `YYYY-MM-DDTHH:mm`, sin segundos.
   */
  private normalizarFecha(movimiento: MovimientoCreateDTO): MovimientoCreateDTO {
    if (movimiento.fecha.length === 16) {
      return { ...movimiento, fecha: `${movimiento.fecha}:00` };
    }

    return movimiento;
  }
}