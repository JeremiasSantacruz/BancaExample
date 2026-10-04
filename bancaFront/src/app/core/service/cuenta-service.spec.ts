import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Cuenta, Pagina } from '../model';
import { RETARDO_BUSQUEDA_MS } from './retardo-busqueda';
import { CuentaService } from './cuenta-service';

/** `CuentaController` devuelve el estado en minúsculas. */
function cuenta(overrides: Partial<Cuenta> = {}): Cuenta {
  return {
    cuentaId: '1',
    clienteId: '7',
    tipoCuenta: 'AHORRO',
    estado: 'ACTIVA',
    saldo: 1000,
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
function esperar(RETARDO = RETARDO_BUSQUEDA_MS + 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETARDO));
}

describe('CuentaService', () => {
  let service: CuentaService;
  let http: HttpTestingController;

  /** GET de la página de la tabla (el catálogo pide `size=all`). */
  const listado = () =>
    http.expectOne(
      (req) =>
        req.url === '/api/cuentas/buscar' && req.method === 'GET' && req.params.get('size') !== 'all',
    );

  /** GET del catálogo completo. */
  const catalogo = () =>
    http.expectOne(
      (req) => req.url === '/api/cuentas/buscar' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CuentaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CuentaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca en el endpoint de búsqueda, pide una página y normaliza los estados', () => {
    service.cargarCuentas();
    expect(service.loading()).toBe(true);

    const request = listado();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      pagina([
        cuenta({ estado: 'activa' as Cuenta['estado'] }),
        cuenta({ cuentaId: '2', clienteId: '8', estado: 'inactiva' as Cuenta['estado'] }),
      ]),
    );

    expect(service.loading()).toBe(false);
    expect(service.visibleCuentas().length).toBe(2);
    expect(service.visibleCuentas()[0].estado).toBe('ACTIVA');
    expect(service.visibleCuentas()[1].estado).toBe('INACTIVA');
  });

  it('expone los metadatos de la página', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta()], { page: 2, size: 10, totalElements: 24, totalPages: 3 }));

    expect(service.page()).toBe(2);
    expect(service.total()).toBe(24);
    expect(service.totalPages()).toBe(3);
    expect(service.hasNext()).toBe(false);
    expect(service.visibleRange()).toEqual({ desde: 21, hasta: 21 });
  });

  it('salta de página y vuelve a la primera al cambiar el tamaño', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta()], { totalElements: 40, totalPages: 4 }));

    service.setPage(3);
    const cuarta = listado();
    expect(cuarta.request.params.get('page')).toBe('3');
    cuarta.flush(pagina([cuenta()], { page: 3, size: 10, totalElements: 40, totalPages: 4 }));

    service.setSize(5);
    const primera = listado();
    expect(primera.request.params.get('page')).toBe('0');
    expect(primera.request.params.get('size')).toBe('5');
    primera.flush(pagina([], { size: 5, totalElements: 40, totalPages: 8 }));
  });

  it('envía cliente y estado como query params', () => {
    service.cargarCuentas({ clienteId: '7', estado: 'ACTIVA' });

    const request = listado();
    expect(request.request.params.get('clienteId')).toBe('7');
    expect(request.request.params.get('estado')).toBe('ACTIVA');
    request.flush(pagina([]));
  });

  it('filtra por titular y lo manda al backend', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta({ clienteId: '7' }), cuenta({ cuentaId: '2', clienteId: '8' })]));

    service.setClienteFilter('8');

    const request = listado();
    expect(request.request.params.get('clienteId')).toBe('8');
    request.flush(pagina([cuenta({ cuentaId: '2', clienteId: '8' })]));

    expect(service.clienteFilter()).toBe('8');
    expect(service.visibleCuentas().map((c) => c.cuentaId)).toEqual(['2']);
  });

  it('manda la búsqueda al backend con retardo', async () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta()]));

    service.setSearchTerm('ahorro');
    await esperar(RETARDO_BUSQUEDA_MS / 2);
    http.expectNone((req) => req.url === '/api/cuentas/buscar');

    await esperar();
    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('search')).toBe('ahorro');
    request.flush(pagina([cuenta()]));
  });

  it('limpiar filtros saca también el filtro de titular', () => {
    service.cargarCuentas({ clienteId: '7' });
    listado().flush(pagina([]));
    service.setClienteFilter('7');
    listado().flush(pagina([]));

    service.limpiarFiltros();

    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.has('clienteId')).toBe(false);
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([cuenta()]));

    expect(service.clienteFilter()).toBe('');
    expect(service.filters()).toEqual({});
  });

  it('trae el catálogo completo con size=all y calcula los totales globales con él', () => {
    service.cargarCatalogo();
    catalogo().flush(
      pagina(
        [
          cuenta({ saldo: 1000 }),
          cuenta({ cuentaId: '2', clienteId: '8', saldo: 250.5, estado: 'CERRADA' as Cuenta['estado'] }),
        ],
        {
          size: 2,
          totalElements: 2,
        },
      ),
    );

    expect(service.catalogo().length).toBe(2);
    expect(service.activeCuentasCount()).toBe(1);
    expect(service.totalSaldo()).toBe(1250.5);
    expect(service.cuentasOperativas().length).toBe(1);
    expect(service.cuentasPorId().get('1')?.clienteId).toBe('7');
    expect(service.cuentasDe('7').length).toBe(1);
    expect(service.saldoDe('2')).toBe(250.5);
    expect(service.saldoDe('99')).toBeNull();
  });

  it('no vuelve a pedir el catálogo ni el listado si ya se cargaron', () => {
    service.ensureCatalogo();
    catalogo().flush(pagina([]));
    service.ensureCatalogo();
    http.expectNone((req) => req.url === '/api/cuentas/buscar');

    service.ensureLoaded();
    listado().flush(pagina([]));
    service.ensureLoaded();
    http.expectNone((req) => req.url === '/api/cuentas/buscar');
  });

  it('invalidar marca lo viejo y el siguiente ensure vuelve al backend', () => {
    service.ensureCatalogo();
    catalogo().flush(pagina([cuenta()]));
    service.ensureLoaded();
    listado().flush(pagina([cuenta()]));

    service.invalidar();

    // Sin invalidar no se había pedido nada; ahora sí.
    service.ensureCatalogo();
    catalogo().flush(pagina([cuenta({ saldo: 900 })]));
    service.ensureLoaded();
    listado().flush(pagina([cuenta({ saldo: 900 })]));

    expect(service.saldoDe('1')).toBe(900);

    // Y una vez refreshed, vuelve a cachear hasta la próxima invalidación.
    service.ensureCatalogo();
    service.ensureLoaded();
    http.expectNone((req) => req.url === '/api/cuentas/buscar');
  });

  it('refrescar vuelve a pedir la tabla y el catálogo que ya estaban cargados', () => {
    service.ensureCatalogo();
    catalogo().flush(pagina([cuenta({ saldo: 1000 })]));
    service.ensureLoaded();
    listado().flush(pagina([cuenta({ saldo: 1000 })]));

    service.refrescar();

    const catalogoRequest = catalogo();
    expect(catalogoRequest.request.params.get('size')).toBe('all');
    catalogoRequest.flush(pagina([cuenta({ saldo: 750 })]));
    listado().flush(pagina([cuenta({ saldo: 750 })]));

    expect(service.saldoDe('1')).toBe(750);
    expect(service.activeCuentasCount()).toBe(1);
  });

  it('refrescar no consulta lo que nunca se cargó', () => {
    service.refrescar();

    http.expectNone((req) => req.url === '/api/cuentas/buscar');
  });

  it('trae las cuentas de un cliente puntual y las guarda en el catálogo', () => {
    service.cargarCuentasDe('7').subscribe();

    const request = http.expectOne((req) => req.url === '/api/cuentas/7');
    expect(request.request.method).toBe('GET');
    // Se piden todas: el catálogo no puede quedar con cuentas faltantes.
    expect(request.request.params.get('size')).toBe('all');
    request.flush(pagina([cuenta()]));

    expect(service.cuentasDe('7').map((c) => c.cuentaId)).toEqual(['1']);
    expect(service.catalogoCargado()).toBe(true);
  });

  it('crea la cuenta y recarga el listado', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta({ cuentaId: '1' })]));

    service.crearCuenta({ clienteId: '7', tipoCuenta: 'AHORRO' }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/cuentas');
    expect(request.request.method).toBe('POST');
    request.flush(cuenta({ cuentaId: '2' }));

    listado().flush(pagina([cuenta({ cuentaId: '1' }), cuenta({ cuentaId: '2' })]));

    expect(service.visibleCuentas().map((c) => c.cuentaId)).toEqual(['1', '2']);
  });

  it('envía cliente y cuenta en la URL al actualizar', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta({ cuentaId: '1', saldo: 1000 })]));

    service.actualizarCuenta('7', '1', { tipoCuenta: 'AHORRO', saldoInicial: 750 }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/cuentas/7/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ tipoCuenta: 'AHORRO', saldoInicial: 750 });
    request.flush(cuenta({ cuentaId: '1', saldo: 750 }));

    listado().flush(pagina([cuenta({ cuentaId: '1', saldo: 750 })]));

    expect(service.visibleCuentas()[0].saldo).toBe(750);
  });

  it('al eliminar deja la cuenta CERRADA en lugar de sacarla del histórico', () => {
    service.cargarCuentas();
    listado().flush(pagina([cuenta({ cuentaId: '1' }), cuenta({ cuentaId: '2' })]));

    service.eliminarCuenta('7', '1').subscribe();

    const request = http.expectOne((req) => req.url === '/api/cuentas/7/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    // El backend la deja CERRADA: el listado se recarga con el estado nuevo.
    listado().flush(
      pagina([cuenta({ cuentaId: '1', estado: 'CERRADA' as Cuenta['estado'] }), cuenta({ cuentaId: '2' })]),
    );

    expect(service.visibleCuentas().map((c) => c.cuentaId)).toEqual(['1', '2']);
    expect(service.visibleCuentas()[0].estado).toBe('CERRADA');
  });

  it('obtiene una cuenta con cliente y cuenta en la ruta', () => {
    service.cargarCatalogo();
    catalogo().flush(pagina([cuenta({ cuentaId: '1', clienteId: '7' })]));

    service.obtenerCuenta('1').subscribe();
    const request = http.expectOne((req) => req.url === '/api/cuentas/7/1');
    request.flush(cuenta({ cuentaId: '1' }));
  });

  it('guarda el error del backend', () => {
    service.cargarCuentas();
    listado().flush({ message: 'La cuenta no existe.' }, { status: 404, statusText: 'Not Found' });

    expect(service.error()).toBe('La cuenta no existe.');
  });
});