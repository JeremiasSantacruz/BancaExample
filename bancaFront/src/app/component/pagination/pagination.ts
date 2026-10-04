import { Component, computed, input, output } from '@angular/core';
import { TAMANIOS_PAGINA } from '../../core/model';

/**
 * Pie de paginación de una tabla.
 *
 * Solo muestra los controles: el estado (página, tamaño, totales) vive en el
 * servicio de cada entidad y el componente emite los cambios.
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  /** Página actual, empezando en 0. */
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();
  /** Rango visible, para el texto "mostrando X de Y". */
  readonly range = input.required<{ desde: number; hasta: number }>();
  readonly disabled = input(false);

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly tamanios = TAMANIOS_PAGINA;

  /**
   * Números de página a mostrar: siempre la primera, la última y las vecinas
   * de la actual. Los huecos se marcan con puntos suspensivos en el template.
   */
  protected readonly paginas = computed(() => {
    const total = this.totalPages();

    if (total <= 1) {
      return [];
    }

    const actual = this.page();

    return [...new Set([0, total - 1, actual - 1, actual, actual + 1])]
      .filter((numero) => numero >= 0 && numero < total)
      .sort((a, b) => a - b);
  });

  protected irA(page: number): void {
    if (!this.disabled() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }

  protected anterior(): void {
    this.irA(this.page() - 1);
  }

  protected siguiente(): void {
    this.irA(this.page() + 1);
  }

  protected cambiarTamanio(tamanio: string): void {
    const parsed = Number(tamanio);

    if (!this.disabled() && parsed > 0 && parsed !== this.size()) {
      this.sizeChange.emit(parsed);
    }
  }
}