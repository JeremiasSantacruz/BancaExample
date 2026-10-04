import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Cliente, Pagina } from '../model';
import { RETARDO_BUSQUEDA_MS } from './retardo-busqueda';
import { ClienteService } from './cliente-service';

/**
 * El backend responde `estado` en minúsculas (`ClienteController` aplica
 * `toLowerCase`), así que el servicio tiene que normalizarlo.
 */
function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    clienteId: '1',
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

/** Espera lo suficiente para que el retardo de la búsqueda se dispare. */
function esperar(RETARDO = RETARDO_BUSQUEDA_MS + 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETARDO));
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

describe('ClienteService', () => {
  let service: ClienteService;
  let http: HttpTestingController;

  /** GET de la página de la tabla (el catálogo pide `size=all`). */
  const listado = () =>
    http.expectOne(
      (req) => req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') !== 'all',
    );

  /** GET del catálogo completo. */
  const catalogo = () =>
    http.expectOne(
      (req) => req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClienteService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ClienteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide la primera página y normaliza los estados en minúsculas', () => {
    service.cargarClientes();
    expect(service.loading()).toBe(true);

    const request = listado();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      pagina([
        cliente({ clienteId: '1', estado: 'activo' as Cliente['estado'] }),
        cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'bloqueado' as Cliente['estado'] }),
      ]),
    );

    expect(service.loading()).toBe(false);
    expect(service.total()).toBe(2);
    expect(service.items().length).toBe(2);
    expect(service.visibleClientes()[0].estado).toBe('ACTIVO');
    expect(service.visibleClientes()[1].estado).toBe('BLOQUEADO');
  });

  it('expone la página, el rango visible y el total de páginas', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente({ clienteId: '11' }), cliente({ clienteId: '12' })], {
      page: 1,
      size: 10,
      totalElements: 12,
      totalPages: 2,
      first: false,
      last: true,
    }));

    expect(service.page()).toBe(1);
    expect(service.size()).toBe(10);
    expect(service.totalPages()).toBe(2);
    expect(service.total()).toBe(12);
    expect(service.hasPrevious()).toBe(true);
    expect(service.hasNext()).toBe(false);
    expect(service.visibleRange()).toEqual({ desde: 11, hasta: 12 });
  });

  it('vuelve a pedir la página pedida y vuelve a la primera al cambiar el tamaño', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente()], { totalElements: 25, totalPages: 3 }));

    service.setPage(2);
    const tercera = listado();
    expect(tercera.request.params.get('page')).toBe('2');
    tercera.flush(pagina([cliente()], { page: 2, size: 10, totalElements: 25, totalPages: 3 }));

    service.setSize(25);
    const primera = listado();
    expect(primera.request.params.get('page')).toBe('0');
    expect(primera.request.params.get('size')).toBe('25');
    primera.flush(pagina([], { size: 25, totalElements: 25, totalPages: 1 }));

    expect(service.size()).toBe(25);
  });

  it('ignora un salto a la misma página', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente()]));

    service.setPage(0);
    service.setPage(-1);

    http.expectNone((req) => req.url === '/api/clientes');
  });

  it('envía los filtros al backend', () => {
    service.cargarClientes({ nombre: 'Ana', estado: 'ACTIVO' });

    const request = listado();
    expect(request.request.params.get('nombre')).toBe('Ana');
    expect(request.request.params.get('estado')).toBe('ACTIVO');
    request.flush(pagina([]));

    expect(service.filters()).toEqual({ nombre: 'Ana', estado: 'ACTIVO' });
  });

  it('manda la búsqueda al backend con retardo y vuelve a la primera página', async () => {
    service.cargarClientes();
    listado().flush(pagina([cliente({ clienteId: '1' })], { totalElements: 30, totalPages: 3 }));
    service.setPage(2);
    listado().flush(pagina([cliente()], { page: 2, size: 10, totalElements: 30, totalPages: 3 }));

    service.setSearchTerm('lu');
    service.setSearchTerm('luis');

    // Todavía no se pide nada: se espera a que el usuario termine de escribir.
    await esperar(RETARDO_BUSQUEDA_MS / 2);
    http.expectNone((req) => req.url === '/api/clientes');

    await esperar();
    const request = http.expectOne((req) => req.url === '/api/clientes');
    expect(request.request.params.get('search')).toBe('luis');
    // Solo se dispara una vez por término, y desde la primera página.
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pagina([cliente({ clienteId: '2', nombre: 'Luis Pérez' })]));

    expect(service.searchTerm()).toBe('luis');
    expect(service.visibleClientes().map((c) => c.clienteId)).toEqual(['2']);
  });

  it('limpiar filtros vuelve a pedir la primera página sin filtros', () => {
    service.cargarClientes({ nombre: 'Ana', estado: 'ACTIVO' });
    listado().flush(pagina([]));

    service.limpiarFiltros();

    const request = http.expectOne((req) => req.url === '/api/clientes');
    expect(request.request.params.has('nombre')).toBe(false);
    expect(request.request.params.has('estado')).toBe(false);
    // La búsqueda vacía ni se envía: el backend la trata como "sin búsqueda".
    expect(request.request.params.has('search')).toBe(false);
    request.flush(pagina([cliente()]));

    expect(service.filters()).toEqual({});
    expect(service.searchTerm()).toBe('');
  });

  it('trae el catálogo completo con size=all para los selectores y los nombres', () => {
    service.cargarCatalogo();

    const request = catalogo();
    request.flush(
      pagina(
        [
          cliente({ clienteId: '7', nombre: 'Ana Gómez', estado: 'activo' as Cliente['estado'] }),
          cliente({ clienteId: '8', nombre: 'Luis Pérez', estado: 'inactivo' as Cliente['estado'] }),
        ],
        { size: 2, totalElements: 2 },
      ),
    );

    expect(service.catalogoCargado()).toBe(true);
    expect(service.totalCatalogo()).toBe(2);
    expect(service.nombreDe('7')).toBe('Ana Gómez');
    expect(service.nombreDe('99')).toBe('Cliente 99');
    expect(service.activeClientesCount()).toBe(1);
    expect(service.blockedClientesCount()).toBe(0);
    expect(service.clientesOperativos().map((c) => c.clienteId)).toEqual(['7']);
    // El catálogo no toca la página de la tabla.
    expect(service.items()).toEqual([]);
  });

  it('no vuelve a pedir el catálogo si ya se cargó', () => {
    service.ensureCatalogo();
    catalogo().flush(pagina([], { size: 0 }));

    service.ensureCatalogo();
    http.expectNone((req) => req.url === '/api/clientes');
  });

  it('no vuelve a pedir el listado si ya se cargó', () => {
    service.ensureLoaded();
    http.expectOne((req) => req.url === '/api/clientes').flush(pagina([]));

    service.ensureLoaded();
    http.expectNone((req) => req.url === '/api/clientes');
  });

  it('crea el cliente y recarga la página y el catálogo', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente({ clienteId: '1' })]));
    service.cargarCatalogo();
    catalogo().flush(pagina([cliente({ clienteId: '1' })]));

    const { clienteId, ...dto } = cliente({ clienteId: '9' });
    service.crearCliente(dto).subscribe();

    const post = http.expectOne((req) => req.url === '/api/clientes' && req.method === 'POST');
    post.flush(cliente({ clienteId: '9' }));

    // El alta puede caer fuera de la página actual, así que se recarga todo.
    listado().flush(pagina([cliente({ clienteId: '9' })]));
    catalogo().flush(pagina([cliente({ clienteId: '9' })]));

    expect(service.visibleClientes().map((c) => c.clienteId)).toEqual(['9']);
  });

  it('reemplaza el cliente actualizado', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente({ clienteId: '1', nombre: 'Nombre viejo' })]));

    const { clienteId, ...dto } = cliente({ clienteId: '1', nombre: 'Nombre nuevo' });
    service.actualizarCliente(clienteId, dto).subscribe();

    http.expectOne('/api/clientes/1').flush(cliente({ clienteId: '1', nombre: 'Nombre nuevo' }));
    listado().flush(pagina([cliente({ clienteId: '1', nombre: 'Nombre nuevo' })]));

    expect(service.visibleClientes()[0].nombre).toBe('Nombre nuevo');
  });

  it('elimina el cliente y recarga el listado porque el backend borra lógicamente', () => {
    service.cargarClientes();
    listado().flush(pagina([cliente({ clienteId: '1' }), cliente({ clienteId: '2', nombre: 'Luis' })]));

    service.eliminarCliente('1').subscribe();

    const request = http.expectOne('/api/clientes/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    listado().flush(pagina([cliente({ clienteId: '2', nombre: 'Luis' })]));

    expect(service.visibleClientes().map((c) => c.clienteId)).toEqual(['2']);
  });

  it('obtiene un cliente suelto por id', () => {
    service.obtenerCliente('5').subscribe();
    http.expectOne('/api/clientes/5').flush(cliente({ clienteId: '5', estado: 'activo' as Cliente['estado'] }));
  });

  it('guarda el mensaje de error que devuelve el backend', () => {
    service.cargarClientes();
    listado().flush({ message: 'No se pudo leer el listado.' }, { status: 500, statusText: 'Error' });

    expect(service.error()).toBe('No se pudo leer el listado.');
    expect(service.loading()).toBe(false);
  });

  it('trata una lista sin paginar como página vacía', () => {
    service.cargarClientes();
    listado().flush([] as unknown as Pagina<Cliente>);

    expect(service.items()).toEqual([]);
    expect(service.total()).toBe(0);
    expect(service.totalPages()).toBe(0);
  });
});