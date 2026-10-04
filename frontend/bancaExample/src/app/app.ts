import {Reporte} from './core/models/reporte.model';
import {finalize, Observable, Subscription} from 'rxjs';
import {NotificationService, UiNotification} from './core/services/notification.service';
import {Notification} from './components/notification/notification';
import {ChangeDetectorRef, Component, inject, OnInit, signal} from '@angular/core';
import {NgForm} from '@angular/forms';
import {ClienteService} from './core/services/cliente.service';
import {CuentaService} from './core/services/cuenta.service';
import {MovimientoService} from './core/services/movimiento.service';
import {FormattingService} from './core/services/formatting.service';
import {Cliente} from './core/models/cliente.model';
import {Cuenta} from './core/models/cuenta.model';
import {Movimiento} from './core/models/movimiento.model';

import {NavigationItem, Section} from './core/models/navigation.model';
import {Sidebar} from './components/sidebar/sidebar';
import {ClientesSection} from './components/clientes-section/clientes-section';
import {CuentasSection} from './components/cuentas-section/cuentas-section';
import {MovimientosSection} from './components/movimientos-section/movimientos-section';
import {ReportesSection} from './components/reportes-section/reportes-section';
import {ReporteService} from './core/services/reporte.service';
import {RecordForm} from './components/record-form/record-form';
import {OperationResult} from './components/operation-result/operation-result';

/**
 * Componente principal de la aplicación bancaria
 *
 * Responsabilidades (Clean Code - Separation of Concerns):
 * - Gestionar el estado de la UI
 * - Coordinar servicios
 * - Presentar datos al usuario
 *
 * Los servicios manejan:
 * - Lógica de negocio
 * - Comunicación HTTP
 * - Transformación de datos
 */
@Component({
  imports: [
    Notification,
    Sidebar,
    ClientesSection,
    CuentasSection,
    MovimientosSection,
    ReportesSection,
    RecordForm,
    OperationResult,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  // Configuración de navegación (constante)
  readonly navigation: NavigationItem[] = [
    {id: 'clientes', label: 'Clientes', marker: 'C'},
    {id: 'cuentas', label: 'Cuentas', marker: '$'},
    {id: 'movimientos', label: 'Movimientos', marker: '↕'},
    {id: 'reportes', label: 'Reportes', marker: '▤'},
  ];
  // Estado de la UI
  activeSection: Section = 'clientes';
  searchTerm = '';
  busy = false;
  readonly notificationService = inject(NotificationService);
  readonly saveResult = signal<UiNotification | null>(null);
  accountClientFilter = '';
  reportFrom = '';
  reportClientId = '';
  reportTo = '';
  formOpen = false;
  clienteFilters: Record<string, string> = {};
  cuentaFilters: Record<string, string> = {};
  movimientoFilters: Record<string, string> = {};
  searchingClientes = false;
  searchingCuentas = false;
  searchingMovimientos = false;
  searchingReport = false;
  // Edición
  editingCliente: Cliente | null = null;
  editingCuenta: Cuenta | null = null;
  editingMovimiento: Movimiento | null = null;

  // Inyección de dependencias (Dependency Injection)
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly clienteService = inject(ClienteService);
  private readonly cuentaService = inject(CuentaService);
  private readonly movimientoService = inject(MovimientoService);
  private readonly reporteService = inject(ReporteService);
  private readonly formatting = inject(FormattingService);
  private readonly clienteResults = signal<Cliente[] | null>(null);
  private readonly cuentaResults = signal<Cuenta[] | null>(null);
  private readonly movimientoResults = signal<Movimiento[] | null>(null);
  private readonly reportResults = signal<Reporte[] | null>(null);
  private clienteSearchSubscription?: Subscription;
  private cuentaSearchSubscription?: Subscription;
  private movimientoSearchSubscription?: Subscription;
  private reportSearchSubscription?: Subscription;
  // Datos
  private readonly clienteData = signal<Cliente[]>([]);
  private readonly cuentaData = signal<Cuenta[]>([]);
  private readonly movimientoData = signal<Movimiento[]>([]);

  // Nota: Los formularios usan 'any' para permitir validación flexible con ngForm
  clienteForm: any = this.emptyCliente();
  cuentaForm: any = this.emptyCuenta();
  movimientoForm: any = this.emptyMovimiento();

  constructor() {
    // Inicializar fechas del reporte
    const today = this.formatting.obtenerFechaHoy();
    this.reportFrom = today.slice(0, 8) + '01';
    this.reportTo = today;
  }

  get errorMessage(): string {
    const notice = this.notificationService.current();
    return notice?.kind === 'error' ? notice.message : '';
  }

  set errorMessage(message: string) {
    if (message) this.notificationService.show('error', message);
    else this.notificationService.clear('error');
  }

  get successMessage(): string {
    const notice = this.notificationService.current();
    return notice?.kind === 'success' ? notice.message : '';
  }

  set successMessage(message: string) {
    if (message) this.notificationService.show('success', message);
    else this.notificationService.clear('success');
  }

  get invalidReportRange(): boolean {
    return !!(this.reportFrom && this.reportTo && this.reportFrom > this.reportTo);
  }

  get reportConsulted(): boolean {
    return this.reportResults() !== null;
  }

  get clientes(): Cliente[] {
    return this.clienteData();
  }

  set clientes(value: Cliente[]) {
    this.clienteData.set(value);
  }

  get cuentas(): Cuenta[] {
    return this.cuentaData();
  }

  set cuentas(value: Cuenta[]) {
    this.cuentaData.set(value);
  }

  get movimientos(): Movimiento[] {
    return this.movimientoData();
  }

  set movimientos(value: Movimiento[]) {
    this.movimientoData.set(value);
  }

  get sectionTitle(): string {
    return this.navigation.find((item) => item.id === this.activeSection)?.label ?? 'Clientes';
  }

  get clienteEstados() {
    return ['ACTIVO', 'BLOQUEADO', 'INACTIVO', 'CERRADO'] as const;
  }

  get cuentaEstados() {
    return ['ACTIVA', 'BLOQUEADA', 'INACTIVA', 'CERRADA'] as const;
  }

  get activeClientes(): number {
    return this.clienteService.contarPorEstado(this.clientes, 'ACTIVO');
  }

  get activeCuentas(): number {
    return this.cuentaService.contarPorEstado(this.cuentas, 'ACTIVA');
  }

  get totalSaldo(): number {
    return this.cuentaService.calcularSaldoTotal(this.cuentas);
  }

  get appliedDeposits(): number {
    return this.movimientoService.calcularDepositos(this.movimientos);
  }

  get appliedWithdrawals(): number {
    return this.movimientoService.calcularRetiros(this.movimientos);
  }

  get filteredClientes(): Cliente[] {
    return this.clienteService.buscar(this.clienteResults() ?? this.clientes, this.searchTerm);
  }

  // ========== GETTERS ==========

  get filteredCuentas(): Cuenta[] {
    const porCliente = this.cuentaService.filtrarPorCliente(
      this.cuentaResults() ?? this.cuentas,
      this.accountClientFilter,
    );
    return this.cuentaService.buscar(porCliente, this.searchTerm, (id) =>
      this.clienteService.obtenerNombre(this.clientes, id),
    );
  }

  get filteredMovimientos(): Movimiento[] {
    return this.movimientoService.buscar(
      this.movimientoResults() ?? this.movimientos,
      this.searchTerm,
    );
  }

  get reportCuentas(): Reporte[] {
    return this.reportResults() ?? [];
  }

  get reportMovimientos(): Movimiento[] {
    return this.reporteService.obtenerMovimientos(this.reportCuentas);
  }

  get reportDepositos(): number {
    return this.reporteService.calcularDepositos(this.reportMovimientos);
  }

  get reportRetiros(): number {
    return this.reporteService.calcularRetiros(this.reportMovimientos);
  }

  dismissSaveResult(): void {
    const result = this.saveResult();
    const notice = this.notificationService.current();
    if (result?.kind === notice?.kind && result?.message === notice?.message) {
      this.notificationService.clear();
    }
    this.saveResult.set(null);
  }

  buscarClientes(filters: Record<string, string>): void {
    if (this.searchingClientes) return;
    this.errorMessage = '';
    this.clienteFilters = filters;
    this.searchTerm = '';
    this.searchingClientes = true;
    this.clienteSearchSubscription = this.clienteService
      .buscarEnServidor(filters)
      .pipe(
        finalize(() => {
          this.searchingClientes = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (results) => {
          this.clienteResults.set(
            results.map((cliente) => ({
              ...cliente,
              estado: this.clienteService.normalizarEstado(cliente.estado),
            })),
          );
        },
        error: (error) => this.mostrarError(error),
      });
  }

  buscarCuentas(filters: Record<string, string>): void {
    if (this.searchingCuentas) return;
    this.errorMessage = '';
    this.cuentaFilters = filters;
    this.searchTerm = '';
    this.accountClientFilter = '';
    this.searchingCuentas = true;
    this.cuentaSearchSubscription = this.cuentaService
      .buscarEnServidor(filters)
      .pipe(
        finalize(() => {
          this.searchingCuentas = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (results) => {
          this.cuentaResults.set(
            results.map((cuenta) => ({
              ...cuenta,
              estado: this.cuentaService.normalizarEstado(cuenta.estado),
            })),
          );
        },
        error: (error) => this.mostrarError(error),
      });
  }

  buscarMovimientos(filters: Record<string, string>): void {
    if (this.searchingMovimientos) return;
    this.errorMessage = '';
    this.movimientoFilters = filters;
    this.searchTerm = '';
    this.searchingMovimientos = true;
    this.movimientoSearchSubscription = this.movimientoService
      .buscarEnServidor(filters)
      .pipe(
        finalize(() => {
          this.searchingMovimientos = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (results) => this.movimientoResults.set(results),
        error: (error) => this.mostrarError(error),
      });
  }

  updateReportDate(key: 'reportFrom' | 'reportTo', value: string): void {
    this.reportSearchSubscription?.unsubscribe();
    this[key] = value;
    this.reportResults.set(null);
  }

  updateReportClient(value: string): void {
    this.reportSearchSubscription?.unsubscribe();
    this.reportClientId = value;
    this.reportResults.set(null);
  }

  buscarReporte(): void {
    if (!this.reportClientId || this.searchingReport || this.invalidReportRange) return;
    this.errorMessage = '';
    const inicio = this.reportFrom;
    const fin = this.reportTo;
    const clienteId = this.reportClientId;
    this.reportResults.set(null);
    this.searchingReport = true;
    this.reportSearchSubscription = this.reporteService
      .obtener(clienteId, inicio, fin)
      .pipe(
        finalize(() => {
          this.searchingReport = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (results) => {
          if (clienteId === this.reportClientId && inicio === this.reportFrom && fin === this.reportTo) this.reportResults.set(results);
        },
        error: (error) => this.mostrarError(error),
      });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  verCuentasCliente(cliente: Cliente): void {
    if (this.busy) return;
    this.cuentaSearchSubscription?.unsubscribe();
    this.cuentaResults.set([]);
    this.selectSection('cuentas', false);
    this.buscarCuentas({clienteId: cliente.clienteId, tipoCuenta: '', estado: ''});
  }

  // ========== NAVEGACIÓN ==========

  verMovimientosCuenta(cuenta: Cuenta): void {
    if (this.busy) return;
    this.movimientoSearchSubscription?.unsubscribe();
    this.movimientoResults.set([]);
    this.selectSection('movimientos', false);
    this.buscarMovimientos({cuentaId: cuenta.cuentaId});
  }

  selectSection(section: Section, resetFilters = true): void {
    if (resetFilters) this.clearFilters();
    this.activeSection = section;
    this.searchTerm = '';
    this.errorMessage = '';
    this.successMessage = '';
    if (section === 'cuentas' && !this.cuentas.length) {
      this.cargarCuentas();
    }
  }

  openCreateForm(): void {
    this.formOpen = true;
    this.editingCliente = null;
    this.editingCuenta = null;
    this.editingMovimiento = null;
    this.clienteForm = this.emptyCliente();
    this.cuentaForm = {
      ...this.emptyCuenta(),
      clienteId: this.accountClientFilter || this.clientes[0]?.clienteId || '',
    };
    this.movimientoForm = this.emptyMovimiento();
    this.errorMessage = '';
    this.successMessage = '';
  }

  editCliente(cliente: Cliente): void {
    this.formOpen = true;
    this.editingCliente = cliente;
    this.clienteForm = {
      contrasena: cliente.contrasena,
      estado: cliente.estado,
      nombre: cliente.nombre,
      genero: cliente.genero,
      edad: cliente.edad,
      identificacion: cliente.identificacion,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
    };
  }

  // ========== FORMULARIOS ==========

  editCuenta(cuenta: Cuenta): void {
    this.formOpen = true;
    this.editingCuenta = cuenta;
    this.cuentaForm = {
      clienteId: cuenta.clienteId,
      cuentaId: cuenta.cuentaId,
      tipoCuenta: cuenta.tipoCuenta,
      estado: cuenta.estado,
      saldoInicial: Number(cuenta.saldoInicial),
    };
  }

  editMovimiento(movimiento: Movimiento): void {
    if (this.busy || movimiento.estado !== 'APPROVED') return;
    if (!window.confirm(`¿Reversar el movimiento ${movimiento.movimientoId}?`)) return;
    this.ejecutarOperacion(
      this.movimientoService.actualizarMovimiento(movimiento.movimientoId, {estado: 'REVERSED'}),
      'Movimiento reversado.',
      () => {
        this.cargarMovimientos();
        this.cargarCuentas();
        this.reportResults.set(null);
      },
      true,
    );
  }

  closeForm(): void {
    this.formOpen = false;
  }

  saveCliente(form: NgForm): void {
    if (this.busy) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const request = this.editingCliente
      ? this.clienteService.actualizarCliente(this.editingCliente.clienteId, this.clienteForm)
      : this.clienteService.crearCliente(this.clienteForm);

    this.ejecutarOperacion(
      request,
      'Cliente guardado.',
      () => {
        this.closeForm();
        this.cargarClientes();
      },
      true,
    );
  }

  saveCuenta(form: NgForm): void {
    if (this.busy) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const request = this.editingCuenta
      ? this.cuentaService.actualizarCuenta(
        this.editingCuenta.clienteId,
        this.editingCuenta.cuentaId,
        {
          tipoCuenta: this.cuentaForm.tipoCuenta,
          estado: this.cuentaForm.estado,
          saldoInicial: this.cuentaForm.saldoInicial,
        },
      )
      : this.cuentaService.crearCuenta({
        clienteId: this.cuentaForm.clienteId,
        tipoCuenta: this.cuentaForm.tipoCuenta,
      });

    this.ejecutarOperacion(
      request,
      'Cuenta guardada.',
      () => {
        this.closeForm();
        this.cargarCuentas();
      },
      true,
    );
  }

  // ========== GUARDAR DATOS ==========

  saveMovimiento(form: NgForm): void {
    if (this.busy) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const request = this.movimientoService.crearMovimiento(this.movimientoForm);

    this.ejecutarOperacion(
      request,
      'Movimiento registrado.',
      () => {
        this.reportResults.set(null);
        this.closeForm();
        this.cargarMovimientos();
        this.cargarCuentas();
      },
      true,
    );
  }

  deleteCliente(cliente: Cliente): void {
    if (this.busy) return;
    if (!window.confirm(`¿Eliminar al cliente ${cliente.nombre}?`)) return;
    this.ejecutarOperacion(
      this.clienteService.eliminarCliente(cliente.clienteId),
      'Cliente eliminado.',
      () => this.cargarClientes(),
    );
  }

  deleteCuenta(cuenta: Cuenta): void {
    if (this.busy) return;
    if (!window.confirm(`¿Cerrar la cuenta ${cuenta.cuentaId}?`)) return;
    this.ejecutarOperacion(
      this.cuentaService.eliminarCuenta(cuenta.clienteId, cuenta.cuentaId),
      'Cuenta cerrada.',
      () => this.cargarCuentas(),
    );
  }

  // ========== ELIMINAR DATOS ==========

  deleteMovimiento(movimiento: Movimiento): void {
    if (this.busy) return;
    if (!window.confirm(`¿Eliminar el movimiento ${movimiento.movimientoId}?`)) return;
    this.ejecutarOperacion(
      this.movimientoService.eliminarMovimiento(movimiento.movimientoId),
      'Movimiento eliminado.',
      () => {
        this.cargarMovimientos();
        this.cargarCuentas();
      },
    );
  }

  downloadReport(): void {
    if (!this.reportClientId || !this.reportConsulted || this.invalidReportRange || this.searchingReport) return;
    window.print();
  }

  customerName(clienteId: string): string {
    return this.clienteService.obtenerNombre(this.clientes, clienteId);
  }

  // ========== REPORTES ==========

  formatCurrency(value: number): string {
    return this.formatting.formatearMoneda(value);
  }

  // ========== FORMATEO Y UTILIDADES ==========

  formatDate(value: string): string {
    return this.formatting.formatearFecha(value);
  }

  /**
   * Carga todos los datos iniciales
   */
  private cargarDatos(): void {
    this.cargarClientes();
    this.cargarMovimientos();
  }

  private clearFilters(): void {
    this.clienteSearchSubscription?.unsubscribe();
    this.cuentaSearchSubscription?.unsubscribe();
    this.movimientoSearchSubscription?.unsubscribe();
    this.reportSearchSubscription?.unsubscribe();
    this.clienteFilters = {};
    this.cuentaFilters = {};
    this.movimientoFilters = {};
    this.clienteResults.set(null);
    this.cuentaResults.set(null);
    this.movimientoResults.set(null);
    this.reportResults.set(null);
    this.accountClientFilter = '';
    this.reportFrom = '';
    this.reportClientId = '';
    this.reportTo = '';
  }

  // ========== PRIVADO: CARGA DE DATOS ==========

  private cargarClientes(): void {
    this.clienteService.obtenerClientes().subscribe({
      next: (clientes) => {
        this.clientes = clientes.map((cliente) => ({
          ...cliente,
          estado: this.clienteService.normalizarEstado(cliente.estado),
        }));
        if (
          this.accountClientFilter &&
          !this.clienteService.existe(this.clientes, this.accountClientFilter)
        ) {
          this.accountClientFilter = '';
        }
        this.cargarCuentas();
        if (this.clienteResults() !== null) this.buscarClientes(this.clienteFilters);
      },
      error: (error) => this.mostrarError(error),
    });
  }

  private cargarCuentas(): void {
    if (!this.clientes.length) {
      this.cuentas = [];
      return;
    }

    this.cuentaService
      .obtenerCuentasDeMultiplesClientes(this.clientes.map((c) => c.clienteId))
      .subscribe({
        next: (cuentas) => {
          this.cuentas = cuentas.map((cuenta) => ({
            ...cuenta,
            estado: this.cuentaService.normalizarEstado(cuenta.estado),
          }));
          if (this.cuentaResults() !== null) this.buscarCuentas(this.cuentaFilters);
        },
        error: (error) => this.mostrarError(error),
      });
  }

  private cargarMovimientos(): void {
    this.movimientoService.obtenerMovimientos().subscribe({
      next: (movimientos) => {
        this.movimientos = movimientos;
        if (this.movimientoResults() !== null) this.buscarMovimientos(this.movimientoFilters);
      },
      error: (error) => this.mostrarError(error),
    });
  }

  // ========== PRIVADO: EJECUCIÓN DE OPERACIONES ==========

  private ejecutarOperacion<T>(
    request: Observable<T>,
    message: string,
    onSuccess: () => void,
    showResult = false,
  ): void {
    if (this.busy) return;
    this.saveResult.set(null);
    this.errorMessage = '';
    this.successMessage = '';
    this.busy = true;
    request
      .pipe(
        finalize(() => {
          this.busy = false;
        }),
      )
      .subscribe({
        next: () => {
          this.busy = false;
          this.successMessage = message;
          onSuccess();
          if (showResult) this.saveResult.set({kind: 'success', message});
        },
        error: (error: unknown) => {
          this.busy = false;
          this.mostrarError(error);
          if (showResult) this.saveResult.set({kind: 'error', message: this.errorMessage});
        },
      });
  }

  private mostrarError(error: unknown): void {
    this.successMessage = '';
    if (error instanceof Error) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'No se pudo completar la operación.';
    }
  }

  // ========== PRIVADO: INICIALIZACIÓN DE FORMULARIOS ==========

  private emptyCliente(): any {
    return {
      contrasena: '',
      estado: 'ACTIVO',
      nombre: '',
      genero: '',
      edad: 18,
      identificacion: '',
      direccion: '',
      telefono: '',
    };
  }

  private emptyCuenta(): any {
    return {
      clienteId: '',
      cuentaId: '',
      tipoCuenta: 'AHORRO',
      estado: 'ACTIVA',
      saldoInicial: 0,
    };
  }

  private emptyMovimiento(): any {
    const ahora = this.formatting.obtenerFechaHoraActual();
    return {
      cuentaId: '',
      fecha: ahora,
      tipoMovimiento: 'DEPOSITO',
      valor: 0,
      estado: 'APPROVED',
    };
  }
}
