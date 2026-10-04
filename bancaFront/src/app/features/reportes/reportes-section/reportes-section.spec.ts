import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Movimiento, Pagina, Reporte } from '../../../core/model';
import { ReportesSection } from './reportes-section';

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

describe('ReportesSection', () => {
  let fixture: ComponentFixture<ReportesSection>;
  let http: HttpTestingController;

  const element = () => fixture.nativeElement as HTMLElement;

  /** Catálogo de clientes para el selector. */
  const catalogo = () =>
    http.expectOne(
      (req) => req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  const consulta = () => http.expectOne((req) => req.url === '/api/reportes' && req.method === 'GET');

  const boton = (texto: string) =>
    Array.from(element().querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as
      HTMLButtonElement;

  /** Elige un cliente del selector y genera el reporte. */
  async function generar(): Promise<void> {
    const select = element().querySelector('#reporte-cliente') as HTMLSelectElement;
    select.value = '7';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    boton('Generar reporte').click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesSection);
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    catalogo().flush(
      pagina([
        { clienteId: '7', nombre: 'Ana Gómez', identificacion: '30111222', estado: 'ACTIVO' } as never,
      ]),
    );
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('empieza sin resultados y con el rango del mes en curso', () => {
    expect(element().querySelector('.empty-state')).toBeNull();
    expect(boton('Generar reporte').disabled).toBe(true);
    expect((element().querySelector('#reporte-desde') as HTMLInputElement).value).not.toBe('');
  });

  it('no consulta si falta el cliente', () => {
    boton('Generar reporte').click();
    http.expectNone((req) => req.url === '/api/reportes');
  });

  it('avisa cuando el rango está invertido', async () => {
    const desde = element().querySelector('#reporte-desde') as HTMLInputElement;
    const hasta = element().querySelector('#reporte-hasta') as HTMLInputElement;
    desde.value = '2025-03-01';
    desde.dispatchEvent(new Event('input'));
    hasta.value = '2025-01-01';
    hasta.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element().textContent).toContain('La fecha inicial no puede ser posterior a la fecha final.');
    expect(boton('Generar reporte').disabled).toBe(true);
  });

  it('muestra un bloque por cuenta con todos sus movimientos', async () => {
    await generar();

    const request = consulta();
    expect(request.request.params.get('clienteId')).toBe('7');
    request.flush(
      pagina([
        reporte({
          cuentaId: '10',
          tipoCuenta: 'AHORRO',
          saldo: 1750,
          movimientos: [
            movimiento({ movimientoId: '1', valor: 1000 }),
            movimiento({ movimientoId: '2', tipoMovimiento: 'RETIRO', valor: 250 }),
          ],
        }),
        reporte({
          cuentaId: '11',
          tipoCuenta: 'CORRIENTE',
          saldo: 500,
          movimientos: [movimiento({ movimientoId: '3', cuentaId: '11', valor: 500 })],
        }),
      ]),
    );
    await fixture.whenStable();

    const bloques = element().querySelectorAll('.account-block');
    expect(bloques.length).toBe(2);
    expect(bloques[0].querySelector('.mono')?.textContent).toContain('10');
    expect(bloques[0].querySelector('.account-type')?.textContent).toContain('AHORRO');
    expect(bloques[1].querySelector('.mono')?.textContent).toContain('11');

    // Cada bloque conserva los movimientos de su cuenta, no solo la primera fila.
    expect(bloques[0].querySelectorAll('tbody tr').length).toBe(2);
    expect(bloques[1].querySelectorAll('tbody tr').length).toBe(1);

    expect(element().textContent).toContain('Movimientos de Ana Gómez');
  });

  it('suma depósitos y retiros de la página visible', async () => {
    await generar();

    consulta().flush(
      pagina([
        reporte({
          movimientos: [
            movimiento({ valor: 1000 }),
            movimiento({ movimientoId: '2', tipoMovimiento: 'RETIRO', valor: 250 }),
          ],
        }),
        reporte({
          cuentaId: '11',
          movimientos: [movimiento({ movimientoId: '3', valor: 500 })],
        }),
      ]),
    );
    await fixture.whenStable();

    const tarjetas = Array.from(element().querySelectorAll('article[app-summary-card]')).map((t) =>
      t.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(tarjetas.some((t) => t?.includes('Cuentas') && t.includes('2'))).toBe(true);
    expect(tarjetas.some((t) => t?.includes('Depósitos') && t.includes('1.500'))).toBe(true);
    expect(tarjetas.some((t) => t?.includes('Retiros') && t.includes('250'))).toBe(true);
    expect(tarjetas.some((t) => t?.includes('Movimientos') && t.includes('3'))).toBe(true);
  });

  it('aclara que los importes son de la página y no de todo el cliente', async () => {
    await generar();
    consulta().flush(pagina([reporte({ movimientos: [movimiento({ valor: 1000 })] })], {
      size: 10,
      totalElements: 25,
      totalPages: 3,
    }));
    await fixture.whenStable();

    expect(element().textContent).toContain('Importe de la página');
    expect(element().textContent).toContain('25 cuentas');
  });

  it('avisa cuando el cliente no tiene movimientos en el rango', async () => {
    await generar();
    consulta().flush(pagina([], { totalElements: 0, totalPages: 0 }));
    await fixture.whenStable();

    expect(element().textContent).toContain('No hay movimientos para Ana Gómez');
  });

  it('cambia de página de cuentas sin perder cliente ni rango', async () => {
    await generar();
    consulta().flush(pagina([reporte()], { totalElements: 25, totalPages: 3 }));
    await fixture.whenStable();
    fixture.detectChanges();

    const paginas = Array.from(
      element().querySelectorAll<HTMLButtonElement>('app-pagination nav button'),
    );
    paginas[paginas.length - 1].click();
    await fixture.whenStable();

    const request = consulta();
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('clienteId')).toBe('7');
    request.flush(
      pagina([reporte({ cuentaId: '11' })], { page: 1, size: 10, totalElements: 25, totalPages: 3 }),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element().querySelectorAll('.account-block').length).toBe(1);
    expect(element().querySelector('.account-block .mono')?.textContent).toContain('11');
  });

  it('limpiar vuelve al estado inicial', async () => {
    await generar();
    consulta().flush(pagina([reporte()]));

    boton('Limpiar').click();
    await fixture.whenStable();

    expect(element().querySelector('.account-block')).toBeNull();
    expect((element().querySelector('#reporte-cliente') as HTMLSelectElement).value).toBe('');
  });
});