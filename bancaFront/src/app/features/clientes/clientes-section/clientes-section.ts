import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmDialog } from '../../../component/confirm-dialog/confirm-dialog';
import { Notification } from '../../../component/notification/notification';
import { OperationResult } from '../../../component/operation-result/operation-result';
import { PageHeaderComponent } from '../../../component/page-header/page-header';
import { PersonCell } from '../../../component/person-cell/person-cell';
import { SearchField, SearchFilters } from '../../../component/search-filters/search-filters';
import { StatusBadge } from '../../../component/status-badge/status-badge';
import { SummaryCard } from '../../../component/summary-card/summary-card';
import { Pagination } from '../../../component/pagination/pagination';
import { TableToolbar } from '../../../component/table-toolbar/table-toolbar';
import { Cliente, ClienteCreateDTO, ClienteEstado, CLIENTE_ESTADOS } from '../../../core/model';
import { ClienteService, CuentaService, NotificationService, UiNotification } from '../../../core/service';
import { ClienteForm } from '../cliente-form/cliente-form';

/**
 * Sección de clientes: listado, alta, edición y baja.
 *
 * Es un componente autónomo. Toma sus datos de `ClienteService`, y solo comparte
 * con el resto de la aplicación el `NotificationService` y la navegación.
 */
@Component({
  selector: 'app-clientes-section',
  imports: [
    ConfirmDialog,
    ClienteForm,
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
  templateUrl: './clientes-section.html',
  styleUrl: './clientes-section.css',
})
export class ClientesSection implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly cuentaService = inject(CuentaService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly filterFields: readonly SearchField[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'identificacion', label: 'Identificación' },
    { key: 'estado', label: 'Estado', options: CLIENTE_ESTADOS },
  ];

  /** Cliente que se está editando. `null` en modo alta. */
  protected readonly editing = signal<Cliente | null>(null);
  /** Abre y cierra el formulario de alta/edición. */
  protected readonly formOpen = signal(false);
  /** Cliente pendiente de confirmar la baja. */
  protected readonly deleting = signal<Cliente | null>(null);
  /** Resultado de la última operación, para el diálogo de confirmación. */
  protected readonly result = signal<UiNotification | null>(null);
  /** Error del submit, visible dentro del formulario. */
  protected readonly formError = signal<string | null>(null);
  /** Evita abrir el formulario mientras se guarda. */
  protected readonly saving = signal(false);

  protected readonly clientes = this.clienteService.visibleClientes;
  protected readonly totalClientes = this.clienteService.total;
  protected readonly activeClientes = this.clienteService.activeClientesCount;
  protected readonly activeCuentas = this.cuentaService.activeCuentasCount;
  protected readonly loading = this.clienteService.loading;
  protected readonly error = this.clienteService.error;
  protected readonly searchTerm = this.clienteService.searchTerm;
  protected readonly filters = this.clienteService.filters;
  protected readonly page = this.clienteService.page;
  protected readonly size = this.clienteService.size;
  protected readonly totalPages = this.clienteService.totalPages;
  protected readonly range = this.clienteService.visibleRange;

  /** El formulario está abierto y en modo edición. */
  protected readonly isEditing = computed(() => this.editing() !== null);

  ngOnInit(): void {
    this.clienteService.cargarClientes();
    // El catálogo alimenta las tarjetas de resumen y los selectores del resto
    // de la aplicación, así que se pide una sola vez.
    this.clienteService.ensureCatalogo();
    this.cuentaService.ensureCatalogo();
    this.notifications.clear();
  }

  protected onFilters(values: Record<string, string>): void {
    this.clienteService.cargarClientes({
      nombre: values['nombre'],
      identificacion: values['identificacion'],
      estado: values['estado'] as ClienteEstado | undefined,
    });
  }

  protected onFiltersReset(): void {
    this.clienteService.cargarClientes({});
  }

  protected onSearchTerm(term: string): void {
    this.clienteService.setSearchTerm(term);
  }

  protected onPageChange(page: number): void {
    this.clienteService.setPage(page);
  }

  protected onSizeChange(size: number): void {
    this.clienteService.setSize(size);
  }

  protected openCreateForm(): void {
    this.formError.set(null);
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(cliente: Cliente): void {
    this.formError.set(null);
    this.editing.set(cliente);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onSave(dto: ClienteCreateDTO): void {
    const actual = this.editing();
    const clienteId = actual?.clienteId;
    const esEdicion = Boolean(clienteId);

    this.saving.set(true);
    this.formError.set(null);

    const request = esEdicion
      ? this.clienteService.actualizarCliente(clienteId!, dto)
      : this.clienteService.crearCliente(dto);

    request.subscribe({
      next: (cliente) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.editing.set(null);
        this.result.set({
          kind: 'success',
          message: esEdicion
            ? `Actualizaste los datos de ${cliente.nombre}.`
            : `Creaste al cliente ${cliente.nombre}.`,
        });
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected askDelete(cliente: Cliente): void {
    this.deleting.set(cliente);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected confirmDelete(): void {
    const cliente = this.deleting();

    if (!cliente) {
      return;
    }

    this.saving.set(true);

    this.clienteService.eliminarCliente(cliente.clienteId).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleting.set(null);
        this.result.set({
          kind: 'success',
          message: `Eliminaste a ${cliente.nombre}. Sus cuentas pasaron a INACTIVA.`,
        });
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.deleting.set(null);
        this.result.set({ kind: 'error', message: error.message });
      },
    });
  }

  protected dismissResult(): void {
    this.result.set(null);
  }

  /** Navega a la sección de cuentas con el cliente ya filtrado. */
  protected viewCuentas(cliente: Cliente): void {
    void this.router.navigate(['/cuentas'], { queryParams: { clienteId: cliente.clienteId } });
  }
}