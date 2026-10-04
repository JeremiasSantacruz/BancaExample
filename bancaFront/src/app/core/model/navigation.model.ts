/**
 * Secciones de la aplicación. Cada una es una ruta lazy con su propio componente.
 */
export type Section = 'clientes' | 'cuentas' | 'movimientos' | 'reportes';

export interface NavigationItem {
  id: Section;
  label: string;
  marker: string;
  /** Ruta del router. */
  path: string;
  /** Si la entrada muestra el contador de clientes en el sidebar. */
  showsClienteCount?: boolean;
}

export const NAVIGATION: readonly NavigationItem[] = [
  { id: 'clientes', label: 'Clientes', marker: 'C', path: '/clientes', showsClienteCount: true },
  { id: 'cuentas', label: 'Cuentas', marker: '$', path: '/cuentas' },
  { id: 'movimientos', label: 'Movimientos', marker: '↕', path: '/movimientos' },
  { id: 'reportes', label: 'Reportes', marker: 'R', path: '/reportes' },
];

/**
 * Rótulo legible de cada sección, usado en el breadcrumb del topbar.
 */
export const SECTION_TITLES: Record<Section, string> = {
  clientes: 'Clientes',
  cuentas: 'Cuentas',
  movimientos: 'Movimientos',
  reportes: 'Reportes',
};