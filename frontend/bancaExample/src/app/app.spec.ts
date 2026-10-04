import {Reporte} from './core/models/reporte.model';
import {NgForm} from '@angular/forms';
import {vi} from 'vitest';
import {Subject} from 'rxjs';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Cliente} from './core/models/cliente.model';
import {Cuenta} from './core/models/cuenta.model';
import {Movimiento} from './core/models/movimiento.model';
import {ClienteService} from './core/services/cliente.service';
import {ReporteService} from './core/services/reporte.service';
import {CuentaService} from './core/services/cuenta.service';
import {MovimientoService} from './core/services/movimiento.service';

describe('App (Componente Principal)', () => {
  let component: App;
  let fixture: any;
  let httpMock: HttpTestingController;
  const dialogPrototype = HTMLDialogElement.prototype;
  const originalShowModal = Object.getOwnPropertyDescriptor(dialogPrototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, 'close');

  // jsdom does not implement native dialog opening, closing or autofocus.
  beforeAll(() => {
    Object.defineProperty(dialogPrototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
        this.querySelector<HTMLButtonElement>('[autofocus]')?.focus();
      },
    });
    Object.defineProperty(dialogPrototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
  });

  afterAll(() => {
    if (originalShowModal) Object.defineProperty(dialogPrototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(dialogPrototype, 'showModal');
    if (originalClose) Object.defineProperty(dialogPrototype, 'close', originalClose);
    else Reflect.deleteProperty(dialogPrototype, 'close');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('mantiene independientes los resultados de movimientos y reportes', () => {
    const movimiento: Movimiento = {
      movimientoId: '1', cuentaId: '42', fecha: '2026-10-03T12:00:00',
      tipoMovimiento: 'DEPOSITO', valor: 100, estado: 'APPROVED'
    };
    component.updateReportClient('7');
    component.buscarReporte();
    httpMock.expectOne(req => req.url === '/reportes').flush([
      {clienteId: '7', cuentaId: '42', tipoCuenta: 'AHORRO', estado: 'ACTIVA', saldo: 100, movimientos: [movimiento]},
      {clienteId: '7', cuentaId: '43', tipoCuenta: 'CORRIENTE', estado: 'ACTIVA', saldo: 0, movimientos: []},
    ]);
    component.buscarMovimientos({cuentaId: '99'});
    httpMock.expectOne(req => req.url === '/movimientos/buscar').flush([{
      ...movimiento,
      movimientoId: '2',
      cuentaId: '99'
    }]);
    expect(component.filteredMovimientos.map(m => m.cuentaId)).toEqual(['99']);
    expect(component.reportCuentas.map(c => c.cuentaId)).toEqual(['42', '43']);
    expect(component.reportMovimientos).toEqual([movimiento]);
    component.ngOnInit();
    httpMock.expectOne('/clientes').flush([]);
    httpMock.expectOne('/movimientos').flush([]);
    httpMock.expectOne(req => req.url === '/movimientos/buscar').flush([]);
    expect(component.reportConsulted).toBe(true);
    expect(component.reportMovimientos).toEqual([movimiento]);
    component.updateReportClient('8');
    expect(component.reportCuentas).toEqual([]);
    expect(component.filteredMovimientos).toEqual([]);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      expect(component).toBeTruthy();
    });

    it('debe inicializar con la sección de clientes activa', () => {
      expect(component.activeSection).toBe('clientes');
    });

    it('debe tener rutas de navegación configuradas', () => {
      expect(component.navigation.length).toBe(4);
      expect(component.navigation[0].id).toBe('clientes');
      expect(component.navigation[1].id).toBe('cuentas');
      expect(component.navigation[2].id).toBe('movimientos');
      expect(component.navigation[3].id).toBe('reportes');
    });

    it('debe inicializar estados vacíos', () => {
      expect(component.clientes).toEqual([]);
      expect(component.cuentas).toEqual([]);
      expect(component.movimientos).toEqual([]);
    });
  });

  describe('ngOnInit', () => {
    it('debe cargar clientes y movimientos al iniciar', () => {
      component.ngOnInit();

      const clientesReq = httpMock.expectOne('/clientes');
      const movimientosReq = httpMock.expectOne('/movimientos');

      expect(clientesReq.request.method).toBe('GET');
      expect(movimientosReq.request.method).toBe('GET');

      clientesReq.flush([]);
      movimientosReq.flush([]);
    });
  });

  describe('Getters - Estadísticas', () => {
    beforeEach(() => {
      const clientesMock: Cliente[] = [
        {
          clienteId: 'C001',
          nombre: 'Juan',
          identificacion: '1',
          direccion: 'Dir',
          telefono: 'Tel',
          genero: 'M',
          edad: 30,
          estado: 'ACTIVO',
          contrasena: 'pass',
        },
        {
          clienteId: 'C002',
          nombre: 'María',
          identificacion: '2',
          direccion: 'Dir',
          telefono: 'Tel',
          genero: 'F',
          edad: 25,
          estado: 'BLOQUEADO',
          contrasena: 'pass',
        },
      ];

      component.clientes = clientesMock;
    });

    it('debe contar clientes activos correctamente', () => {
      expect(component.activeClientes).toBe(1);
    });

    it('debe calcular el título de sección correctamente', () => {
      expect(component.sectionTitle).toBe('Clientes');
      component.activeSection = 'cuentas';
      expect(component.sectionTitle).toBe('Cuentas');
    });
  });

  describe('Búsqueda y Filtrado', () => {
    beforeEach(() => {
      component.clientes = [
        {
          clienteId: 'C001',
          nombre: 'Juan Pérez',
          identificacion: '12345678',
          direccion: 'Calle 1',
          telefono: '1234567890',
          genero: 'M',
          edad: 30,
          estado: 'ACTIVO',
          contrasena: 'pass',
        },
        {
          clienteId: 'C002',
          nombre: 'María García',
          identificacion: '87654321',
          direccion: 'Calle 2',
          telefono: '0987654321',
          genero: 'F',
          edad: 25,
          estado: 'ACTIVO',
          contrasena: 'pass',
        },
      ];
    });

    it('debe filtrar clientes por nombre', () => {
      component.searchTerm = 'juan';
      expect(component.filteredClientes.length).toBe(1);
      expect(component.filteredClientes[0].nombre).toBe('Juan Pérez');
    });

    it('debe retornar todos los clientes cuando el término es vacío', () => {
      component.searchTerm = '';
      expect(component.filteredClientes.length).toBe(2);
    });

    it('debe retornar array vacío cuando no hay coincidencias', () => {
      component.searchTerm = 'INEXISTENTE';
      expect(component.filteredClientes.length).toBe(0);
    });
  });

  describe('Navegación', () => {
    it('debe cambiar la sección activa', () => {
      component.selectSection('cuentas');
      expect(component.activeSection).toBe('cuentas');
    });

    it('debe limpiar el término de búsqueda al cambiar sección', () => {
      component.searchTerm = 'test';
      component.selectSection('movimientos');
      expect(component.searchTerm).toBe('');
    });

    it('debe limpiar mensajes de error al cambiar sección', () => {
      component.errorMessage = 'Error de prueba';
      component.selectSection('reportes');
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Gestión de Formularios', () => {
    it('debe abrir el formulario para crear nuevos registros', () => {
      component.openCreateForm();
      expect(component.formOpen).toBe(true);
      expect(component.editingCliente).toBeNull();
    });

    it('debe cerrar el formulario', () => {
      component.formOpen = true;
      component.closeForm();
      expect(component.formOpen).toBe(false);
    });

    it('debe cargar datos del cliente para edición', () => {
      const cliente: Cliente = {
        clienteId: 'C001',
        nombre: 'Juan',
        identificacion: '1',
        direccion: 'Dir',
        telefono: 'Tel',
        genero: 'M',
        edad: 30,
        estado: 'ACTIVO',
        contrasena: 'pass',
      };

      component.editCliente(cliente);
      expect(component.formOpen).toBe(true);
      expect(component.editingCliente).toEqual(cliente);
    });
  });

  describe('Formateo de Datos', () => {
    it('debe formatear moneda correctamente', () => {
      const formateado = component.formatCurrency(1000);
      expect(formateado).toContain('$');
    });

    it('debe formatear fecha correctamente', () => {
      const fecha = '2024-01-15T10:30:00';
      const formateada = component.formatDate(fecha);
      expect(formateada).toContain('15');
    });

    it('debe obtener el nombre del cliente', () => {
      component.clientes = [
        {
          clienteId: 'C001',
          nombre: 'Juan',
          identificacion: '1',
          direccion: 'Dir',
          telefono: 'Tel',
          genero: 'M',
          edad: 30,
          estado: 'ACTIVO',
          contrasena: 'pass',
        },
      ];

      const nombre = component.customerName('C001');
      expect(nombre).toBe('Juan');
    });

    it('debe retornar nombre por defecto para cliente no existente', () => {
      component.clientes = [];
      const nombre = component.customerName('INEXISTENTE');
      expect(nombre).toBe('Cliente INEXISTENTE');
    });
  });

  describe('Estados', () => {
    it('debe tener estados de cliente disponibles', () => {
      const estados = component.clienteEstados;
      expect(estados).toContain('ACTIVO');
      expect(estados).toContain('BLOQUEADO');
    });

    it('debe tener estados de cuenta disponibles', () => {
      const estados = component.cuentaEstados;
      expect(estados).toContain('ACTIVA');
      expect(estados).toContain('BLOQUEADA');
    });
  });

  describe('Descarga de Reportes', () => {
    it('debe ejecutar la función de descarga de reporte', () => {
      expect(() => component.downloadReport()).not.toThrow();
    });
  });

  describe('Duplicate operation protection', () => {
    for (const [method, endpoint] of [
      ['saveCliente', '/clientes'],
      ['saveCuenta', '/cuentas'],
      ['saveMovimiento', '/movimientos'],
    ] as const) {
      it(method + ' sends one request and allows retry after an error', () => {
        const form = {invalid: false} as NgForm;
        component.openCreateForm();
        component[method](form);
        component[method](form);
        const request = httpMock.expectOne(endpoint);
        expect(component.busy).toBe(true);
        request.flush({message: 'Try again'}, {status: 400, statusText: 'Bad Request'});
        expect(component.busy).toBe(false);
        expect(component.errorMessage).toBe('Try again');
        component[method](form);
        httpMock
          .expectOne(endpoint)
          .flush({message: 'Try again'}, {status: 400, statusText: 'Bad Request'});
        expect(component.busy).toBe(false);
      });
    }

    it('does not open another confirmation or repeat a pending deletion', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      try {
        const cliente = {clienteId: 'C1', nombre: 'Juan'} as Cliente;
        component.deleteCliente(cliente);
        component.deleteCliente(cliente);
        expect(confirm).toHaveBeenCalledTimes(1);
        httpMock.expectOne('/clientes/C1').flush(null);
        httpMock.expectOne('/clientes').flush([]);
        expect(component.busy).toBe(false);
        expect(component.successMessage).toBe('Cliente eliminado.');
      } finally {
        confirm.mockRestore();
      }
    });

    it('preserves a repeated visible error and replaces it with success', () => {
      component.errorMessage = 'Connection failed';
      const original = component.notificationService.current();
      component.errorMessage = 'Connection failed';
      expect(component.notificationService.current()).toBe(original);
      component.successMessage = 'Saved';
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('Saved');
    });
  });

  describe('Renderizado', () => {
    const clienteNavegable: Cliente = {
      clienteId: '7',
      nombre: 'Ana',
      identificacion: '123',
      direccion: 'Calle 1',
      telefono: '456',
      edad: 30,
      genero: 'F',
      contrasena: 'clave',
      estado: 'ACTIVO',
    };
    const cuentaNavegable: Cuenta = {
      cuentaId: '42',
      clienteId: '7',
      tipoCuenta: 'AHORRO',
      estado: 'ACTIVA',
      saldoInicial: 100,
    };

    function mostrarDatosNavegables(): void {
      component.clientes = [clienteNavegable];
      component.cuentas = [cuentaNavegable];
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    }

    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne('/clientes').flush([]);
      httpMock.expectOne('/movimientos').flush([]);
      fixture.detectChanges();
    });

    it('actualiza la tabla al llegar el primer resultado sin esperar al cierre de la busqueda', async () => {
      const response = new Subject<Cliente[]>();
      const search = vi
        .spyOn(TestBed.inject(ClienteService), 'buscarEnServidor')
        .mockReturnValue(response);
      try {
        const form = fixture.nativeElement.querySelector('.search-filters');
        const input = form.querySelector('[name="nombre"]');
        input.value = 'Ana';
        input.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
        await fixture.whenStable();
        response.next([clienteNavegable]);
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Ana');
        expect(component.searchingClientes).toBe(true);
        expect(search).toHaveBeenCalledTimes(1);
      } finally {
        response.complete();
        search.mockRestore();
      }
    });

    for (const section of ['cuentas', 'movimientos', 'reportes'] as const) {
      it(`actualiza ${section} con la primera respuesta y permite resultados vacios`, async () => {
        const cuentas = new Subject<Cuenta[]>();
        const movimientos = new Subject<Movimiento[]>();
        const reportes = new Subject<Reporte[]>();
        const search =
          section === 'cuentas'
            ? vi.spyOn(TestBed.inject(CuentaService), 'buscarEnServidor').mockReturnValue(cuentas)
            : section === 'reportes'
              ? vi.spyOn(TestBed.inject(ReporteService), 'obtener').mockReturnValue(reportes)
              : vi
                .spyOn(TestBed.inject(MovimientoService), 'buscarEnServidor')
                .mockReturnValue(movimientos);
        try {
          const index = {cuentas: 1, movimientos: 2, reportes: 3}[section];
          fixture.nativeElement.querySelectorAll('.nav-item')[index].click();
          await fixture.whenStable();
          if (section === 'reportes') {
            component.clientes = [clienteNavegable];
            component.updateReportClient('7');
            await fixture.whenStable();
            fixture.nativeElement.querySelector('.report-search button').click();
          } else {
            fixture.nativeElement
              .querySelector('.search-filters')
              .dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
          }
          await fixture.whenStable();
          if (section === 'cuentas') cuentas.next([cuentaNavegable]);
          else if (section === 'reportes') {
            reportes.next([{
              clienteId: '7',
              cuentaId: '42',
              tipoCuenta: 'AHORRO',
              estado: 'ACTIVA',
              saldo: 100,
              movimientos: []
            }]);
          } else
            movimientos.next([
              {
                movimientoId: '1',
                cuentaId: '42',
                fecha: '2026-10-03T12:00:00',
                tipoMovimiento: 'DEPOSITO',
                valor: 100,
                estado: 'APPROVED',
              },
            ]);
          await fixture.whenStable();
          expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('42');
          expect(search).toHaveBeenCalledTimes(1);
          if (section === 'cuentas') cuentas.next([]);
          else if (section === 'reportes') reportes.next([]);
          else movimientos.next([]);
          await fixture.whenStable();
          expect(fixture.nativeElement.querySelector('tbody .empty-state')).toBeTruthy();
        } finally {
          cuentas.complete();
          movimientos.complete();
          reportes.complete();
          search.mockRestore();
        }
      });
    }

    for (const section of ['clientes', 'cuentas', 'movimientos'] as const) {
      for (const editing of section === 'movimientos' ? [false] : [false, true]) {
        it(`muestra el resultado al ${editing ? 'modificar' : 'crear'} ${section}`, async () => {
          component.selectSection(section);
          component.openCreateForm();
          const movimiento: Movimiento = {
            movimientoId: '1',
            cuentaId: '42',
            fecha: '2026-10-03T12:00:00',
            tipoMovimiento: 'DEPOSITO',
            valor: 100,
            estado: 'APPROVED',
          };
          if (editing) {
            if (section === 'clientes') component.editCliente(clienteNavegable);
            if (section === 'cuentas') component.editCuenta(cuentaNavegable);
            if (section === 'movimientos') component.editMovimiento(movimiento);
          }
          const form = {invalid: false} as NgForm;
          if (section === 'clientes') component.saveCliente(form);
          if (section === 'cuentas') component.saveCuenta(form);
          if (section === 'movimientos') component.saveMovimiento(form);
          expect(component.saveResult()).toBeNull();
          const endpoint = editing
            ? section === 'clientes'
              ? '/clientes/7'
              : section === 'cuentas'
                ? '/cuentas/7/42'
                : '/movimientos/1'
            : '/' + section;
          const request = httpMock.expectOne(endpoint);
          expect(request.request.method).toBe(editing ? 'PUT' : 'POST');
          request.flush({});
          if (section === 'clientes') httpMock.expectOne('/clientes').flush([]);
          if (section === 'movimientos') httpMock.expectOne('/movimientos').flush([]);
          await fixture.whenStable();
          const dialog = fixture.nativeElement.querySelector('app-operation-result dialog');
          expect(dialog.open).toBe(true);
          expect(dialog.querySelector('h2').textContent).toContain('Registro guardado');
          expect(component.formOpen).toBe(false);
          expect(fixture.nativeElement.querySelectorAll('app-operation-result').length).toBe(1);
          expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
          dialog.querySelector('button').click();
          await fixture.whenStable();
          expect(fixture.nativeElement.querySelector('app-operation-result')).toBeNull();
          expect(component.successMessage).toBe('');
          expect(document.activeElement).toBe(
            fixture.nativeElement.querySelector('.page-heading button'),
          );
        });
      }
    }

    it('muestra el error de guardado y conserva los datos para reintentar', async () => {
      fixture.nativeElement.querySelector('.page-heading button').click();
      component.clienteForm.nombre = 'Ana';
      component.saveCliente({invalid: false} as NgForm);
      httpMock.expectOne('/clientes').flush(
        {message: 'Identificacion duplicada'},
        {
          status: 409,
          statusText: 'Conflict',
        },
      );
      await fixture.whenStable();
      const dialog = fixture.nativeElement.querySelector('app-operation-result dialog');
      expect(dialog.textContent).toContain('No se pudo guardar');
      expect(dialog.textContent).toContain('Identificacion duplicada');
      expect(component.formOpen).toBe(true);
      expect(component.clienteForm.nombre).toBe('Ana');
      expect(component.busy).toBe(false);
      dialog.dispatchEvent(new Event('cancel', {cancelable: true}));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('app-operation-result')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-record-form')).toBeTruthy();
      component.saveCliente({invalid: false} as NgForm);
      httpMock.expectOne('/clientes').flush({});
      httpMock.expectOne('/clientes').flush([]);
      await fixture.whenStable();
      expect(component.saveResult()?.kind).toBe('success');
    });

    it('limpia filtros y resultados incluso al seleccionar la misma seccion del menu', async () => {
      mostrarDatosNavegables();
      component.buscarClientes({nombre: 'Otro', identificacion: '999', estado: 'CERRADO'});
      httpMock.expectOne((req) => req.url === '/clientes/buscar').flush([]);
      await fixture.whenStable();
      expect(component.filteredClientes).toEqual([]);
      fixture.nativeElement.querySelectorAll('.nav-item')[0].click();
      await fixture.whenStable();
      expect(component.clienteFilters).toEqual({});
      expect(component.filteredClientes).toEqual([clienteNavegable]);
      const filters = fixture.nativeElement.querySelector('.search-filters');
      expect(filters.querySelector('[name="nombre"]').value).toBe('');
      expect(filters.querySelector('[name="identificacion"]').value).toBe('');
      expect(filters.querySelector('[name="estado"]').value).toBe('');
    });

    it('el menu vuelve a mostrar todas las cuentas despues de navegar desde un cliente', async () => {
      mostrarDatosNavegables();
      const otraCuenta: Cuenta = {...cuentaNavegable, cuentaId: '43', clienteId: '8'};
      component.cuentas = [cuentaNavegable, otraCuenta];
      fixture.nativeElement.querySelector('.person-cell').click();
      httpMock.expectOne((req) => req.url === '/cuentas/buscar').flush([cuentaNavegable]);
      await fixture.whenStable();
      expect(component.filteredCuentas).toEqual([cuentaNavegable]);
      fixture.nativeElement.querySelectorAll('.nav-item')[1].click();
      await fixture.whenStable();
      expect(component.cuentaFilters).toEqual({});
      expect(component.accountClientFilter).toBe('');
      expect(component.filteredCuentas).toEqual([cuentaNavegable, otraCuenta]);
      expect(fixture.nativeElement.querySelector('.search-filters [name="clienteId"]').value).toBe(
        '',
      );
    });

    it('cancela las busquedas pendientes para que no repongan filtros al usar el menu', async () => {
      mostrarDatosNavegables();
      component.buscarClientes({nombre: 'Ana'});
      const clientes = httpMock.expectOne((req) => req.url === '/clientes/buscar');
      component.buscarCuentas({clienteId: '7', tipoCuenta: 'AHORRO', estado: 'ACTIVA'});
      const cuentas = httpMock.expectOne((req) => req.url === '/cuentas/buscar');
      component.buscarMovimientos({cuentaId: '42'});
      const movimientos = httpMock.expectOne((req) => req.url === '/movimientos/buscar');
      component.updateReportDate('reportFrom', '2026-10-01');
      component.updateReportDate('reportTo', '2026-10-03');
      component.updateReportClient('7');
      component.buscarReporte();
      const reporte = httpMock.expectOne((req) => req.url === '/reportes');
      component.searchTerm = 'Ana';
      component.accountClientFilter = '7';
      fixture.nativeElement.querySelectorAll('.nav-item')[3].click();
      await fixture.whenStable();
      expect([clientes, cuentas, movimientos, reporte].every((request) => request.cancelled)).toBe(
        true,
      );
      expect(component.clienteFilters).toEqual({});
      expect(component.cuentaFilters).toEqual({});
      expect(component.movimientoFilters).toEqual({});
      expect(component.searchTerm).toBe('');
      expect(component.accountClientFilter).toBe('');
      expect(component.reportFrom).toBe('');
      expect(component.reportTo).toBe('');
      expect(component.reportClientId).toBe('');
      expect(
        component.searchingClientes ||
        component.searchingCuentas ||
        component.searchingMovimientos ||
        component.searchingReport,
      ).toBe(false);
      expect(
        [...fixture.nativeElement.querySelectorAll('app-reportes-section input')].every(
          (input: any) => input.value === '',
        ),
      ).toBe(true);
    });

    it('navega de cliente a cuentas y de cuenta a movimientos con los filtros APPROVEDs', async () => {
      mostrarDatosNavegables();
      component.cuentaFilters = {clienteId: '99', tipoCuenta: 'CORRIENTE', estado: 'CERRADA'};
      component.accountClientFilter = '99';
      fixture.nativeElement.querySelector('.person-cell').click();
      expect(component.activeSection).toBe('cuentas');
      expect(component.accountClientFilter).toBe('');
      const cuentas = httpMock.expectOne((req) => req.url === '/cuentas/buscar');
      expect(cuentas.request.params.get('clienteId')).toBe('7');
      expect(cuentas.request.params.get('tipoCuenta')).toBeNull();
      expect(cuentas.request.params.get('estado')).toBeNull();
      cuentas.flush([cuentaNavegable]);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.search-filters [name="clienteId"]').value).toBe(
        '7',
      );
      expect(fixture.nativeElement.querySelector('.search-filters [name="tipoCuenta"]').value).toBe(
        '',
      );
      expect(fixture.nativeElement.querySelector('.search-filters [name="estado"]').value).toBe('');

      component.movimientoFilters = {cuentaId: '99'};
      fixture.nativeElement.querySelector('.record-link').click();
      expect(component.activeSection).toBe('movimientos');
      const movimientos = httpMock.expectOne((req) => req.url === '/movimientos/buscar');
      expect(movimientos.request.params.get('cuentaId')).toBe('42');
      movimientos.flush([
        {
          movimientoId: '1',
          cuentaId: '42',
          fecha: '2026-10-03T12:00:00',
          tipoMovimiento: 'DEPOSITO',
          valor: 100,
          estado: 'APPROVED',
        },
      ]);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.search-filters [name="cuentaId"]').value).toBe(
        '42',
      );
      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('42');
    });

    it('mantiene las acciones de las filas separadas de la navegacion', () => {
      mostrarDatosNavegables();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      try {
        fixture.nativeElement.querySelector('.text-action:not(.danger-action)').click();
        expect(component.editingCliente).toEqual(clienteNavegable);
        expect(component.activeSection).toBe('clientes');
        component.closeForm();
        fixture.nativeElement.querySelector('.danger-action').click();
        expect(component.activeSection).toBe('clientes');
        httpMock.expectNone((req) => req.url === '/cuentas/buscar');

        component.selectSection('cuentas');
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.text-action:not(.danger-action)').click();
        expect(component.editingCuenta).toEqual(cuentaNavegable);
        expect(component.activeSection).toBe('cuentas');
        component.closeForm();
        fixture.nativeElement.querySelector('.danger-action').click();
        expect(component.activeSection).toBe('cuentas');
        httpMock.expectNone((req) => req.url === '/movimientos/buscar');
      } finally {
        confirm.mockRestore();
      }
    });

    it('reemplaza una busqueda pendiente al navegar a otro cliente o cuenta', () => {
      mostrarDatosNavegables();
      component.buscarCuentas({clienteId: '99'});
      const cuentasAnteriores = httpMock.expectOne((req) => req.url === '/cuentas/buscar');
      component.verCuentasCliente(clienteNavegable);
      expect(cuentasAnteriores.cancelled).toBe(true);
      const cuentas = httpMock.expectOne((req) => req.url === '/cuentas/buscar');
      expect(cuentas.request.params.get('clienteId')).toBe('7');
      expect(component.filteredCuentas).toEqual([]);
      cuentas.flush([cuentaNavegable]);

      component.buscarMovimientos({cuentaId: '99'});
      const movimientosAnteriores = httpMock.expectOne((req) => req.url === '/movimientos/buscar');
      component.verMovimientosCuenta(cuentaNavegable);
      expect(movimientosAnteriores.cancelled).toBe(true);
      const movimientos = httpMock.expectOne((req) => req.url === '/movimientos/buscar');
      expect(movimientos.request.params.get('cuentaId')).toBe('42');
      expect(component.filteredMovimientos).toEqual([]);
      movimientos.flush([]);
    });

    it('bloquea la navegacion entre registros durante una escritura pendiente', async () => {
      mostrarDatosNavegables();
      component.busy = true;
      fixture.nativeElement.querySelector('tbody tr').click();
      component.verCuentasCliente(clienteNavegable);
      component.verMovimientosCuenta(cuentaNavegable);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.record-link').disabled).toBe(true);
      expect(component.activeSection).toBe('clientes');
      httpMock.expectNone((req) => req.url.endsWith('/buscar'));
    });

    it('combina filtros de clientes y permite limpiar la busqueda', async () => {
      const form = fixture.nativeElement.querySelector('.search-filters');
      for (const [name, value] of Object.entries({nombre: ' Ana ', identificacion: '123'})) {
        const input = form.querySelector('[name="' + name + '"]');
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
      const select = form.querySelector('[name="estado"]');
      select.value = 'ACTIVO';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
      form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
      const request = httpMock.expectOne((req) => req.url === '/clientes/buscar');
      expect(request.request.params.get('nombre')).toBe('Ana');
      expect(request.request.params.get('identificacion')).toBe('123');
      expect(request.request.params.get('estado')).toBe('ACTIVO');
      request.flush([
        {
          clienteId: '1',
          nombre: 'Ana',
          identificacion: '123',
          direccion: 'Calle 1',
          telefono: '123',
          edad: 30,
          genero: 'F',
          contrasena: 'clave',
          estado: 'activo',
        },
      ]);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Ana');
      expect(component.filteredClientes[0].estado).toBe('ACTIVO');
      expect(component.clientes).toEqual([]);
      form.querySelector('button[type="button"]').click();
      const reset = httpMock.expectOne((req) => req.url === '/clientes/buscar');
      expect(reset.request.params.keys()).toEqual([]);
      reset.flush([]);
      await fixture.whenStable();
      expect(component.filteredClientes).toEqual([]);
    });

    it('consulta cuentas con cliente, tipo y estado', () => {
      component.buscarCuentas({clienteId: '7', tipoCuenta: 'CORRIENTE', estado: 'ACTIVA'});
      const request = httpMock.expectOne((req) => req.url === '/cuentas/buscar');
      expect(request.request.params.get('clienteId')).toBe('7');
      expect(request.request.params.get('tipoCuenta')).toBe('CORRIENTE');
      expect(request.request.params.get('estado')).toBe('ACTIVA');
      request.flush([
        {
          cuentaId: '3',
          clienteId: '7',
          tipoCuenta: 'CORRIENTE',
          estado: 'activa',
          saldoInicial: 100,
        },
      ]);
      expect(component.filteredCuentas[0].estado).toBe('ACTIVA');
      expect(component.cuentas).toEqual([]);
    });

    it('busca movimientos por cuenta y desbloquea la busqueda despues de un error', () => {
      component.buscarMovimientos({cuentaId: '7'});
      component.buscarMovimientos({cuentaId: '7'});
      const request = httpMock.expectOne((req) => req.url === '/movimientos/buscar');
      expect(request.request.params.get('cuentaId')).toBe('7');
      request.flush({message: 'Error de busqueda'}, {status: 400, statusText: 'Bad Request'});
      expect(component.searchingMovimientos).toBe(false);
      expect(component.errorMessage).toBe('Error de busqueda');
      component.buscarMovimientos({cuentaId: '7'});
      httpMock.expectOne((req) => req.url === '/movimientos/buscar').flush([]);
      expect(component.filteredMovimientos).toEqual([]);
      expect(component.errorMessage).toBe('');
    });

    it('requiere un cliente y no muestra los movimientos generales en el reporte', () => {
      component.movimientos = [{
        movimientoId: '99', cuentaId: '99',
        fecha: '2026-10-03T12:00:00', tipoMovimiento: 'DEPOSITO', valor: 500, estado: 'APPROVED'
      }];
      component.buscarReporte();
      httpMock.expectNone(req => req.url === '/reportes');
      expect(component.reportMovimientos).toEqual([]);
      expect(component.reportDepositos).toBe(0);
      expect(component.reportConsulted).toBe(false);
    });

    it('limpia el reporte y cancela la consulta anterior al cambiar de cliente', () => {
      component.updateReportClient('7');
      component.buscarReporte();
      const anterior = httpMock.expectOne(req => req.url === '/reportes');
      component.updateReportClient('8');
      expect(anterior.cancelled).toBe(true);
      expect(component.searchingReport).toBe(false);
      component.buscarReporte();
      const actual = httpMock.expectOne(req => req.url === '/reportes');
      expect(actual.request.params.get('clienteId')).toBe('8');
      actual.flush([{
        clienteId: '7', cuentaId: '7', tipoCuenta: 'AHORRO', estado: 'ACTIVA', saldo: 50, movimientos: [{
          movimientoId: '2', cuentaId: '42', fecha: '2026-10-03T12:00:00',
          tipoMovimiento: 'DEPOSITO', valor: 100, estado: 'APPROVED'
        }]
      }]);
      expect(component.reportMovimientos.length).toBe(1);
      expect(component.reportConsulted).toBe(true);
      component.updateReportClient('7');
      expect(component.reportMovimientos).toEqual([]);
      expect(component.reportConsulted).toBe(false);
    });

    it('consulta el historial del reporte y excluye rechazados de los totales', () => {
      component.updateReportClient('7');
      component.updateReportDate('reportFrom', '2026-10-03');
      component.updateReportDate('reportTo', '2026-10-04');
      component.buscarReporte();
      const request = httpMock.expectOne((req) => req.url === '/reportes');
      expect(request.request.params.get('clienteId')).toBe('7');
      expect(request.request.params.get('inicio')).toBe('2026-10-03');
      expect(request.request.params.get('fin')).toBe('2026-10-04');
      request.flush([{
        clienteId: '7', cuentaId: '7', tipoCuenta: 'AHORRO', estado: 'ACTIVA', saldo: 50, movimientos: [
          {
            movimientoId: '1',
            cuentaId: '7',
            tipoMovimiento: 'DEPOSITO',
            valor: 100,
            estado: 'APPROVED',
            fecha: '2026-10-03T00:00:00',
          },
          {
            movimientoId: '2',
            cuentaId: '7',
            tipoMovimiento: 'RETIRO',
            valor: 50,
            estado: 'REVERSED_CORRECTION',
            fecha: '2026-10-04T23:59:59',
          },
          {
            movimientoId: '3',
            cuentaId: '7',
            tipoMovimiento: 'DEPOSITO',
            valor: 200,
            estado: 'REJECTED',
            fecha: '2026-10-03T12:00:00',
          },
        ]
      }]);
      expect(component.reportMovimientos.length).toBe(3);
      expect(component.reportDepositos).toBe(100);
      expect(component.reportRetiros).toBe(50);
      component.updateReportDate('reportFrom', '2026-10-05');
      expect(component.reportMovimientos).toEqual([]);
      component.buscarReporte();
      httpMock.expectNone((req) => req.url === '/reportes');
    });

    it('muestra la tabla del reporte aunque solo haya movimientos rechazados o revertidos', async () => {
      fixture.nativeElement.querySelectorAll('.nav-item')[3].click();
      component.clientes = [clienteNavegable];
      component.updateReportClient('7');
      await fixture.whenStable();
      fixture.nativeElement.querySelector('.report-search button').click();
      httpMock
        .expectOne((req) => req.url === '/reportes')
        .flush([{
          clienteId: '7', cuentaId: '42', tipoCuenta: 'AHORRO', estado: 'ACTIVA', saldo: 50, movimientos: [
            {
              movimientoId: '1',
              cuentaId: '42',
              fecha: '2026-10-03T20:23:00',
              tipoMovimiento: 'DEPOSITO',
              valor: 100,
              estado: 'REJECTED',
            },
            {
              movimientoId: '2',
              cuentaId: '42',
              fecha: '2026-10-03T20:24:00',
              tipoMovimiento: 'RETIRO',
              valor: 50,
              estado: 'REVERSED',
            },
          ]
        }]);
      await fixture.whenStable();
      const table = fixture.nativeElement.querySelector('.report-movements-table tbody');
      expect(table.querySelectorAll('tr').length).toBe(2);
      expect(table.textContent).toContain('REJECTED');
      expect(table.textContent).toContain('REVERSED');
      expect(table.querySelector('.empty-state')).toBeNull();
      expect(component.reportDepositos).toBe(0);
      expect(component.reportRetiros).toBe(0);
    });

    it('muestra el error de fechas y deshabilita consultar y descargar', () => {
      component.selectSection('reportes');
      component.updateReportDate('reportFrom', '2026-10-05');
      component.updateReportDate('reportTo', '2026-10-03');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.range-error')).toBeTruthy();
      const buttons = fixture.nativeElement.querySelectorAll('app-reportes-section button');
      expect([...buttons].every((button: any) => button.disabled)).toBe(true);
    });

    it('debe navegar desde el componente sidebar', () => {
      fixture.nativeElement.querySelectorAll('.nav-item')[3].click();
      fixture.detectChanges();
      expect(component.activeSection).toBe('reportes');
      expect(fixture.nativeElement.querySelector('app-reportes-section')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-clientes-section')).toBeNull();
    });

    it('debe actualizar la busqueda desde el listado de clientes', () => {
      const input = fixture.nativeElement.querySelector('[aria-label="Buscar clientes"]');
      input.value = 'juan';
      input.dispatchEvent(new Event('input'));
      expect(component.searchTerm).toBe('juan');
    });

    it('debe validar y guardar un cliente desde el formulario separado', async () => {
      fixture.nativeElement.querySelector('.page-heading button').click();
      fixture.detectChanges();
      await fixture.whenStable();
      const form = fixture.nativeElement.querySelector('app-record-form form');
      form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.field-error')).toBeTruthy();
      httpMock.expectNone('/clientes');

      for (const [name, value] of Object.entries({
        nombre: 'Juan Perez',
        identificacion: '123',
        telefono: '456',
        edad: '30',
        genero: 'M',
        direccion: 'Calle 1',
        contrasena: 'pass',
      })) {
        const input = form.querySelector('[name="' + name + '"]');
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
      fixture.detectChanges();
      await fixture.whenStable();
      form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
      form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
      const request = httpMock.expectOne('/clientes');
      expect(request.request.method).toBe('POST');
      expect(request.request.body.nombre).toBe('Juan Perez');
      request.flush({});
      httpMock.expectOne('/clientes').flush([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-record-form')).toBeNull();
    });
    it('debe renderizar el panel administrativo', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')).toBeTruthy();
    });

    it('debe mostrar el título correcto de la sección', () => {
      component.activeSection = 'clientes';
      fixture.detectChanges();
      const titulo = fixture.nativeElement.querySelector('h1');
      expect(titulo?.textContent).toContain('Clientes');
    });
  });
});
