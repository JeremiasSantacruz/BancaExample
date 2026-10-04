import { computed, signal } from '@angular/core';
import { Pagina, paginaDe, paginaVacia, rangoVisible } from '../model';

/**
 * Estado base de las entidades: página actual, carga y error.
 *
 * Los servicios de datos la extienden y agregan sus filtros y derivados, de
 * modo que los componentes nunca toquen el HTTP ni arman las peticiones.
 *
 * La tabla siempre muestra la página que devolvió el backend: los filtros y la
 * búsqueda rápida viajan en la consulta, así que no se filtran resultados en el
 * navegador.
 */
export abstract class EntityStore<T> {
  private readonly itemsState = signal<T[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly paginaState = signal<Pagina<T>>(paginaVacia<T>());

  /** Página actual, tal como la devolvió el backend. */
  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** `true` mientras hay una petición en vuelo. */
  readonly busy = computed(() => this.loadingState());

  /** Cantidad total de elementos que cumplen el filtro, en todas las páginas. */
  readonly total = computed(() => this.paginaState().totalElements);
  readonly isEmpty = computed(() => !this.loadingState() && this.itemsState().length === 0);

  readonly page = computed(() => this.paginaState().page);
  readonly size = computed(() => this.paginaState().size);
  readonly totalPages = computed(() => this.paginaState().totalPages);
  readonly first = computed(() => this.paginaState().first);
  readonly last = computed(() => this.paginaState().last);
  /** Primera y última fila de la página, para el pie de la tabla. */
  readonly visibleRange = computed(() => rangoVisible(this.paginaState()));
  readonly hasPrevious = computed(() => this.page() > 0);
  readonly hasNext = computed(() => this.page() < this.totalPages() - 1);

  /** Vuelve a pedir la página actual. Lo implementa cada servicio. */
  protected abstract cargarPagina(): void;

  /**
   * Guarda la página que respondió el backend.
   *
   * `mapear` permite normalizar cada elemento (estados en mayúsculas, números,
   * ...) antes de exponerlo.
   */
  protected setPagina(
    respuesta: Partial<Pagina<T>> | null | undefined,
    mapear: (item: T) => T = (item) => item,
  ): void {
    const pagina = paginaDe(respuesta, this.paginaState().size);

    this.paginaState.set({ ...pagina, content: pagina.content.map(mapear) });
    this.itemsState.set(this.paginaState().content);
  }

  /**
   * Cambia la página pedida sin consultar.
   *
   * Los servicios la usan antes de un `cargarPagina()` propio, para reiniciar la
   * paginación cuando cambian los filtros o la búsqueda.
   */
  protected setPaginaActual(page: number, size = this.paginaState().size): void {
    const pagina = this.paginaState();
    const nueva = Math.max(0, page);

    this.paginaState.set({
      ...pagina,
      page: nueva,
      size,
      first: nueva === 0,
      last: nueva >= Math.max(0, pagina.totalPages - 1),
    });
  }

  /** Avanza o retrocede y vuelve a pedir los datos. */
  setPage(page: number): void {
    if (page < 0 || page === this.page()) {
      return;
    }

    this.setPaginaActual(page);
    this.cargarPagina();
  }

  /** Cambia el tamaño de página y vuelve a la primera. */
  setSize(size: number): void {
    if (size < 1 || size === this.size()) {
      return;
    }

    this.setPaginaActual(0, size);
    this.cargarPagina();
  }

  protected setItems(items: T[]): void {
    this.itemsState.set(items);
  }

  protected startLoading(): void {
    this.loadingState.set(true);
    this.errorState.set(null);
  }

  protected stopLoading(): void {
    this.loadingState.set(false);
  }

  protected setError(mensaje: string | null): void {
    this.errorState.set(mensaje);
  }

  /** Elimina un item por su clave, sin volver a pedir el listado al backend. */
  protected removeById(id: string, selectId: (item: T) => string): void {
    this.itemsState.update((items) => items.filter((item) => selectId(item) !== id));
  }

  /** Reemplaza un item por su clave. */
  protected updateById(id: string, selectId: (item: T) => string, cambios: Partial<T>): void {
    this.itemsState.update((items) =>
      items.map((item) => (selectId(item) === id ? { ...item, ...cambios } : item)),
    );
  }
}