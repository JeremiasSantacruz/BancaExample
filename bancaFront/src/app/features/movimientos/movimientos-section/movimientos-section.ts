import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { ConfirmDialog } from '../../../component/confirm-dialog/confirm-dialog';
import { MovimientosTable } from '../../../component/movimientos-table/movimientos-table';
import { Notification } from '../../../component/notification/notification';
import { OperationResult } from '../../../component/operation-result/operation-result';
import { PageHeaderComponent } from '../../../component/page-header/page-header';
import { Pagination } from '../../../component/pagination/pagination';
import { SearchField, SearchFilters } from '../../../component/search-filters/search-filters';
import { SummaryCard } from '../../../component/summary-card/summary-card';
import { TableToolbar } from '../../../component/table-toolbar/table-toolbar';
import { Cuenta, Movimiento, MovimientoCreateDTO } from '../../../core/model';
import {
  ClienteService,
  CuentaService,
  FormattingService,
  MovimientoService,
  NotificationService,
  UiNotification,
} from '../../../core/service';
import { MovimientoForm } from '../movimiento-form/movimiento-form';

/**
 * Sección de movimientos: historial, alta y reversa.
 *
 * Una reversa no borra el movimiento: el backend marca el original como
 * `REVERSED` y genera un `REVERSED_CORRECTION`, así que la tabla se recarga.
 */
@Component({
  selector: 'app-movimientos-section',
  imports: [
    ConfirmDialog,
    MovimientosTable,
    MovimientoForm,
    Notification,
    OperationResult,
    PageHeaderComponent,
    Pagination,
    SearchFilters,
    SummaryCard,
    TableToolbar,
  ],
  templateUrl: './movimientos-section.html',
  styleUrl: './movimientos-section.css',
})
export class MovimientosSection implements OnInit {
  /** Cuenta preseleccionada, por ejemplo al llegar desde la sección de cuentas. */
  readonly cuentaId = input<string>('');

  private readonly movimientoService = inject(MovimientoService);
  private readonly cuentaService = inject(CuentaService);
  private readonly clienteService = inject(ClienteService);
  private readonly notifications = inject(NotificationService);
  private readonly formatting = inject(FormattingService);

  protected readonly filterFields: readonly SearchField[] = [
    { key: 'cuentaId', label: 'ID de cuenta' },
    { key: 'inicio', label: 'Desde', type: 'date' },
    { key: 'fin', label: 'Hasta', type: 'date' },
  ];

  protected readonly formOpen = signal(false);
  protected readonly reversing = signal<Movimiento | null>(null);
  protected readonly result = signal<UiNotification | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly movimientos = this.movimientoService.visibleMovimientos;
  protected readonly totalMovimientos = this.movimientoService.total;
  protected readonly deposits = this.movimientoService.appliedDeposits;
  protected readonly withdrawals = this.movimientoService.appliedWithdrawals;
  protected readonly netAmount = this.movimientoService.netAmount;
  protected readonly loading = this.movimientoService.loading;
  protected readonly error = this.movimientoService.error;
  protected readonly searchTerm = this.movimientoService.searchTerm;
  protected readonly filters = this.movimientoService.filters;
  protected readonly page = this.movimientoService.page;
  protected readonly size = this.movimientoService.size;
  protected readonly totalPages = this.movimientoService.totalPages;
  protected readonly range = this.movimientoService.visibleRange;

  /**
   * Solo pueden recibir movimientos las cuentas `ACTIVA` de clientes `ACTIVO`.
   */
  protected readonly cuentasOperativas = computed<readonly Cuenta[]>(() => {
    const clientesOperativos = new Set(this.clienteService.clientesOperativos().map((c) => c.clienteId));

    return this.cuentaService
      .catalogo()
      .filter((cuenta) => cuenta.estado === 'ACTIVA' && clientesOperativos.has(cuenta.clienteId));
  });

  constructor() {
    // Un filtro que llega por query param tiene que reflejarse en el listado.
    //
    // La consulta va con `untracked` porque el servicio lee y escribe señales de
    // filtro: si el efecto las escuchara, su propia escritura lo volvería a
    // marcar sucio y entraría en bucle pidiendo la misma página una y otra vez.
    effect(() => {
      const cuentaId = this.cuentaId();

      if (cuentaId) {
        untracked(() => this.movimientoService.cargarMovimientosFiltrados({ cuentaId }));
      }
    });
  }

  ngOnInit(): void {
    // Si venía una cuenta, el efecto de arriba ya filtró; si no, se carga todo.
    if (!this.cuentaId()) {
      this.movimientoService.ensureLoaded();
    }

    // El formulario necesita todas las cuentas y clientes para sus selectores,
    // no solo la página que muestra la tabla.
    this.cuentaService.ensureCatalogo();
    this.clienteService.ensureCatalogo();
    this.notifications.clear();
  }

  protected onFilters(values: Record<string, string>): void {
    this.movimientoService.cargarMovimientosFiltrados({
      cuentaId: values['cuentaId'],
      inicio: values['inicio'],
      fin: values['fin'],
    });
  }

  /** `limpiarFiltros` ya deja los filtros vacíos y recarga la primera página. */
  protected onFiltersReset(): void {
    this.movimientoService.limpiarFiltros();
  }

  protected onSearchTerm(term: string): void {
    this.movimientoService.setSearchTerm(term);
  }

  protected onPageChange(page: number): void {
    this.movimientoService.setPage(page);
  }

  protected onSizeChange(size: number): void {
    this.movimientoService.setSize(size);
  }

  protected openCreateForm(): void {
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formError.set(null);
  }

  protected onSave(dto: MovimientoCreateDTO): void {
    this.saving.set(true);
    this.formError.set(null);

    this.movimientoService.crearMovimiento(dto).subscribe({
      next: (movimiento) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.result.set({
          kind: 'success',
          message: `Registraste un ${movimiento.tipoMovimiento} de ${this.formatting.formatCurrency(
            movimiento.valor,
          )}.`,
        });
        // El saldo de la cuenta cambió, así que cuentas queda viejo: se
        // invalidan la tabla y el catálogo (de donde salen los selectores y los
        // saldos del formulario) para volver a preguntarle al backend.
        this.cuentaService.refrescar();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected askReverse(movimiento: Movimiento): void {
    this.reversing.set(movimiento);
  }

  protected cancelReverse(): void {
    this.reversing.set(null);
  }

  protected confirmReverse(): void {
    const movimiento = this.reversing();

    if (!movimiento) {
      return;
    }

    this.saving.set(true);

    this.movimientoService.revertirMovimiento(movimiento.movimientoId).subscribe({
      next: () => {
        this.saving.set(false);
        this.reversing.set(null);
        this.result.set({
          kind: 'success',
          message: `Se revirtió el movimiento ${movimiento.movimientoId}.`,
        });
        // La reversa también devuelve el saldo: cuentas vuelve al servidor.
        this.cuentaService.refrescar();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.reversing.set(null);
        this.result.set({ kind: 'error', message: error.message });
      },
    });
  }

  protected dismissResult(): void {
    this.result.set(null);
  }

  protected formatCurrency(valor: number): string {
    return this.formatting.formatCurrency(valor);
  }
}