import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Cliente} from '../models/cliente.model';

describe('ClienteService', () => {
  let service: ClienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClienteService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('obtenerClientes', () => {
    it('debe obtener todos los clientes', () => {
      const clientesMock: Cliente[] = [
        {
          clienteId: '1',
          nombre: 'Juan Pérez',
          identificacion: '12345678',
          direccion: 'Calle 1',
          telefono: '1234567890',
          genero: 'M',
          edad: 30,
          estado: 'ACTIVO',
          contrasena: 'password',
        },
      ];

      service.obtenerClientes().subscribe((resultado) => {
        expect(resultado).toEqual(clientesMock);
      });

      const req = httpMock.expectOne('/clientes');
      expect(req.request.method).toBe('GET');
      req.flush(clientesMock);
    });
  });

  describe('crearCliente', () => {
    it('debe crear un nuevo cliente', () => {
      const nuevoCliente = {
        nombre: 'María García',
        identificacion: '87654321',
        direccion: 'Calle 2',
        telefono: '0987654321',
        genero: 'F',
        edad: 25,
        estado: 'ACTIVO' as const,
        contrasena: 'pass123',
      };

      const clienteCreado: Cliente = {clienteId: '2', ...nuevoCliente};

      service.crearCliente(nuevoCliente).subscribe((resultado) => {
        expect(resultado).toEqual(clienteCreado);
      });

      const req = httpMock.expectOne('/clientes');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevoCliente);
      req.flush(clienteCreado);
    });
  });

  describe('actualizarCliente', () => {
    it('debe actualizar un cliente existente', () => {
      const clienteId = '1';
      const actualizacion = {nombre: 'Juan Pablo Pérez'};
      const clienteActualizado: Cliente = {
        clienteId,
        nombre: 'Juan Pablo Pérez',
        identificacion: '12345678',
        direccion: 'Calle 1',
        telefono: '1234567890',
        genero: 'M',
        edad: 30,
        estado: 'ACTIVO',
        contrasena: 'password',
      };

      service.actualizarCliente(clienteId, actualizacion).subscribe((resultado) => {
        expect(resultado).toEqual(clienteActualizado);
      });

      const req = httpMock.expectOne(`/clientes/${clienteId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(actualizacion);
      req.flush(clienteActualizado);
    });
  });

  describe('eliminarCliente', () => {
    it('debe eliminar un cliente', () => {
      const clienteId = '1';

      service.eliminarCliente(clienteId).subscribe(() => {
      });

      const req = httpMock.expectOne(`/clientes/${clienteId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('normalizarEstado', () => {
    it('debe normalizar estados válidos', () => {
      expect(service.normalizarEstado('ACTIVO')).toBe('ACTIVO');
      expect(service.normalizarEstado('activo')).toBe('ACTIVO');
      expect(service.normalizarEstado('BLOQUEADO')).toBe('BLOQUEADO');
    });

    it('debe lanzar error para estados inválidos', () => {
      expect(() => service.normalizarEstado('INVALIDO')).toThrowError();
    });
  });

  describe('contarPorEstado', () => {
    it('debe contar clientes por estado', () => {
      const clientes: Cliente[] = [
        {
          clienteId: '1',
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
          clienteId: '2',
          nombre: 'María',
          identificacion: '2',
          direccion: 'Dir',
          telefono: 'Tel',
          genero: 'F',
          edad: 25,
          estado: 'ACTIVO',
          contrasena: 'pass',
        },
        {
          clienteId: '3',
          nombre: 'Carlos',
          identificacion: '3',
          direccion: 'Dir',
          telefono: 'Tel',
          genero: 'M',
          edad: 35,
          estado: 'BLOQUEADO',
          contrasena: 'pass',
        },
      ];

      expect(service.contarPorEstado(clientes, 'ACTIVO')).toBe(2);
      expect(service.contarPorEstado(clientes, 'BLOQUEADO')).toBe(1);
      expect(service.contarPorEstado(clientes, 'INACTIVO')).toBe(0);
    });
  });

  describe('buscar', () => {
    const clientes: Cliente[] = [
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

    it('debe buscar por nombre', () => {
      const resultados = service.buscar(clientes, 'juan');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].nombre).toBe('Juan Pérez');
    });

    it('debe buscar por identificación', () => {
      const resultados = service.buscar(clientes, '12345678');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].clienteId).toBe('C001');
    });

    it('debe retornar todos los clientes si el término es vacío', () => {
      const resultados = service.buscar(clientes, '');
      expect(resultados).toHaveLength(2);
    });

    it('debe retornar array vacío si no encuentra coincidencias', () => {
      const resultados = service.buscar(clientes, 'INEXISTENTE');
      expect(resultados).toHaveLength(0);
    });
  });

  describe('obtenerNombre', () => {
    const clientes: Cliente[] = [
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
    ];

    it('debe obtener el nombre de un cliente existente', () => {
      const nombre = service.obtenerNombre(clientes, 'C001');
      expect(nombre).toBe('Juan Pérez');
    });

    it('debe retornar un nombre por defecto si no encuentra el cliente', () => {
      const nombre = service.obtenerNombre(clientes, 'INEXISTENTE');
      expect(nombre).toBe('Cliente INEXISTENTE');
    });
  });

  describe('existe', () => {
    const clientes: Cliente[] = [
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

    it('debe retornar verdadero si el cliente existe', () => {
      expect(service.existe(clientes, 'C001')).toBe(true);
    });

    it('debe retornar falso si el cliente no existe', () => {
      expect(service.existe(clientes, 'INEXISTENTE')).toBe(false);
    });
  });
});

