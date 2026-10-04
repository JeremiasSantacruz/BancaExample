import { Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Definición de un filtro. Si trae `options` se renderiza un `select`,
 * si no, un `input` de texto.
 */
export interface SearchField {
  key: string;
  label: string;
  options?: readonly string[];
  placeholder?: string;
  type?: 'text' | 'date';
}

/**
 * Barra de filtros que se envían al backend.
 *
 * Es genérica a propósito: cada sección declara sus propios `SearchField` y
 * escucha el `filtersSearch` para llamar a su servicio.
 */
@Component({
  selector: 'app-search-filters',
  imports: [FormsModule],
  templateUrl: './search-filters.html',
  styleUrl: './search-filters.css',
})
export class SearchFilters {
  readonly fields = input.required<readonly SearchField[]>();
  /**
   * Valores iniciales. Acepta `object` para que cada sección pueda pasar su
   * interfaz de filtros tipada (`ClienteFilters`, `CuentaFilters`, ...) sin
   * agregar un index signature.
   */
  readonly values = input<object>({});
  readonly loading = input(false);

  readonly filtersSearch = output<Record<string, string>>();
  readonly filtersReset = output<void>();

  /**
   * Copia editable del formulario. `linkedSignal` parte de `values()` y se
   * resincroniza solo cuando el padre cambia los filtros, así no hay que
   * duplicar el estado en `ngOnInit`.
   */
  protected readonly formValues = linkedSignal<Record<string, string>>(() =>
    SearchFilters.toRecord(this.values()),
  );

  protected updateFieldValue(key: string, value: string): void {
    this.formValues.update((previos) => ({ ...previos, [key]: value }));
  }

  protected onSubmit(): void {
    this.filtersSearch.emit(this.formValues());
  }

  protected onReset(): void {
    this.formValues.set({});
    this.filtersReset.emit();
  }

  /** Descarta los valores `undefined` de un objeto de filtros. */
  private static toRecord(valores: object): Record<string, string> {
    const record: Record<string, string> = {};

    for (const [clave, valor] of Object.entries(valores)) {
      record[clave] = typeof valor === 'string' ? valor : '';
    }

    return record;
  }
}