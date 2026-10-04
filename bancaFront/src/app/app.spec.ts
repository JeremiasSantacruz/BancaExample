import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { paginaDe } from './core/model';
import { App } from './app';

@Component({ selector: 'app-stub', template: 'stub' })
class StubSection {}

/** Respuesta paginada vacía, como la que devuelve el backend. */
function paginaVaciaBackend() {
  return paginaDe({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // Rutas stub: el shell se prueba sin arrastrar las secciones lazy.
        provideRouter([
          { path: 'clientes', component: StubSection },
          { path: 'cuentas', component: StubSection },
          { path: 'reportes', component: StubSection },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('crea el shell con sidebar, topbar y el router outlet', () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    // El shell pide el catálogo de clientes para el contador del sidebar.
    http.expectOne((req) => req.url === '/api/clientes').flush(paginaVaciaBackend());

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-sidebar')).not.toBeNull();
    expect(element.querySelector('app-topbar')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();

    http.verify();
  });

  it('muestra el título de la sección activa según la ruta', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);

    fixture.detectChanges();
    http.expectOne((req) => req.url === '/api/clientes').flush(paginaVaciaBackend());

    const titulo = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.breadcrumb strong')?.textContent;

    await router.navigate(['/cuentas']);
    await fixture.whenStable();
    expect(titulo()).toContain('Cuentas');

    await router.navigate(['/reportes']);
    await fixture.whenStable();
    expect(titulo()).toContain('Reportes');

    await router.navigate(['/clientes']);
    await fixture.whenStable();
    expect(titulo()).toContain('Clientes');

    http.verify();
  });
});
