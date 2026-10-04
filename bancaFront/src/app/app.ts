import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Sidebar } from './component/sidebar/sidebar';
import { TopbarComponent } from './component/topbar/topbar';
import { NAVIGATION, SECTION_TITLES, Section } from './core/model';
import { ClienteService } from './core/service';

/**
 * Shell de la aplicación.
 *
 * Solo aporta el layout (sidebar, topbar y el `outlet`). Cada sección es un
 * componente independiente que resuelve sus propios datos y estados.
 */
@Component({
  imports: [RouterOutlet, Sidebar, TopbarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly clienteService = inject(ClienteService);

  /**
   * Número de clientes, para el contador del sidebar.
   *
   * Sale del catálogo completo y no de la página de la tabla: con filtros o
   * paginación, `total` sería el total filtrado de una sección y el contador
   * del sidebar tiene que ser global.
   */
  protected readonly clienteCount = this.clienteService.totalCatalogo;

  /**
   * Sección activa, derivada de la URL.
   *
   * Se usa `startWith` para que el breadcrumb tenga valor en el primer render,
   * antes de que ocurra el primer `NavigationEnd`.
   */
  private readonly activeUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly sectionTitle = computed(() => {
    const url = this.activeUrl();
    const match = NAVIGATION.find((item) => url.startsWith(item.path));
    const section: Section = match?.id ?? 'clientes';

    return SECTION_TITLES[section];
  });

  constructor() {
    // El sidebar muestra el total de clientes, así que hay que traerlo una vez.
    this.clienteService.ensureCatalogo();
  }
}