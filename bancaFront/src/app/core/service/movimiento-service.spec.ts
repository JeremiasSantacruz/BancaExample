import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Movimiento, Pagina } from '../model';
import { RETARDO_BUSQUEDA_MS } from './retardo-busqueda';
import { MovimientoService } from './movimiento-service';

function movimiento(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    movimientoId: '1',
    cuentaId: '10',
    tipoMovimiento: 'DEPOSITO',
    estado: 'APPROVED',
    valor: 1000,
    fecha: '2025-01-15T10:00:00',
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

describe('MovimientoService', () => {
  let service: MovimientoService;
  let http: HttpTestingController;

  /** Endpoint de listado con filtros: `/movimientos` o `/movimientos/buscar`. */
  const listado = () =>
    http.expectOne(
      (req) =>
        (req.url === '/api/movimientos' || req.url === '/api/movimientos/buscar') &&
        req.method === 'GET',
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MovimientoService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MovimientoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('invalidar marca la página vieja y el siguiente ensure la vuelve a pedir', () => {
    service.ensureLoaded();
    listado().flush(pagina([movimiento()]));

    service.invalidar();

    service.ensureLoaded();
    const request = listado();
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([movimiento({ movimientoId: '2' })]));

    expect(service.visibleMovimientos().map((m) => m.movimientoId)).toEqual(['2']);

    service.ensureLoaded();
    http.expectNone((req) => req.url.startsWith('/api/movimientos'));
  });

  it('refrescar vuelve a pedir la página cargada y no inventa una que nunca se pidió', () => {
    service.refrescar();
    http.expectNone((req) => req.url.startsWith('/api/movimientos'));

    service.ensureLoaded();
    listado().flush(pagina([movimiento()]));

    service.refrescar();
    listado().flush(pagina([movimiento({ movimientoId: '2' })]));
  });

  it('carga la primera página y separa depósitos de retiros', () => {
    service.cargarMovimientos();

    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      pagina([
        movimiento({ valor: 1000 }),
        movimiento({ movimientoId: '2', tipoMovimiento: 'RETIRO', valor: 250 }),
      ]),
    );

    expect(service.appliedDeposits()).toBe(1000);
    expect(service.appliedWithdrawals()).toBe(250);
    expect(service.netAmount()).toBe(750);
  });

  it('solo suma al neto los movimientos que mueven el saldo', () => {
    service.cargarMovimientos();
    listado().flush(
      pagina([
        movimiento({ valor: 1000 }),
        movimiento({ movimientoId: '2', estado: 'REVERSED', valor: 500 }),
        movimiento({ movimientoId: '3', estado: 'REJECTED', valor: 300 }),
        movimiento({ movimientoId: '4', estado: 'REVERSED_CORRECTION', valor: 700 }),
      ]),
    );

    // La corrección REVERSED_CORRECTION es la que queda aplicada, por eso
    // 1000 (APPROVED) + 700 (corrección).
    expect(service.appliedDeposits()).toBe(1700);
    expect(service.visibleMovimientos().length).toBe(4);
  });

  it('busca por cuenta y rango de fechas', () => {
    service.cargarMovimientosFiltrados({
      cuentaId: '10',
      inicio: '2025-01-01',
      fin: '2025-01-31',
    });

    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('cuentaId')).toBe('10');
    expect(request.request.params.get('inicio')).toBe('2025-01-01');
    expect(request.request.params.get('fin')).toBe('2025-01-31');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([]));
  });

  it('expone los metadatos de la página y salta de página', () => {
    service.cargarMovimientos();
    listado().flush(pagina([movimiento()], { page: 0, size: 10, totalElements: 35, totalPages: 4 }));

    expect(service.total()).toBe(35);
    expect(service.totalPages()).toBe(4);
    expect(service.hasPrevious()).toBe(false);
    expect(service.hasNext()).toBe(true);

    service.setPage(3);
    const ultima = listado();
    expect(ultima.request.params.get('page')).toBe('3');
    ultima.flush(
      pagina([movimiento()], { page: 3, size: 10, totalElements: 35, totalPages: 4, first: false, last: true }),
    );

    expect(service.page()).toBe(3);
    expect(service.hasNext()).toBe(false);
  });

  it('los totales son los de la página visible, no los del histórico completo', () => {
    service.cargarMovimientos();
    listado().flush(
      pagina([movimiento({ valor: 1000 })], { size: 10, totalElements: 120, totalPages: 12 }),
    );

    expect(service.total()).toBe(120);
    expect(service.appliedDeposits()).toBe(1000);
  });

  it('normaliza la fecha al formato que espera el backend', () => {
    service
      .crearMovimiento({
        cuentaId: '10',
        tipoMovimiento: 'DEPOSITO',
        valor: 100,
        fecha: '2025-01-15T10:00',
        estado: 'APPROVED',
      })
      .subscribe();

    const request = http.expectOne((req) => req.url === '/api/movimientos');
    expect(request.request.method).toBe('POST');
    // El backend espera `YYYY-MM-DDTHH:mm:ss`, no `YYYY-MM-DDTHH:mm`.
    expect(request.request.body.fecha).toBe('2025-01-15T10:00:00');
    request.flush(movimiento());
    listado().flush(pagina([movimiento()]));
  });

  it('deja el movimiento nuevo al principio de la página recargada', () => {
    service.cargarMovimientos();
    listado().flush(pagina([movimiento({ movimientoId: '1' })]));

    service
      .crearMovimiento({
        cuentaId: '10',
        tipoMovimiento: 'DEPOSITO',
        valor: 100,
        fecha: '2025-01-15T10:00',
        estado: 'APPROVED',
      })
      .subscribe();

    http.expectOne((req) => req.url === '/api/movimientos').flush(movimiento({ movimientoId: '2' }));
    listado().flush(pagina([movimiento({ movimientoId: '2' }), movimiento({ movimientoId: '1' })]));

    expect(service.visibleMovimientos().map((m) => m.movimientoId)).toEqual(['2', '1']);
  });

  it('al revertir marca el movimiento y recarga el listado', () => {
    service.cargarMovimientos();
    listado().flush(pagina([movimiento({ movimientoId: '1' })]));

    service.revertirMovimiento('1').subscribe();

    const request = http.expectOne((req) => req.url === '/api/movimientos/1');
    expect(request.request.method).toBe('PUT');
    // El backend decide el estado de la reversa: no se manda cuerpo.
    expect(request.request.body).toBeNull();
    request.flush(movimiento({ movimientoId: '1', estado: 'REVERSED' }));

    // El backend genera el par REVERSED/REVERSED_CORRECTION, así que el
    // servicio vuelve a pedir el listado en vez de parchearlo localmente.
    listado().flush(
      pagina([
        movimiento({ movimientoId: '1', estado: 'REVERSED' }),
        movimiento({ movimientoId: '2', estado: 'REVERSED_CORRECTION' }),
      ]),
    );

    expect(service.items().length).toBe(2);
    // El original queda REVERSED y la corrección es la que mueve el saldo.
    expect(service.appliedDeposits()).toBe(1000);
  });

  it('elimina el movimiento y recarga el listado', () => {
    service.cargarMovimientos();
    listado().flush(pagina([movimiento({ movimientoId: '1' }), movimiento({ movimientoId: '2' })]));

    service.eliminarMovimiento('1').subscribe();

    const request = http.expectOne((req) => req.url === '/api/movimientos/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    listado().flush(pagina([movimiento({ movimientoId: '2' })]));

    expect(service.visibleMovimientos().map((m) => m.movimientoId)).toEqual(['2']);
  });

  it('consulta la extracción diaria con la fecha como query param', () => {
    service.obtenerExtraccionDiaria('10', '2025-01-15').subscribe();

    const request = http.expectOne((req) => req.url.includes('/api/movimientos/cuentas/10/extracciones-diarias'));
    expect(request.request.params.get('fecha')).toBe('2025-01-15');
    request.flush({ totalExtraido: '1200.50', cantidadRetiros: 2 });
  });

  it('convierte el total extraído a número', () => {
    let total = 0;

    service.obtenerExtraccionDiaria('10', '2025-01-15').subscribe((r) => (total = r.totalExtraido));
    http.expectOne((req) => req.url.includes('/api/movimientos/cuentas/10/extracciones-diarias')).flush({
      totalExtraido: '1200.50',
    });

    expect(total).toBe(1200.5);
  });

  it('manda la búsqueda al backend con retardo en vez de filtrar en el navegador', async () => {
    service.cargarMovimientos();
    listado().flush(
      pagina([
        movimiento({ movimientoId: '1', tipoMovimiento: 'DEPOSITO', valor: 1000 }),
        movimiento({ movimientoId: '2', cuentaId: '11', tipoMovimiento: 'RETIRO', valor: 200 }),
      ]),
    );

    service.setSearchTerm('retiro');
    await esperar(RETARDO_BUSQUEDA_MS / 2);
    http.expectNone((req) => req.url.includes('/api/movimientos'));

    await esperar();
    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.get('search')).toBe('retiro');
    request.flush(pagina([movimiento({ movimientoId: '2', tipoMovimiento: 'RETIRO', valor: 200 })]));

    expect(service.searchTerm()).toBe('retiro');
    expect(service.visibleMovimientos().map((m) => m.movimientoId)).toEqual(['2']);
  });

  it('limpia filtros y búsqueda y vuelve a la primera página', () => {
    service.cargarMovimientosFiltrados({ cuentaId: '10' });
    listado().flush(pagina([movimiento()], { totalElements: 30, totalPages: 3 }));
    service.setPage(2);
    listado().flush(pagina([movimiento()], { page: 2, size: 10, totalElements: 30, totalPages: 3 }));

    service.limpiarFiltros();

    const request = http.expectOne((req) => req.url === '/api/movimientos/buscar');
    expect(request.request.params.has('cuentaId')).toBe(false);
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([movimiento()]));

    expect(service.filters()).toEqual({});
    expect(service.searchTerm()).toBe('');
    expect(service.page()).toBe(0);
  });

  it('indexa los movimientos de una cuenta', () => {
    service.cargarMovimientos();
    listado().flush(
      pagina([movimiento({ movimientoId: '1', cuentaId: '10' }), movimiento({ movimientoId: '2', cuentaId: '11' })]),
    );

    expect(service.movimientosDe('10').map((m) => m.movimientoId)).toEqual(['1']);
    expect(service.movimientosDe('99')).toEqual([]);
  });

  it('guarda el error del backend', () => {
    service.cargarMovimientos();
    listado().flush({ message: 'No se pudo leer el historial.' }, { status: 500, statusText: 'Error' });

    expect(service.error()).toBe('No se pudo leer el historial.');
    expect(service.loading()).toBe(false);
  });
});
