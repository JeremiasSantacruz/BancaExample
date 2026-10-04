import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

/**
 * Navegación entre secciones.
 *
 * Las filas de clientes y cuentas llevan a otra sección con un query param, y
 * esas secciones lo leen con un `effect`. Estos tests cubren el camino completo
 * (shell + rutas + secciones) porque el problema era del ensemble: un `effect`
 * que dispara una consulta a un servicio que a su vez escribe señales de
 * filtro queda sucio por su propia escritura y se vuelve a ejecutar, repitiendo
 * la misma petición indefinidamente.
 */

function pagina(content: unknown[], extra: Record<string, unknown> = {}) {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    ...extra,
  };
}

const cliente = { clienteId: '7', nombre: 'Ana', estado: 'ACTIVO', contrasena: 'x' };
const cuenta = {
  cuentaId: '10',
  clienteId: '7',
  tipoCuenta: 'AHORRO',
  estado: 'ACTIVA',
  saldo: 1000,
};

function cuerpoDe(url: string) {
  if (url.includes('/movimientos')) {
    return pagina([]);
  }

  if (url.includes('/cuentas')) {
    return pagina([cuenta]);
  }

  return pagina([cliente]);
}

describe('navegación entre secciones', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<App>;
  let pedidos: string[];

  /**
   * Responde todo lo pendiente y repite mientras sigan llegando peticiones.
   *
   * El límite corta un bucle con un error legible en lugar de dejar que el
   * worker se quede sin memoria.
   */
  const drenar = (iteraciones = 25) => {
    let respondidas = 0;

    for (let i = 0; i < iteraciones; i++) {
      const pendientes = http.match(() => true);

      if (pendientes.length === 0) {
        return respondidas;
      }

      respondidas += pendientes.length;

      for (const req of pendientes) {
        const linea =
          `${req.request.method} ${req.request.url} ${req.request.params.toString()}`.trim();

        pedidos.push(linea);

        if (pedidos.length > 20) {
          throw new Error('bucle de peticiones:\n' + pedidos.join('\n'));
        }

        req.flush(cuerpoDe(req.request.url));
      }

      fixture.detectChanges();
    }

    return respondidas;
  };

  /**
   * Deja que la navegación cree la sección, responda y pinte la tabla.
   *
   * Las rutas cargan el componente con `loadComponent`, así que las peticiones
   * aparecen en varias rondas; el bucle corta cuando dos rondas seguidas no
   * traen nada nuevo.
   */
  const asentar = async () => {
    for (let i = 0; i < 12; i++) {
      await fixture.whenStable();

      const respondidas = drenar();
      fixture.detectChanges();

      if (respondidas === 0) {
        await fixture.whenStable();

        if (drenar() === 0) {
          fixture.detectChanges();
          return;
        }
      }
    }
  };

  const filas = () =>
    fixture.nativeElement.querySelectorAll('tbody tr:not(:has(td.empty-state))');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    pedidos = [];

    // El shell arranca en `/`; cada test navega a la sección que necesita.
    await asentar();
  });

  /** Navega a una sección y espera a que termine de pedir sus datos. */
  const irA = async (url: string) => {
    await router.navigateByUrl(url);
    await asentar();
  };

  afterEach(() => http.verify());

  it('abre la sección de cuentas pidiendo cada cosa una sola vez', async () => {
    await irA('/cuentas');

    expect(pedidos).toContain('GET /api/cuentas/buscar page=0&size=10');
    expect(pedidos).toContain('GET /api/cuentas/buscar size=all');
    expect(pedidos).toContain('GET /api/clientes size=all');
    expect(filas().length).toBe(1);
  });

  it('lleva a los movimientos de la cuenta con un clic y una sola petición', async () => {
    await irA('/cuentas');
    pedidos = [];

    (filas()[0] as HTMLElement).click();
    await asentar();

    expect(router.url).toBe('/movimientos?cuentaId=10');
    expect(pedidos.filter((p) => p.startsWith('GET /api/movimientos/buscar'))).toEqual([
      'GET /api/movimientos/buscar cuentaId=10&page=0&size=10',
    ]);
  });

  it('lleva a las cuentas del cliente con un clic y una sola petición', async () => {
    await irA('/clientes');
    pedidos = [];

    (filas()[0] as HTMLElement).click();
    await asentar();

    expect(router.url).toBe('/cuentas?clienteId=7');
    expect(pedidos.filter((p) => p.includes('/api/cuentas/buscar') && p.includes('clienteId=7'))).
      toHaveLength(1);
  });

  it('abrir /cuentas?clienteId=7 filtra sin repetir la consulta', async () => {
    await irA('/cuentas');
    pedidos = [];

    await irA('/cuentas?clienteId=7');

    expect(pedidos.filter((p) => p.includes('clienteId=7'))).toHaveLength(1);
  });

  it('abrir /movimientos?cuentaId=10 no pide además la consulta sin filtro', async () => {
    await irA('/cuentas');
    pedidos = [];

    await irA('/movimientos?cuentaId=10');

    expect(pedidos.filter((p) => p.startsWith('GET /api/movimientos/buscar'))).toEqual([
      'GET /api/movimientos/buscar cuentaId=10&page=0&size=10',
    ]);
  });
});