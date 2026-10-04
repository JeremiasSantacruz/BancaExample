import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MovimientosTable } from '../../../component/movimientos-table/movimientos-table';
import { Notification } from '../../../component/notification/notification';
import { PageHeaderComponent } from '../../../component/page-header/page-header';
import { Pagination } from '../../../component/pagination/pagination';
import { SummaryCard } from '../../../component/summary-card/summary-card';
import { ESTADOS_APLICADOS, Movimiento, Reporte } from '../../../core/model';
import { ClienteService, FormattingService, NotificationService, ReporteService } from '../../../core/service';

/**
 * Reporte de movimientos por cliente y rango de fechas.
 *
 * No hay botón de alta: la sección solo consulta `/reportes` y ofrece la
 * impresión del navegador, donde se puede elegir *Guardar como PDF*.
 *
 * El backend pagina por cuenta, no por movimiento, así que cada bloque de la
 * página trae la cuenta completa con todos sus movimientos del rango.
 */
@Component({
  selector: 'app-reportes-section',
  imports: [
    FormsModule,
    MovimientosTable,
    Notification,
    PageHeaderComponent,
    Pagination,
    SummaryCard,
  ],
  templateUrl: './reportes-section.html',
  styleUrl: './reportes-section.css',
})
export class ReportesSection implements OnInit {
  private readonly reporteService = inject(ReporteService);
  private readonly clienteService = inject(ClienteService);
  private readonly notifications = inject(NotificationService);
  private readonly formatting = inject(FormattingService);

  protected readonly clientes = this.clienteService.catalogo;
  protected readonly reportes = this.reporteService.bloques;
  protected readonly totalCuentas = this.reporteService.totalCuentas;
  protected readonly cuentasDeLaPagina = this.reporteService.cuentasDeLaPagina;
  protected readonly totalMovimientos = this.reporteService.totalMovimientos;
  protected readonly totalDepositos = this.reporteService.totalDepositos;
  protected readonly totalRetiros = this.reporteService.totalRetiros;
  protected readonly loading = this.reporteService.loading;
  protected readonly error = this.reporteService.error;
  protected readonly consultado = this.reporteService.consultado;
  protected readonly page = this.reporteService.page;
  protected readonly size = this.reporteService.size;
  protected readonly totalPages = this.reporteService.totalPages;
  protected readonly range = this.reporteService.visibleRange;

  protected readonly clienteId = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  /**
   * Rango invertido del formulario.
   *
   * Se calcula sobre los campos de la sección, no sobre las señales del
   * servicio: hasta que se genera el reporte, el servicio todavía no conoce el
   * rango que se está escribiendo.
   */
  protected readonly rangoInvertido = computed(() => {
    const desde = this.desde();
    const hasta = this.hasta();

    return Boolean(desde && hasta && desde > hasta);
  });

  protected readonly hayResultados = computed(() => this.reportes().length > 0);
  protected readonly sinResultados = computed(
    () => this.consultado() && !this.loading() && this.reportes().length === 0,
  );

  ngOnInit(): void {
    this.clienteService.ensureCatalogo();
    this.notifications.clear();

    // Por defecto se consulta desde el primer día del mes en curso.
    this.desde.set(this.formatting.startOfCurrentMonth());
    this.hasta.set(this.formatting.today());
  }

  protected onGenerate(): void {
    this.reporteService.generar(this.clienteId(), this.desde(), this.hasta());
  }

  protected onPageChange(page: number): void {
    this.reporteService.setPage(page);
  }

  protected onSizeChange(size: number): void {
    this.reporteService.setSize(size);
  }

  protected onClear(): void {
    this.reporteService.limpiar();
    this.clienteId.set('');
    this.desde.set(this.formatting.startOfCurrentMonth());
    this.hasta.set(this.formatting.today());
  }

  protected formatCurrency(valor: number): string {
    return this.formatting.formatCurrency(valor);
  }

  protected clienteNombre(): string {
    return this.clienteService.nombreDe(this.clienteId());
  }

  /** Movimientos de un bloque, o lista vacía si el backend no los envió. */
  protected movimientosDe(reporte: Reporte): readonly Movimiento[] {
    return reporte.movimientos ?? [];
  }

  protected depositosDe(reporte: Reporte): number {
    return this.sumarPorTipo(reporte, 'DEPOSITO');
  }

  protected retirosDe(reporte: Reporte): number {
    return this.sumarPorTipo(reporte, 'RETIRO');
  }

  /** Abre el diálogo de impresión, donde se puede elegir *Guardar como PDF*. */
  protected print(): void {
    window.print();
  }

  private sumarPorTipo(reporte: Reporte, tipo: Movimiento['tipoMovimiento']): number {
    return this.movimientosDe(reporte)
      .filter(
        (movimiento) =>
          movimiento.tipoMovimiento === tipo && ESTADOS_APLICADOS.includes(movimiento.estado),
      )
      .reduce((total, movimiento) => total + Number(movimiento.valor), 0);
  }
}