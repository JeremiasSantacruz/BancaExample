import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Cliente, Pagina } from '../../../core/model';
import { RETARDO_BUSQUEDA_MS } from '../../../core/service/retardo-busqueda';
import { ClientesSection } from './clientes-section';

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

describe('ClientesSection', () => {
  let fixture: ComponentFixture<ClientesSection>;
  let http: HttpTestingController;
  let router: Router;

  const element = () => fixture.nativeElement as HTMLElement;

  const boton = (texto: string, raiz: ParentNode = element()) =>
    Array.from(raiz.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;

  const filas = () => element().querySelectorAll('tbody tr:not(:has(td.empty-state))');

  /** GET de la página de clientes (el catálogo pide `size=all`). */
  const listado = () =>
    http.expectOne(
      (req) => req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') !== 'all',
    );

  /** GET del catálogo completo. */
  const catalogo = () =>
    http.expectOne(
      (req) => req.url === '/api/clientes' && req.method === 'GET' && req.params.get('size') === 'all',
    );

  const escribir = (id: string, valor: string) => {
    const campo = element().querySelector(`#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  const completarFormulario = () => {
    escribir('cliente-nombre', 'Nuevo Cliente');
    escribir('cliente-identificacion', '50999888');
    escribir('cliente-telefono', '3415551111');
    escribir('cliente-edad', '30');
    escribir('cliente-genero', 'Masculino');
    escribir('cliente-direccion', 'Av. Siempre Viva 742');
    escribir('cliente-contrasena', 'clave123');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesSection],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesSection);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    // La tabla pide su página y las tarjetas de resumen necesitan los catálogos
    // completos, no la página actual.
    listado().flush(
      pagina([
        cliente({ clienteId: '1' }),
        cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' }),
      ]),
    );
    catalogo().flush(
      pagina([
        cliente({ clienteId: '1' }),
        cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' }),
      ]),
    );
    http
      .expectOne((req) => req.url === '/api/cuentas/buscar' && req.params.get('size') === 'all')
      .flush(pagina([]));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('muestra una tarjeta por indicador', () => {
    expect(element().querySelectorAll('article[app-summary-card]').length).toBe(3);
    expect(element().querySelector('[app-summary-card]')?.textContent).toContain('Total clientes');
    expect(element().textContent).toContain('Clientes activos');
  });

  it('lista los clientes normalizando el estado del backend', () => {
    expect(filas().length).toBe(2);
    expect(element().textContent).toContain('Ana Gómez');
    const estados = Array.from(element().querySelectorAll('tbody tr .status'));
    expect(estados.map((e) => e.textContent?.trim())).toEqual(['ACTIVO', 'BLOQUEADO']);
    expect(element().querySelectorAll('.status.status-good').length).toBe(1);
  });

  it('manda la búsqueda de la tabla al backend con retardo', async () => {
    const input = element().querySelector('app-table-toolbar input') as HTMLInputElement;
    input.value = 'luis';
    input.dispatchEvent(new Event('input'));
    await esperar();
    fixture.detectChanges();

    const request = http.expectOne(
      (req) => req.url === '/api/clientes' && req.params.has('search'),
    );
    expect(request.request.params.get('search')).toBe('luis');
    request.flush(pagina([cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' })]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    expect(element().textContent).toContain('Luis Pérez');
  });

  it('envía los filtros de la tarjeta de búsqueda al backend', async () => {
    const input = element().querySelector('app-search-filters #filter-nombre') as HTMLInputElement;
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    boton('Aplicar filtros').click();

    const request = http.expectOne((req) => req.url === '/api/clientes');
    expect(request.request.params.get('nombre')).toBe('Ana');
    request.flush(pagina([]));
    await fixture.whenStable();

    expect(filas().length).toBe(0);
  });

  it('abre el formulario de alta vacío', async () => {
    boton('Nuevo cliente').click();
    await fixture.whenStable();

    expect(element().querySelector('app-cliente-form')).not.toBeNull();
    expect(element().textContent).toContain('Nuevo cliente');
    expect((element().querySelector('#cliente-nombre') as HTMLInputElement).value).toBe('');
  });

  it('abre el formulario de edición con los datos del cliente', async () => {
    boton('Editar').click();
    await fixture.whenStable();

    expect((element().querySelector('#cliente-nombre') as HTMLInputElement).value).toBe('Ana Gómez');
    expect((element().querySelector('#cliente-identificacion') as HTMLInputElement).value).toBe(
      '30111222',
    );
  });

  it('no guarda el formulario si faltan campos obligatorios', async () => {
    boton('Nuevo cliente').click();
    await fixture.whenStable();

    boton('Crear cliente').click();
    await fixture.whenStable();

    http.expectNone((req) => req.url === '/api/clientes' && req.method === 'POST');
    expect(element().querySelector('app-cliente-form')).not.toBeNull();
  });

  it('crea el cliente y recarga la tabla', async () => {
    boton('Nuevo cliente').click();
    await fixture.whenStable();
    completarFormulario();

    boton('Crear cliente').click();

    const request = http.expectOne((req) => req.url === '/api/clientes' && req.method === 'POST');
    expect(request.request.body).toEqual(
      expect.objectContaining({
        nombre: 'Nuevo Cliente',
        identificacion: '50999888',
        edad: 30,
        estado: 'ACTIVO',
      }),
    );
    request.flush(cliente({ clienteId: '3', nombre: 'Nuevo Cliente' }));
    await fixture.whenStable();

    // El alta recarga la página y el catálogo.
    listado().flush(
      pagina([
        cliente({ clienteId: '3', nombre: 'Nuevo Cliente' }),
        cliente({ clienteId: '1' }),
        cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' }),
      ]),
    );
    catalogo().flush(pagina([cliente({ clienteId: '3', nombre: 'Nuevo Cliente' })]));
    await fixture.whenStable();

    expect(element().querySelector('app-cliente-form')).toBeNull();
    expect(filas().length).toBe(3);
    expect(element().textContent).toContain('Creaste al cliente Nuevo Cliente.');
  });

  it('actualiza el cliente editado sin crear uno nuevo', async () => {
    boton('Editar').click();
    await fixture.whenStable();
    escribir('cliente-nombre', 'Ana GómezEdited');
    boton('Guardar cambios').click();

    const request = http.expectOne('/api/clientes/1');
    expect(request.request.method).toBe('PUT');
    request.flush(cliente({ clienteId: '1', nombre: 'Ana GómezEdited' }));
    await fixture.whenStable();
    listado().flush(
      pagina([
        cliente({ clienteId: '1', nombre: 'Ana GómezEdited' }),
        cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' }),
      ]),
    );
    catalogo().flush(pagina([cliente({ clienteId: '1', nombre: 'Ana GómezEdited' })]));
    await fixture.whenStable();

    expect(element().textContent).toContain('Ana GómezEdited');
    expect(filas().length).toBe(2);
  });

  it('muestra el error del backend dentro del formulario', async () => {
    boton('Nuevo cliente').click();
    await fixture.whenStable();
    completarFormulario();
    boton('Crear cliente').click();

    http
      .expectOne('/api/clientes')
      .flush({ message: 'La identificación ya existe.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(element().querySelector('app-cliente-form')?.textContent).toContain(
      'La identificación ya existe.',
    );
  });

  it('pide confirmación antes de eliminar', async () => {
    boton('Eliminar').click();
    await fixture.whenStable();

    expect(element().querySelector('app-confirm-dialog')).not.toBeNull();
    expect(element().textContent).toContain('Sus cuentas pasan a INACTIVA');

    http.expectNone({ url: '/clientes/1', method: 'DELETE' });
  });

  it('elimina el cliente cuando se confirma', async () => {
    boton('Eliminar').click();
    await fixture.whenStable();
    boton('Eliminar cliente').click();

    const request = http.expectOne({ url: '/api/clientes/1', method: 'DELETE' });
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await fixture.whenStable();
    listado().flush(pagina([cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' })]));
    catalogo().flush(pagina([cliente({ clienteId: '2', nombre: 'Luis Pérez', estado: 'BLOQUEADO' })]));
    await fixture.whenStable();

    expect(filas().length).toBe(1);
    expect(element().textContent).toContain('Sus cuentas pasaron a INACTIVA.');
  });

  it('no borra nada si se cancela la confirmación', async () => {
    boton('Eliminar').click();
    await fixture.whenStable();
    boton('Cancelar').click();
    await fixture.whenStable();

    http.expectNone({ url: '/api/clientes/1', method: 'DELETE' });
    expect(filas().length).toBe(2);
  });

  it('navega a cuentas con el cliente filtrado al hacer clic en la fila', async () => {
    (filas()[0] as HTMLElement).click();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/cuentas'], {
      queryParams: { clienteId: '1' },
    });
  });

  it('no navega cuando el clic viene de los botones de la fila', async () => {
    boton('Editar').click();
    await fixture.whenStable();

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
