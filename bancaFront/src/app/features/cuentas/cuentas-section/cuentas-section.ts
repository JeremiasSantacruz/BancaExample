import {
  Component,
  effect,
  inject,
  input,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmDialog } from '../../../component/confirm-dialog/confirm-dialog';
import { Notification } from '../../../component/notification/notification';
import { OperationResult } from '../../../component/operation-result/operation-result';
import { PageHeaderComponent } from '../../../component/page-header/page-header';
import { Pagination } from '../../../component/pagination/pagination';
import { PersonCell } from '../../../component/person-cell/person-cell';
import { SearchField, SearchFilters } from '../../../component/search-filters/search-filters';
import { StatusBadge } from '../../../component/status-badge/status-badge';
import { SummaryCard } from '../../../component/summary-card/summary-card';
import { TableToolbar } from '../../../component/table-toolbar/table-toolbar';
import {
  Cuenta,
  CuentaEstado,
  CuentaFormValue,
  CuentaCreateDTO,
  CUENTA_ESTADOS,
  TipoCuenta,
  TIPOS_CUENTA,
} from '../../../core/model';
import {
  ClienteService,
  CuentaService,
  FormattingService,
  NotificationService,
  UiNotification,
} from '../../../core/service';
import { CuentaForm } from '../cuenta-form/cuenta-form';

/**
 * Sección de cuentas: listado, alta, edición y cierre.
 *
 * Los filtros de la barra superior, el filtro por titular y la búsqueda de texto
 * viajan todos al backend (`/cuentas/buscar`), así que la tabla muestra una
 * página del resultado y no un filtrado local.
 */
@Component({
  selector: 'app-cuentas-section',
  imports: [
    ConfirmDialog,
    CuentaForm,
    FormsModule,
    Notification,
    OperationResult,
    PageHeaderComponent,
    Pagination,
    PersonCell,
    SearchFilters,
    StatusBadge,
    SummaryCard,
    TableToolbar,
  ],
  templateUrl: './cuentas-section.html',
  styleUrl: './cuentas-section.css',
})
export class CuentasSection implements OnInit {
  /** Cliente preseleccionado, por ejemplo al llegar desde la sección de clientes. */
  readonly clienteId = input<string>('');

  private readonly cuentaService = inject(CuentaService);
  private readonly clienteService = inject(ClienteService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly formatting = inject(FormattingService);

  protected readonly filterFields: readonly SearchField[] = [
    { key: 'clienteId', label: 'ID del cliente' },
    { key: 'tipoCuenta', label: 'Tipo de cuenta', options: TIPOS_CUENTA },
    { key: 'estado', label: 'Estado', options: CUENTA_ESTADOS },
  ];

  protected readonly editing = signal<Cuenta | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly closing = signal<Cuenta | null>(null);
  protected readonly result = signal<UiNotification | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly cuentas = this.cuentaService.visibleCuentas;
  protected readonly totalCuentas = this.cuentaService.total;
  protected readonly activeCuentas = this.cuentaService.activeCuentasCount;
  protected readonly totalSaldo = this.cuentaService.totalSaldo;
  protected readonly loading = this.cuentaService.loading;
  protected readonly error = this.cuentaService.error;
  protected readonly searchTerm = this.cuentaService.searchTerm;
  protected readonly clienteFilter = this.cuentaService.clienteFilter;
  protected readonly filters = this.cuentaService.filters;
  protected readonly page = this.cuentaService.page;
  protected readonly size = this.cuentaService.size;
  protected readonly totalPages = this.cuentaService.totalPages;
  protected readonly range = this.cuentaService.visibleRange;

  /** Los selectores de titular necesitan el nombre, que vive en el servicio de clientes. */
  protected readonly clientes = this.clienteService.catalogo;
  /** Solo los clientes `ACTIVO` pueden recibir una cuenta nueva. */
  protected readonly clientesOperativos = this.clienteService.clientesOperativos;

  constructor() {
    // Un filtro que llega por query param tiene que reflejarse en el filtro local.
    //
    // La consulta va con `untracked` porque el servicio lee y escribe señales de
    // filtro: si el efecto las escuchara, su propia escritura lo volvería a
    // marcar sucio y entraría en bucle pidiendo la misma página una y otra vez.
    effect(() => {
      const clienteId = this.clienteId();

      if (clienteId) {
        untracked(() => this.cuentaService.setClienteFilter(clienteId));
      }
    });
  }

  ngOnInit(): void {
    // Los catálogos completos alimentan los selectores y las tarjetas de
    // resumen, que no pueden trabajar con una sola página.
    this.cuentaService.ensureCatalogo();
    this.clienteService.ensureCatalogo();
    this.cuentaService.ensureLoaded();
    this.notifications.clear();
  }

  protected onFilters(values: Record<string, string>): void {
    this.cuentaService.cargarCuentas({
      clienteId: values['clienteId'],
      tipoCuenta: values['tipoCuenta'] as TipoCuenta | undefined,
      estado: values['estado'] as CuentaEstado | undefined,
    });
  }

  /** `limpiarFiltros` ya deja los filtros vacíos y recarga la primera página. */
  protected onFiltersReset(): void {
    this.cuentaService.limpiarFiltros();
  }

  protected onSearchTerm(term: string): void {
    this.cuentaService.setSearchTerm(term);
  }

  protected onClienteFilter(clienteId: string): void {
    this.cuentaService.setClienteFilter(clienteId);
  }

  protected onPageChange(page: number): void {
    this.cuentaService.setPage(page);
  }

  protected onSizeChange(size: number): void {
    this.cuentaService.setSize(size);
  }

  protected openCreateForm(): void {
    this.formError.set(null);
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(cuenta: Cuenta): void {
    this.formError.set(null);
    this.editing.set(cuenta);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onSave(valor: CuentaFormValue): void {
    this.saving.set(true);
    this.formError.set(null);

    const request = valor.cuentaId
      ? this.cuentaService.actualizarCuenta(valor.clienteId, valor.cuentaId, {
          clienteId: valor.clienteId,
          tipoCuenta: valor.tipoCuenta,
          estado: valor.estado,
          saldoInicial: valor.saldoInicial,
        })
      : this.cuentaService.crearCuenta({
          clienteId: valor.clienteId,
          tipoCuenta: valor.tipoCuenta,
        } satisfies CuentaCreateDTO);

    request.subscribe({
      next: (cuenta) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.editing.set(null);
        this.result.set({
          kind: 'success',
          message: valor.cuentaId
            ? `Actualizaste la cuenta ${cuenta.cuentaId}.`
            : `Creaste la cuenta ${cuenta.cuentaId}.`,
        });
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected askClose(cuenta: Cuenta): void {
    this.closing.set(cuenta);
  }

  protected cancelClose(): void {
    this.closing.set(null);
  }

  protected confirmClose(): void {
    const cuenta = this.closing();

    if (!cuenta) {
      return;
    }

    this.saving.set(true);

    this.cuentaService.eliminarCuenta(cuenta.clienteId, cuenta.cuentaId).subscribe({
      next: () => {
        this.saving.set(false);
        this.closing.set(null);
        this.result.set({
          kind: 'success',
          message: `La cuenta ${cuenta.cuentaId} quedó en estado CERRADA.`,
        });
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.closing.set(null);
        this.result.set({ kind: 'error', message: error.message });
      },
    });
  }

  protected dismissResult(): void {
    this.result.set(null);
  }

  protected customerName(clienteId: string): string {
    return this.clienteService.nombreDe(clienteId);
  }

  protected formatCurrency(valor: number): string {
    return this.formatting.formatCurrency(valor);
  }

  /** Navega a los movimientos de la cuenta. */
  protected viewMovimientos(cuenta: Cuenta): void {
    void this.router.navigate(['/movimientos'], { queryParams: { cuentaId: cuenta.cuentaId } });
  }
}