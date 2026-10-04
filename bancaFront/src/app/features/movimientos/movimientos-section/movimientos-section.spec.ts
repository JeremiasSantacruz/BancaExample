import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cliente, Cuenta, Movimiento, Pagina } from '../../../core/model';
import { MovimientoService } from '../../../core/service/movimiento-service';
import { RETARDO_BUSQUEDA_MS } from '../../../core/service/retardo-busqueda';
import { MovimientosSection } from './movimientos-section';

function movimiento(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    movimientoId: '1',
    cuentaId: '10',
    tipoMovimiento: 'DEPOSITO',
    valor: 500,
    estado: 'APPROVED',
    fecha: '2026-10-01T10:30:00',
    ...overrides,
  };
}

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

describe('MovimientosSection', () => {
  let fixture: ComponentFixture<MovimientosSection>;
  let http: HttpTestingController;

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

  /** GET de la página de movimientos (el catálogo de cuentas pide `size=all`). */
  const listado = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/movimientos/buscar' && req.method === 'GET',
    );

  /** GET del catálogo completo de cuentas, para los selectores del formulario. */
  const catalogoCuentas = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/cuentas/buscar' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  /** GET del catálogo de clientes, para saber qué cuentas pueden moverse. */
  const catalogoClientes = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  const escribir = (id: string, valor: string) => {
    const campo = element().querySelector(`#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  const elegir = (id: string, valor: string) => {
    const select = element().querySelector(`#${id}`) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientosSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientosSection);
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    // La tabla pide su página; el formulario, los catálogos completos.
    listado().flush(
      pagina([
        movimiento(),
        movimiento({
          movimientoId: '2',
          cuentaId: '11',
          tipoMovimiento: 'RETIRO',
          valor: 200,
        }),
      ]),
    );
    catalogoCuentas().flush(
      pagina([
        cuenta({ saldo: 1000 }),
        cuenta({ cuentaId: '11', clienteId: '8', saldo: 800 }),
      ]),
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

  it('lista la página que pidió el backend con sus estados', () => {
    expect(filas().length).toBe(2);
    const estados = Array.from(element().querySelectorAll('tbody tr .status')).map((e) =>
      e.textContent?.trim(),
    );
    expect(estados).toEqual(['APPROVED', 'APPROVED']);
    expect(element().querySelectorAll('.status.status-good').length).toBe(2);
    expect(element().querySelector('tbody tr .deposit-amount')?.textContent).toContain('500');
  });

  it('los totales de la tabla son de la página y no del histórico', () => {
    expect(tarjetas().some((t) => t?.includes('Total movimientos') && t.includes('2'))).toBe(true);
    // 500 de depósito contra 200 de retiro.
    expect(tarjetas().some((t) => t?.includes('Depósitos aplicados') && t.includes('500'))).toBe(
      true,
    );
    expect(tarjetas().some((t) => t?.includes('Retiros aplicados') && t.includes('200'))).toBe(true);

    expect(element().querySelector('.table-footer strong')?.textContent?.trim()).toContain(
      '300,00',
    );
  });

  it('ofrece en el alta solo las cuentas activas de clientes activos', async () => {
    boton('Nuevo movimiento').click();
    await fixture.whenStable();

    const opciones = Array.from(
      element().querySelectorAll<HTMLOptionElement>('#movimiento-cuenta option'),
    ).map((o) => o.textContent?.trim());

    expect(opciones.length).toBe(3);
    expect(opciones[0]).toBe('Selecciona una cuenta');
  });

  it('no registra el movimiento si faltan campos obligatorios', async () => {
    boton('Nuevo movimiento').click();
    await fixture.whenStable();

    boton('Registrar movimiento').click();
    await fixture.whenStable();

    http.expectNone((req) => req.url === '/api/movimientos' && req.method === 'POST');
    expect(element().querySelector('app-movimiento-form')).not.toBeNull();
  });

  it('registra el movimiento y recarga tabla y catálogo de cuentas', async () => {
    boton('Nuevo movimiento').click();
    await fixture.whenStable();
    elegir('movimiento-cuenta', '10');
    escribir('movimiento-fecha', '2026-10-04T09:15');
    escribir('movimiento-valor', '750');
    elegir('movimiento-estado', 'APPROVED');

    boton('Registrar movimiento').click();

    const request = http.expectOne((req) => req.url === '/api/movimientos' && req.method === 'POST');
    expect(request.request.body).toEqual({
      cuentaId: '10',
      fecha: '2026-10-04T09:15:00',
      tipoMovimiento: 'DEPOSITO',
      valor: 750,
      estado: 'APPROVED',
    });
    request.flush(movimiento({ movimientoId: '3', valor: 750, fecha: '2026-10-04T09:15:00' }));
    await fixture.whenStable();

    // El saldo de la cuenta cambió, así que el catálogo se vuelve a pedir: de
    // ahí salen el selector y el saldo que muestra el formulario.
    const catalogo = http.expectOne(
      (req) =>
        req.url === '/api/cuentas/buscar' && req.params.get('size') === 'all',
    );
    expect(catalogo.request.params.get('size')).toBe('all');
    catalogo.flush(pagina([cuenta({ saldo: 1750 })]));
    listado().flush(pagina([movimiento({ movimientoId: '3', valor: 750 })]));
    await fixture.whenStable();

    expect(element().querySelector('app-movimiento-form')).toBeNull();
    expect(filas().length).toBe(1);
    expect(element().textContent).toContain('Registraste un DEPOSITO');

    // La tabla de cuentas nunca se abrió en esta pantalla, así que no se pide.
    http.expectNone(
      (req) => req.url === '/api/cuentas/buscar' && req.params.get('size') !== 'all',
    );
  });

  it('revierte el movimiento confirmado y recarga el listado', async () => {
    boton('Reversar').click();
    await fixture.whenStable();
    boton('Reversar movimiento').click();

    const request = http.expectOne((req) => req.url === '/api/movimientos/1' && req.method === 'PUT');
    expect(request.request.body).toBeNull();
    request.flush(movimiento({ movimientoId: '4', estado: 'REVERSED_CORRECTION' }));
    await fixture.whenStable();

    http.expectOne(
      (req) => req.url === '/api/cuentas/buscar' && req.params.get('size') === 'all',
    ).flush(pagina([cuenta({ saldo: 500 })]));
    listado().flush(
      pagina([
        movimiento({ movimientoId: '4', estado: 'REVERSED_CORRECTION', valor: 500 }),
      ]),
    );
    await fixture.whenStable();

    expect(element().textContent).toContain('Se revirtió el movimiento 1.');
    expect(filas().length).toBe(1);
  });

  it('no revierte nada si se cancela la confirmación', async () => {
    boton('Reversar').click();
    await fixture.whenStable();
    boton('Cancelar').click();
    await fixture.whenStable();

    http.expectNone((req) => req.url.startsWith('/api/movimientos/') && req.method === 'PUT');
    expect(element().querySelector('app-confirm-dialog')).toBeNull();
  });

  it('muestra el error del backend al revertir', async () => {
    boton('Reversar').click();
    await fixture.whenStable();
    boton('Reversar movimiento').click();

    http.expectOne((req) => req.method === 'PUT').flush(
      { message: 'El movimiento no es corregible.' },
      { status: 422, statusText: 'Unprocessable' },
    );
    await fixture.whenStable();

    expect(element().textContent).toContain('El movimiento no es corregible.');
  });

  it('manda la búsqueda al backend con retardo', async () => {
    const input = element().querySelector('app-table-toolbar input') as HTMLInputElement;
    input.value = 'REVERSED';
    input.dispatchEvent(new Event('input'));

    await esperar(RETARDO_BUSQUEDA_MS / 2);
    http.expectNone((req) => req.url === '/api/movimientos/buscar');

    await esperar();
    const request = http.expectOne(
      (req) => req.url === '/api/movimientos/buscar' && req.params.has('search'),
    );
    expect(request.request.params.get('search')).toBe('REVERSED');
    request.flush(pagina([movimiento({ estado: 'REVERSED' })]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    expect(element().querySelectorAll('.status.status-good').length).toBe(0);
  });

  it('aplica y limpia los filtros de cuenta y fechas', async () => {
    escribir('filter-cuentaId', '11');
    escribir('filter-inicio', '2026-10-01');
    escribir('filter-fin', '2026-10-31');
    await fixture.whenStable();

    boton('Aplicar filtros').click();
    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('cuentaId')).toBe('11');
    expect(request.request.params.get('inicio')).toBe('2026-10-01');
    expect(request.request.params.get('fin')).toBe('2026-10-31');
    request.flush(pagina([]));
    await fixture.whenStable();

    expect(filas().length).toBe(0);

    boton('Limpiar').click();
    const limpiar = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(limpiar.request.params.has('cuentaId')).toBe(false);
    expect(limpiar.request.params.has('inicio')).toBe(false);
    limpiar.flush(pagina([movimiento()]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
  });

  it('pide la página siguiente con el control de paginación', async () => {
    TestBed.inject(MovimientoService).cargarMovimientos();
    listado().flush(pagina([movimiento()], { totalElements: 24, totalPages: 3, last: false }));
    await fixture.whenStable();

    const siguiente = element().querySelector(
      'app-pagination button[aria-label="Página siguiente"]',
    ) as HTMLButtonElement;
    siguiente.click();
    await fixture.whenStable();

    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('page')).toBe('1');
    request.flush(
      pagina([movimiento({ movimientoId: '2' })], {
        page: 1,
        totalElements: 24,
        totalPages: 3,
        first: false,
        last: false,
      }),
    );
    await fixture.whenStable();

    expect(element().querySelector('.pagination-summary')?.textContent).toContain(
      'Mostrando 11-11 de 24',
    );
    expect(filas().length).toBe(1);
  });

  it('cambia el tamaño de página desde el control', async () => {
    const select = element().querySelector(
      'app-pagination .pagination-size select',
    ) as HTMLSelectElement;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('size')).toBe('5');
    request.flush(pagina([movimiento()], { size: 5, totalElements: 12, totalPages: 3, last: false }));
    await fixture.whenStable();

    expect(element().textContent).toContain('Mostrando 1-1 de 12');
  });
});