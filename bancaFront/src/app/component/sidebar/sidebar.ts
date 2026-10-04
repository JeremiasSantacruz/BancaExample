import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAVIGATION } from '../../core/model';

/**
 * Menú lateral. La navegación va por rutas, así que el estado activo lo
 * resuelve `routerLinkActive` y no hace falta cablear nada desde el shell.
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: { style: 'display: contents' },
})
export class Sidebar {
  readonly navigation = NAVIGATION;
  /** Contador de clientes que se muestra junto a la primera entrada. */
  readonly clienteCount = input(0);
}