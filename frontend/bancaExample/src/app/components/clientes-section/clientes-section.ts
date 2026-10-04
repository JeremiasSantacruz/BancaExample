import {SearchField, SearchFilters} from '../search-filters/search-filters';
import {SummaryCard} from '../summary-card/summary-card';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Cliente} from '../../core/models/cliente.model';

@Component({
  selector: 'app-clientes-section',
  imports: [SearchFilters, FormsModule, SummaryCard],
  templateUrl: './clientes-section.html',
  styleUrl: './clientes-section.css',
  host: {style: 'display: block'},
})
export class ClientesSection {
  readonly filterFields: readonly SearchField[] = [
    {key: 'nombre', label: 'Nombre'},
    {key: 'identificacion', label: 'Identificación'},
    {key: 'estado', label: 'Estado', options: ['ACTIVO', 'BLOQUEADO', 'INACTIVO', 'CERRADO']},
  ];
  @Input() filterValues: Record<string, string> = {};
  @Input() searching = false;
  @Output() readonly filtersSearch = new EventEmitter<Record<string, string>>();
  @Input() busy = false;
  @Input({required: true}) clientes!: Cliente[];
  @Input({required: true}) activeClientes!: number;
  @Input({required: true}) activeCuentas!: number;
  @Input({required: true}) filteredClientes!: Cliente[];
  @Input({required: true}) searchTerm!: string;

  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly editCliente = new EventEmitter<Cliente>();
  @Output() readonly deleteCliente = new EventEmitter<Cliente>();
  @Output() readonly viewAccounts = new EventEmitter<Cliente>();
}
