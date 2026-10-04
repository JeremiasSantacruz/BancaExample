import {SearchField, SearchFilters} from '../search-filters/search-filters';
import {SummaryCard} from '../summary-card/summary-card';
import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Cliente} from '../../core/models/cliente.model';
import {Cuenta} from '../../core/models/cuenta.model';
import {FormattingService} from '../../core/services/formatting.service';
import {ClienteService} from '../../core/services/cliente.service';

@Component({
  selector: 'app-cuentas-section',
  imports: [SearchFilters, FormsModule, SummaryCard],
  templateUrl: './cuentas-section.html',
  styleUrl: './cuentas-section.css',
  host: {style: 'display: block'},
})
export class CuentasSection {
  readonly filterFields: readonly SearchField[] = [
    {key: 'clienteId', label: 'ID del cliente'},
    {key: 'tipoCuenta', label: 'Tipo de cuenta', options: ['AHORRO', 'CORRIENTE', 'PLAZO_FIJO']},
    {key: 'estado', label: 'Estado', options: ['ACTIVA', 'BLOQUEADA', 'INACTIVA', 'CERRADA']},
  ];
  @Input() filterValues: Record<string, string> = {};
  @Input() searching = false;
  @Output() readonly filtersSearch = new EventEmitter<Record<string, string>>();
  @Input() busy = false;
  @Input({required: true}) cuentas!: Cuenta[];
  @Input({required: true}) clientes!: Cliente[];
  @Input({required: true}) activeCuentas!: number;
  @Input({required: true}) totalSaldo!: number;
  @Input({required: true}) filteredCuentas!: Cuenta[];
  @Input({required: true}) accountClientFilter!: string;
  @Input({required: true}) searchTerm!: string;

  @Output() readonly accountClientFilterChange = new EventEmitter<string>();
  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly editCuenta = new EventEmitter<Cuenta>();
  @Output() readonly deleteCuenta = new EventEmitter<Cuenta>();
  @Output() readonly viewMovements = new EventEmitter<Cuenta>();

  private readonly formatting = inject(FormattingService);
  private readonly clienteService = inject(ClienteService);

  customerName(clienteId: string): string {
    return this.clienteService.obtenerNombre(this.clientes, clienteId);
  }

  formatCurrency(value: number): string {
    return this.formatting.formatearMoneda(value);
  }
}
