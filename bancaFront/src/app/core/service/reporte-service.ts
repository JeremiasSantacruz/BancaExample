import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap, throwError } from 'rxjs';
import { ESTADOS_APLICADOS, Movimiento, Pagina, Reporte } from '../model';
import { ApiService } from './api.service';
import { EntityStore } from './entity-store';

/**
 * Reportes de movimientos por cliente.
 *
 * `GET /reportes` es una consulta: no tiene alta ni edición, así que el store
 * solo guarda el resultado de la última consulta.
 *
 * La paginación es por cuenta: cada bloque trae todos los movimientos de esa
 * cuenta en el rango, y `totalElements` cuenta las cuentas del cliente.
 */
@Injectable({ providedIn: 'root' })
export class ReporteService extends EntityStore<Reporte> {
  private readonly api = inject(ApiService);
  private readonly endpoint = '/reportes';

  private readonly clienteIdState = signal<string>('');
  private readonly desdeState = signal<string>('');
  private readonly hastaState = signal<string>('');
  private readonly consultadoState = signal(false);

  readonly clienteId = this.clienteIdState.asReadonly();
  readonly desde = this.desdeState.asReadonly();
  readonly hasta = this.hastaState.asReadonly();
  /** `true` una vez que el usuario ejecutó una consulta. */
  readonly consultado = this.consultadoState.asReadonly();

  /** `true` si el rango de fechas está invertido. */
  readonly rangoInvertido = computed(() => this.rangoEsInvertido(this.desdeState(), this.hastaState()));

  /** Bloques de la página actual: una cuenta con sus movimientos. */
  readonly bloques = computed(() => this.items());

  /** Movimientos de los bloques visibles, aplanados. */
  readonly movimientos = computed(() =>
    this.items().flatMap((reporte) => reporte.movimientos ?? []),
  );

  /** Cuentas del cliente, en total y no solo las de la página visible. */
  readonly totalCuentas = computed(() => this.total());
  /** Cuentas de la página visible. */
  readonly cuentasDeLaPagina = computed(() => this.items().length);

  readonly totalDepositos = computed(() => this.totalPorTipo('DEPOSITO'));
  readonly totalRetiros = computed(() => this.totalPorTipo('RETIRO'));
  /** Movimientos de la página visible. */
  readonly totalMovimientos = computed(() => this.movimientos().length);

  /** `GET /reportes`. `clienteId` es obligatorio; el rango es opcional. */
  generar(clienteId: string, desde = this.desdeState(), hasta = this.hastaState()): void {
    if (!clienteId.trim()) {
      this.setError('Seleccioná un cliente para generar el reporte.');
      return;
    }

    // Se valida contra los argumentos, no contra las señales: quien llama puede
    // pasar un rango sin haberlo escrito todavía en el formulario.
    if (this.rangoEsInvertido(desde, hasta)) {
      this.setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    this.clienteIdState.set(clienteId);
    this.desdeState.set(desde);
    this.hastaState.set(hasta);
    this.consultadoState.set(true);
    // Una consulta nueva siempre arranca en la primera página de cuentas.
    this.setPaginaActual(0);
    this.consultar();
  }

  /**
   * Igual que `generar` pero devuelve el Observable, para que la sección pueda
   * encadenar la descarga o limpiar el estado.
   */
  generarObservable(
    clienteId: string,
    desde = this.desdeState(),
    hasta = this.hastaState(),
  ): Observable<Pagina<Reporte>> {
    if (this.rangoEsInvertido(desde, hasta)) {
      const mensaje = 'La fecha inicial no puede ser posterior a la fecha final.';
      this.setError(mensaje);

      return throwError(() => new Error(mensaje));
    }

    this.clienteIdState.set(clienteId);
    this.desdeState.set(desde);
    this.hastaState.set(hasta);
    this.consultadoState.set(true);
    this.setPaginaActual(0);
    this.startLoading();

    return this.pedirReporte(clienteId, desde, hasta).pipe(
      tap((pagina) => this.setPagina(pagina)),
      finalize(() => this.stopLoading()),
    );
  }

  /** Vuelve a pedir la página actual de cuentas del reporte. */
  protected cargarPagina(): void {
    if (this.clienteIdState()) {
      this.consultar();
    }
  }

  /** Vacía el reporte actual para volver al estado inicial. */
  limpiar(): void {
    this.setPagina({ content: [], page: 0, size: this.size(), totalElements: 0, totalPages: 0 });
    this.clienteIdState.set('');
    this.desdeState.set('');
    this.hastaState.set('');
    this.consultadoState.set(false);
    this.setError(null);
  }

  private consultar(): void {
    this.startLoading();
    this.pedirReporte(this.clienteIdState(), this.desdeState(), this.hastaState())
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (pagina) => this.setPagina(pagina),
        error: (error: Error) => this.setError(error.message),
      });
  }

  private pedirReporte(clienteId: string, desde: string, hasta: string): Observable<Pagina<Reporte>> {
    return this.api.get<Pagina<Reporte>>(this.endpoint, {
      clienteId,
      inicio: desde,
      fin: hasta,
      page: this.page(),
      size: this.size(),
    });
  }

  private rangoEsInvertido(desde: string, hasta: string): boolean {
    return Boolean(desde && hasta && desde > hasta);
  }

  private totalPorTipo(tipo: Movimiento['tipoMovimiento']): number {
    return this.movimientos()
      .filter(
        (movimiento) => movimiento.tipoMovimiento === tipo && ESTADOS_APLICADOS.includes(movimiento.estado),
      )
      .reduce((total, movimiento) => total + Number(movimiento.valor), 0);
  }
}