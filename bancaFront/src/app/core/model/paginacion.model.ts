/**
 * Página de resultados que devuelve el backend en cada listado.
 *
 * Es el equivalente a la clase `Pagina` del backend: el contenido de la página
 * pedida más los metadatos que necesita el control de paginación.
 */
export interface Pagina<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Tamaños que ofrece el control de paginación. */
export const TAMANIOS_PAGINA: readonly number[] = [5, 10, 25, 50];

/** Tamaño de página con el que arranca cada listado. */
export const TAMANIO_PAGINA_POR_DEFECTO = 10;

/**
 * Tamaño especial que pide todo el resultado en una sola página.
 *
 * Lo usan los catálogos que alimentan selectores y cálculos globales, donde
 * traer solo una página daría un resultado incompleto.
 */
export const SIN_LIMITE = 'all';

/** Tamaño de página: un número, o `all` para traer todo. */
export type TamanioPagina = number | typeof SIN_LIMITE;

/**
 * Página vacía, para inicializar el estado antes de la primera respuesta.
 */
export function paginaVacia<T>(page = 0, size: number = TAMANIO_PAGINA_POR_DEFECTO): Pagina<T> {
  return {
    content: [],
    page,
    size,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };
}

/**
 * Normaliza la respuesta del backend.
 *
 * Si llega sin `content` se devuelve una página vacía: el backend puede
 * responder `[]` si alguien lo consulta sin la paginación y, en ese caso, es
 * mejor mostrar una tabla vacía que romper la vista.
 */
export function paginaDe<T>(
  respuesta: Partial<Pagina<T>> | null | undefined,
  fallbackSize: number = TAMANIO_PAGINA_POR_DEFECTO,
): Pagina<T> {
  if (!respuesta || !Array.isArray(respuesta.content)) {
    return paginaVacia(0, fallbackSize);
  }

  const size = respuesta.size ?? fallbackSize;
  const totalElements = respuesta.totalElements ?? respuesta.content.length;

  return {
    content: respuesta.content,
    page: respuesta.page ?? 0,
    size,
    totalElements,
    totalPages: respuesta.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 0),
    first: respuesta.first ?? true,
    last: respuesta.last ?? true,
  };
}

/** Índice de la primera y última fila que se muestran, para el pie de tabla. */
export function rangoVisible<T>(pagina: Pagina<T>): { desde: number; hasta: number } {
  if (pagina.content.length === 0) {
    return { desde: 0, hasta: 0 };
  }

  return { desde: pagina.page * pagina.size + 1, hasta: pagina.page * pagina.size + pagina.content.length };
}