import { Routes } from '@angular/router';

/**
 * Cada sección es un componente independiente y se carga bajo demanda.
 * Los query params llegan como inputs gracias a `withComponentInputBinding`,
 * así `/cuentas?clienteId=7` abre la sección con el cliente ya filtrado.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'clientes', pathMatch: 'full' },
  {
    path: 'clientes',
    title: 'Clientes',
    loadComponent: () =>
      import('./features/clientes/clientes-section/clientes-section').then((m) => m.ClientesSection),
  },
  {
    path: 'cuentas',
    title: 'Cuentas',
    loadComponent: () =>
      import('./features/cuentas/cuentas-section/cuentas-section').then((m) => m.CuentasSection),
  },
  {
    path: 'movimientos',
    title: 'Movimientos',
    loadComponent: () =>
      import('./features/movimientos/movimientos-section/movimientos-section').then(
        (m) => m.MovimientosSection,
      ),
  },
  {
    path: 'reportes',
    title: 'Reportes',
    loadComponent: () =>
      import('./features/reportes/reportes-section/reportes-section').then(
        (m) => m.ReportesSection,
      ),
  },
  { path: '**', redirectTo: 'clientes' },
];