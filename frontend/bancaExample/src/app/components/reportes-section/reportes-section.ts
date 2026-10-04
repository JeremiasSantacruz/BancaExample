import {Reporte} from '../../core/models/reporte.model';
import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Movimiento} from '../../core/models/movimiento.model';
import {Cliente} from '../../core/models/cliente.model';
import {FormattingService} from '../../core/services/formatting.service';

@Component({
  selector: 'app-reportes-section',
  imports: [FormsModule],
  templateUrl: './reportes-section.html',
  styleUrl: './reportes-section.css',
  host: {style: 'display: block'},
})
export class ReportesSection {
  @Input() clientes: Cliente[] = [];
  @Input() clienteId = '';
  @Input() consulted = false;
  @Output() readonly clienteIdChange = new EventEmitter<string>();
  @Input() reportCuentas: Reporte[] = [];
  @Input() searching = false;
  @Output() readonly searchReport = new EventEmitter<void>();
  @Input({required: true}) reportFrom!: string;
  @Input({required: true}) reportTo!: string;
  @Input({required: true}) reportMovimientos!: Movimiento[];
  @Input({required: true}) reportDepositos!: number;
  @Input({required: true}) reportRetiros!: number;
  @Output() readonly reportFromChange = new EventEmitter<string>();
  @Output() readonly reportToChange = new EventEmitter<string>();
  @Output() readonly downloadReport = new EventEmitter<void>();
  private readonly formatting = inject(FormattingService);

  get clienteNombre(): string {
    return this.clientes.find(cliente => cliente.clienteId === this.clienteId)?.nombre ?? '';
  }

  get invalidRange(): boolean {
    return !!(this.reportFrom && this.reportTo && this.reportFrom > this.reportTo);
  }

  formatCurrency(value: number): string {
    return this.formatting.formatearMoneda(value);
  }

  formatDate(value: string): string {
    return this.formatting.formatearFecha(value);
  }
}
