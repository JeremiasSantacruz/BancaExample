import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('antepone /api para que el proxy de desarrollo no lo intercepte como ruta', () => {
    service.get('/clientes').subscribe();

    const request = http.expectOne('/api/clientes');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('descarta los filtros vacíos y recorta los valores', () => {
    service.get('/cuentas/buscar', { clienteId: ' 7 ', tipoCuenta: '', estado: undefined }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/cuentas/buscar');
    expect(request.request.params.get('clienteId')).toBe('7');
    expect(request.request.params.has('tipoCuenta')).toBe(false);
    expect(request.request.params.has('estado')).toBe(false);
    request.flush([]);
  });

  it('acepta números y booleanos sin pasarlos como "[object Object]"', () => {
    service.get('/movimientos', { page: 2, size: 25, primeraPagina: true }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/movimientos');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.params.get('primeraPagina')).toBe('true');
    request.flush([]);
  });

  it('permite pedir todo el resultado con size=all', () => {
    service.get('/clientes', { size: 'all' }).subscribe();

    const request = http.expectOne((req) => req.url === '/api/clientes');
    expect(request.request.params.get('size')).toBe('all');
    request.flush([]);
  });

  it('hace POST con el cuerpo recibido', () => {
    const cuerpo = { nombre: 'Ana' };

    service.post('/clientes', cuerpo).subscribe();

    const request = http.expectOne('/api/clientes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(cuerpo);
    request.flush({});
  });

  it('hace PUT y DELETE contra el endpoint recibido', () => {
    service.put('/clientes/1', {}).subscribe();
    expect(http.expectOne('/api/clientes/1').request.method).toBe('PUT');

    service.delete('/clientes/1').subscribe();
    expect(http.expectOne('/api/clientes/1').request.method).toBe('DELETE');
  });

  it('propaga el mensaje de error del backend como Error', () => {
    let error: Error | undefined;

    service.get('/clientes').subscribe({ error: (err: Error) => (error = err) });

    http
      .expectOne('/api/clientes')
      .flush({ message: 'La identificación ya existe.' }, { status: 409, statusText: 'Conflict' });

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('La identificación ya existe.');
  });

  it('usa el campo detail cuando el backend no manda message', () => {
    let error: Error | undefined;

    service.get('/clientes').subscribe({ error: (err: Error) => (error = err) });

    http
      .expectOne('/api/clientes')
      .flush({ detail: 'No existe el cliente.' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('No existe el cliente.');
  });

  it('usa un mensaje por defecto cuando el backend no aporta ninguno', () => {
    let error: Error | undefined;

    service.get('/clientes').subscribe({ error: (err: Error) => (error = err) });

    http.expectOne('/api/clientes').flush(null, { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('No se pudo completar la operación.');
  });
});