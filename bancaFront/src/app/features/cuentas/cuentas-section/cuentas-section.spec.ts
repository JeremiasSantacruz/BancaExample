import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Cliente, Cuenta, Pagina } from '../../../core/model';
import { CuentaService } from '../../../core/service/cuenta-service';
import { RETARDO_BUSQUEDA_MS } from '../../../core/service/retardo-busqueda';
import { CuentasSection } from './cuentas-section';

function cuenta(overrides: Partial<Cuenta> = {}): Cuenta {
  return {
    cuentaId: '10',
    clienteId: '7',
    tipoCuenta: 'AHORRO',
    estado: 'ACTIVA',
    saldo: 1000,
    ...overrides,
  };
}

function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    clienteId: '7',
    contrasena: 'secreto',
    estado: 'ACTIVO',
    nombre: 'Ana Gómez',
    genero: 'Femenino',
    edad: 33,
    identificacion: '30111222',
    direccion: 'San Juan 123',
    telefono: '3415550000',
    ...overrides,
  };
}

/** Respuesta paginada del backend. */
function pagina<T>(content: T[], overrides: Partial<Pagina<T>> = {}): Pagina<T> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    ...overrides,
  };
}

/** Espera lo suficiente para que el retardo de la búsqueda se dispare. */
function esperar(retardo = RETARDO_BUSQUEDA_MS + 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, retardo));
}

describe('CuentasSection', () => {
  let fixture: ComponentFixture<CuentasSection>;
  let http: HttpTestingController;
  let router: Router;

  const element = () => fixture.nativeElement as HTMLElement;

  const boton = (texto: string, raiz: ParentNode = element()) =>
    Array.from(raiz.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;

  const filas = () => element().querySelectorAll('tbody tr:not(:has(td.empty-state))');

  const tarjetas = () =>
    Array.from(element().querySelectorAll('article[app-summary-card]')).map((t) =>
      t.textContent?.replace(/\s+/g, ' ').trim(),
    );

  /** GET de la página de cuentas (el catálogo pide `size=all`). */
  const listado = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/cuentas/buscar' && req.method === 'GET' && req.params.get('size') !== 'all',
    );

  /** GET del catálogo completo de cuentas. */
  const catalogoCuentas = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/cuentas/buscar' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  /** GET del catálogo de clientes, para los nombres y el filtro por titular. */
  const catalogoClientes = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  const elegir = (id: string, valor: string) => {
    const select = element().querySelector(`#${id}`) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentasSection],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentasSection);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    // La tabla pide su página; los selectores y las tarjetas, los catálogos.
    listado().flush(pagina([cuenta(), cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 })]));
    catalogoCuentas().flush(
      pagina([cuenta({ saldo: 1000 }), cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 })]),
    );
    catalogoClientes().flush(
      pagina([
        cliente(),
        cliente({ clienteId: '8', nombre: 'Luis Pérez', identificacion: '30111333' }),
      ]),
    );
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('lista la página que pidió el backend', () => {
    expect(filas().length).toBe(2);
    expect(element().textContent).toContain('Ana Gómez');
    expect(element().textContent).toContain('Luis Pérez');
    expect(element().textContent).toContain('1.250');
  });

  it('las tarjetas usan el catálogo y no la página visible', () => {
    expect(tarjetas().some((t) => t?.includes('Total cuentas') && t.includes('2'))).toBe(true);
    expect(tarjetas().some((t) => t?.includes('Cuentas activas') && t.includes('2'))).toBe(true);
    expect(tarjetas().some((t) => t?.includes('Saldo total') && t.includes('1.250'))).toBe(true);
  });

  it('el filtro por titular usa el catálogo de clientes y viaja al backend', async () => {
    const opciones = Array.from(
      element().querySelectorAll<HTMLOptionElement>('app-table-toolbar select option'),
    ).map((opcion) => opcion.textContent?.trim());

    expect(opciones).toEqual(['Todos los clientes', 'Ana Gómez', 'Luis Pérez']);

    const select = element().querySelector('.filter-select') as HTMLSelectElement;
    select.value = '8';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('clienteId')).toBe('8');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 })]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    // El catálogo no se vuelve a pedir: ya está cargado.
    http.expectNone(
      (req) =>
        req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );
  });

  it('el total de la tarjeta sigue al filtro, las cuentas activas al catálogo', async () => {
    const select = element().querySelector('.filter-select') as HTMLSelectElement;
    select.value = '8';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    listado().flush(pagina([cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 })]));
    await fixture.whenStable();

    expect(tarjetas().some((t) => t?.includes('Total cuentas') && t.includes('1'))).toBe(true);
    // El catálogo todavía tiene las dos cuentas activas del sistema.
    expect(tarjetas().some((t) => t?.includes('Cuentas activas') && t.includes('2'))).toBe(true);
  });

  it('muestra el rango de la página y deshabilita la navegación sin páginas', () => {
    expect(element().querySelector('.pagination-summary')?.textContent).toContain(
      'Mostrando 1-2 de 2',
    );

    const botones = Array.from(
      element().querySelectorAll<HTMLButtonElement>('app-pagination nav button'),
    );
    expect(botones.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Página anterior',
      'Página siguiente',
    ]);
    expect(botones.every((b) => b.disabled)).toBe(true);
  });

  it('pide la página siguiente con el control de paginación', async () => {
    // El catálogo ya está cargado, así que hace falta una consulta nueva para
    // tener un resultado con varias páginas.
    TestBed.inject(CuentaService).cargarCuentas();
    listado().flush(
      pagina([cuenta(), cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 })], {
        totalElements: 34,
        totalPages: 4,
        last: false,
      }),
    );
    await fixture.whenStable();

    const siguiente = element().querySelector(
      'app-pagination button[aria-label="Página siguiente"]',
    ) as HTMLButtonElement;
    expect(siguiente.disabled).toBe(false);
    siguiente.click();
    await fixture.whenStable();

    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('page')).toBe('1');
    request.flush(
      pagina(
        [cuenta({ cuentaId: '12' })],
        { page: 1, totalElements: 34, totalPages: 4, first: false, last: false },
      ),
    );
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    expect(element().querySelector('.pagination-summary')?.textContent).toContain(
      'Mostrando 11-11 de 34',
    );
    // La tabla trae solo la página pedida, aunque el filtro por titular siga
    // ofreciendo todos los clientes del catálogo.
    expect(element().querySelector('table')?.textContent).not.toContain('Luis Pérez');
    expect(element().querySelector('select.filter-select option:last-child')?.textContent).toContain(
      'Luis Pérez',
    );
  });

  it('cambia el tamaño de página desde el control', async () => {
    const select = element().querySelector(
      'app-pagination .pagination-size select',
    ) as HTMLSelectElement;
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('size')).toBe('25');
    request.flush(pagina([cuenta()]));
    await fixture.whenStable();

    expect(element().textContent).toContain('2');
  });

  it('navega a movimientos con la cuenta seleccionada', async () => {
    (filas()[0] as HTMLElement).click();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/movimientos'], {
      queryParams: { cuentaId: '10' },
    });
  });

  it('no navega cuando el clic viene de los botones de la fila', async () => {
    boton('Editar').click();
    await fixture.whenStable();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('abre el alta vacía', async () => {
    boton('Nueva cuenta').click();
    await fixture.whenStable();

    expect(element().querySelector('app-cuenta-form')).not.toBeNull();
    expect((element().querySelector('#cuenta-cliente') as HTMLSelectElement).value).toBe('');
  });

  it('no crea la cuenta si no se eligió cliente', async () => {
    boton('Nueva cuenta').click();
    await fixture.whenStable();

    boton('Crear cuenta').click();
    await fixture.whenStable();

    http.expectNone((req) => req.url === '/api/cuentas' && req.method === 'POST');
    expect(element().querySelector('app-cuenta-form')).not.toBeNull();
  });

  it('crea la cuenta y recarga tabla y catálogo', async () => {
    boton('Nueva cuenta').click();
    await fixture.whenStable();
    elegir('cuenta-cliente', '7');
    elegir('cuenta-tipo', 'CORRIENTE');

    boton('Crear cuenta').click();

    const request = http.expectOne((req) => req.url === '/api/cuentas' && req.method === 'POST');
    expect(request.request.body).toEqual({ clienteId: '7', tipoCuenta: 'CORRIENTE' });
    request.flush(cuenta({ cuentaId: '12', tipoCuenta: 'CORRIENTE' }));
    await fixture.whenStable();

    listado().flush(
      pagina([
        cuenta(),
        cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 }),
        cuenta({ cuentaId: '12', tipoCuenta: 'CORRIENTE' }),
      ]),
    );
    catalogoCuentas().flush(
      pagina([
        cuenta(),
        cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 }),
        cuenta({ cuentaId: '12', tipoCuenta: 'CORRIENTE' }),
      ]),
    );
    await fixture.whenStable();

    expect(element().querySelector('app-cuenta-form')).toBeNull();
    expect(filas().length).toBe(3);
    expect(element().textContent).toContain('Creaste la cuenta 12.');
  });

  it('actualiza la cuenta editada sin crear otra', async () => {
    boton('Editar').click();
    await fixture.whenStable();

    expect((element().querySelector('#cuenta-saldo') as HTMLInputElement).value).toBe('1000');

    boton('Guardar cambios').click();

    const request = http.expectOne((req) => req.url === '/api/cuentas/7/10' && req.method === 'PUT');
    request.flush(cuenta({ saldo: 750 }));
    await fixture.whenStable();

    listado().flush(pagina([cuenta({ saldo: 750 }), cuenta({ cuentaId: '11', clienteId: '8' })]));
    catalogoCuentas().flush(pagina([cuenta({ saldo: 750 })]));
    await fixture.whenStable();

    expect(element().textContent).toContain('Actualizaste la cuenta 10.');
    expect(element().textContent).toContain('750');
  });

  it('cierra la cuenta tras confirmar', async () => {
    boton('Cerrar').click();
    await fixture.whenStable();
    boton('Cerrar cuenta').click();

    const request = http.expectOne((req) => req.url === '/api/cuentas/7/10' && req.method === 'DELETE');
    request.flush(null);
    await fixture.whenStable();

    listado().flush(
      pagina([
        cuenta({ estado: 'CERRADA' }),
        cuenta({ cuentaId: '11', clienteId: '8', saldo: 250 }),
      ]),
    );
    catalogoCuentas().flush(pagina([cuenta({ estado: 'CERRADA' })]));
    await fixture.whenStable();

    expect(element().textContent).toContain('La cuenta 10 quedó en estado CERRADA.');
    // Solo la cuenta 11 sigue operativa.
    expect(element().querySelectorAll('.status.status-good').length).toBe(1);
  });

  it('no borra nada si se cancela el cierre', async () => {
    boton('Cerrar').click();
    await fixture.whenStable();
    boton('Cancelar').click();
    await fixture.whenStable();

    http.expectNone((req) => req.method === 'DELETE');
    expect(element().querySelector('app-confirm-dialog')).toBeNull();
  });

  it('muestra el error del backend dentro del formulario', async () => {
    boton('Nueva cuenta').click();
    await fixture.whenStable();
    elegir('cuenta-cliente', '7');

    boton('Crear cuenta').click();

    http
      .expectOne('/api/cuentas')
      .flush(
        { message: 'El cliente no está ACTIVO.' },
        { status: 422, statusText: 'Unprocessable' },
      );
    await fixture.whenStable();

    expect(element().querySelector('app-cuenta-form')?.textContent).toContain(
      'El cliente no está ACTIVO.',
    );
  });

  it('manda la búsqueda de la tabla al backend con retardo', async () => {
    const input = element().querySelector('app-table-toolbar input') as HTMLInputElement;
    input.value = 'corriente';
    input.dispatchEvent(new Event('input'));

    await esperar(RETARDO_BUSQUEDA_MS / 2);
    http.expectNone((req) => req.url === '/api/cuentas/buscar');

    await esperar();
    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar' && req.params.has('search'));
    expect(request.request.params.get('search')).toBe('corriente');
    request.flush(pagina([cuenta({ tipoCuenta: 'CORRIENTE' })]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    expect(element().textContent).toContain('CORRIENTE');
  });

  it('aplica y limpia los filtros de la tarjeta de búsqueda', async () => {
    const select = element().querySelector('#filter-estado') as HTMLSelectElement;
    select.value = 'CERRADA';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    boton('Aplicar filtros').click();
    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('estado')).toBe('CERRADA');
    request.flush(pagina([]));
    await fixture.whenStable();

    expect(filas().length).toBe(0);

    boton('Limpiar').click();
    const limpiar = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(limpiar.request.params.has('estado')).toBe(false);
    expect(limpiar.request.params.get('page')).toBe('0');
    limpiar.flush(pagina([cuenta()]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
  });
});