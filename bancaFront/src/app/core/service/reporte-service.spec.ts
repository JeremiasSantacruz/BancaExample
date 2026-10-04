import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Movimiento, Pagina, Reporte } from '../model';
import { ReporteService } from './reporte-service';

/** El backend devuelve un bloque por cuenta del cliente. */
function reporte(overrides: Partial<Reporte> = {}): Reporte {
  return {
    clienteId: '7',
    cuentaId: '10',
    tipoCuenta: 'AHORRO',
    estado: 'ACTIVA',
    saldo: 750,
    movimientos: [],
    ...overrides,
  };
}

/** Movimiento suelto dentro de un bloque. */
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

describe('ReporteService', () => {
  let service: ReporteService;
  let http: HttpTestingController;

  const consulta = () => http.expectOne((req) => req.url === '/api/reportes' && req.method === 'GET');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReporteService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ReporteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('exige un cliente antes de consultar', () => {
    service.generar('   ');

    expect(service.error()).toBe('Seleccioná un cliente para generar el reporte.');
    http.expectNone((req) => req.url === '/api/reportes');
  });

  it('rechaza un rango invertido sin tocar el backend', () => {
    service.generar('7', '2025-02-01', '2025-01-01');

    expect(service.error()).toBe('La fecha inicial no puede ser posterior a la fecha final.');
    expect(service.consultado()).toBe(false);
    http.expectNone((req) => req.url === '/api/reportes');
  });

  it('consulta con cliente, rango y página, y guarda el rango aplicado', () => {
    service.generar('7', '2025-01-01', '2025-01-31');

    expect(service.consultado()).toBe(true);
    expect(service.desde()).toBe('2025-01-01');
    expect(service.hasta()).toBe('2025-01-31');

    const request = consulta();
    expect(request.request.params.get('clienteId')).toBe('7');
    expect(request.request.params.get('inicio')).toBe('2025-01-01');
    expect(request.request.params.get('fin')).toBe('2025-01-31');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(pagina([reporte()]));
  });

  it('pagina por cuenta, no por movimiento', () => {
    service.generar('7');
    consulta().flush(
      pagina(
        [
          reporte({ cuentaId: '10', movimientos: [movimiento(), movimiento({ movimientoId: '2' })] }),
          reporte({ cuentaId: '11', movimientos: [] }),
        ],
        { size: 2, totalElements: 5, totalPages: 3 },
      ),
    );

    expect(service.totalCuentas()).toBe(5);
    expect(service.cuentasDeLaPagina()).toBe(2);
    expect(service.bloques().map((r) => r.cuentaId)).toEqual(['10', '11']);
    // Cada bloque conserva todos los movimientos de su cuenta.
    expect(service.bloques()[0].movimientos.length).toBe(2);
    expect(service.movimientos().length).toBe(2);
    expect(service.totalPages()).toBe(3);
  });

  it('salta de página mantendo el mismo cliente y rango', () => {
    service.generar('7', '2025-01-01', '2025-01-31');
    consulta().flush(pagina([reporte()], { totalElements: 4, totalPages: 4 }));

    service.setPage(3);
    const ultima = consulta();
    expect(ultima.request.params.get('page')).toBe('3');
    expect(ultima.request.params.get('clienteId')).toBe('7');
    expect(ultima.request.params.get('inicio')).toBe('2025-01-01');
    ultima.flush(
      pagina([reporte({ cuentaId: '13' })], { page: 3, size: 10, totalElements: 4, totalPages: 4, first: false, last: true }),
    );

    expect(service.bloques().map((r) => r.cuentaId)).toEqual(['13']);
    expect(service.page()).toBe(3);
  });

  it('vuelve a la primera página de cuentas cuando se genera un reporte nuevo', () => {
    service.generar('7');
    consulta().flush(pagina([reporte()], { totalElements: 4, totalPages: 4 }));
    service.setPage(2);
    consulta().flush(pagina([reporte()], { page: 2, size: 10, totalElements: 4, totalPages: 4 }));

    service.generar('8');

    const request = consulta();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('clienteId')).toBe('8');
    request.flush(pagina([reporte({ clienteId: '8' })]));

    expect(service.page()).toBe(0);
  });

  it('no pide páginas hasta que se generó un reporte', () => {
    service.setPage(2);
    http.expectNone((req) => req.url === '/api/reportes');
  });

  it('tolera una respuesta nula o sin paginar', () => {
    service.generar('7');
    consulta().flush(null);

    expect(service.items()).toEqual([]);
    expect(service.totalPages()).toBe(0);
  });

  it('suma los movimientos de todos los bloques de la página', () => {
    service.generar('7');
    consulta().flush(
      pagina([
        reporte({
          cuentaId: '10',
          movimientos: [
            movimiento({ valor: 1000 }),
            movimiento({ movimientoId: '2', tipoMovimiento: 'RETIRO', valor: 250 }),
          ],
        }),
        reporte({
          cuentaId: '11',
          movimientos: [
            movimiento({ movimientoId: '3', valor: 500 }),
            movimiento({ movimientoId: '4', valor: 999, estado: 'REVERSED' }),
          ],
        }),
      ]),
    );

    expect(service.totalMovimientos()).toBe(4);
    // El movimiento revertido no cuenta en los totales.
    expect(service.totalDepositos()).toBe(1500);
    expect(service.totalRetiros()).toBe(250);
  });

  it('los totales por tipo son los de la página visible de cuentas', () => {
    service.generar('7');
    consulta().flush(
      pagina([reporte({ movimientos: [movimiento({ valor: 1000 })] })], {
        size: 10,
        totalElements: 30,
        totalPages: 3,
      }),
    );

    expect(service.totalCuentas()).toBe(30);
    expect(service.totalDepositos()).toBe(1000);
  });

  it('limpia el reporte para volver al estado inicial', () => {
    service.generar('7', '2025-01-01', '2025-01-31');
    consulta().flush(pagina([reporte()]));

    service.limpiar();

    expect(service.items()).toEqual([]);
    expect(service.total()).toBe(0);
    expect(service.consultado()).toBe(false);
    expect(service.clienteId()).toBe('');
    expect(service.desde()).toBe('');
    expect(service.hasta()).toBe('');
    expect(service.error()).toBeNull();
  });

  it('generarObservable devuelve la página consultada', () => {
    let resultado: Pagina<Reporte> | undefined;

    service.generarObservable('7').subscribe((pagina) => (resultado = pagina));
    consulta().flush(pagina([reporte()]));

    expect(resultado?.content.length).toBe(1);
    expect(service.items().length).toBe(1);
    expect(service.loading()).toBe(false);
  });

  it('guarda el error del backend', () => {
    service.generar('7');
    consulta().flush({ message: 'El cliente no tiene movimientos.' }, { status: 404, statusText: 'Not Found' });

    expect(service.error()).toBe('El cliente no tiene movimientos.');
  });
});