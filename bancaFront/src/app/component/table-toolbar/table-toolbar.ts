import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Encabezado de una tabla: título, cantidad de registros y búsqueda rápida.
 *
 * Los filtros que van al servidor usan `app-search-filters`; este toolbar es
 * solo la búsqueda local sobre el listado ya cargado.
 */
@Component({
  selector: 'app-table-toolbar',
  imports: [FormsModule],
  templateUrl: './table-toolbar.html',
  styleUrl: './table-toolbar.css',
})
export class TableToolbar {
  readonly title = input.required<string>();
  readonly recordCount = input.required<number>();
  readonly searchTerm = input('');
  readonly searchLabel = input('Buscar');
  readonly searchPlaceholder = input('Buscar...');
  readonly loading = input(false);

  readonly searchTermChange = output<string>();
}