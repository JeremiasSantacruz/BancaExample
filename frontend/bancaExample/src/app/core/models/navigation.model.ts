export type Section = 'clientes' | 'cuentas' | 'movimientos' | 'reportes';

export interface NavigationItem {
  id: Section;
  label: string;
  marker: string;
}
