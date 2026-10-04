import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Movimiento} from '../models/movimiento.model';

describe('MovimientoService', () => {
  let service: MovimientoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MovimientoService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MovimientoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('env?a ?nicamente el estado de reversa', () => {
    service.actualizarMovimiento('42', {estado: 'REVERSED'}).subscribe();
    const request = httpMock.expectOne('/movimientos/42');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({estado: 'REVERSED'});
    request.flush({movimientoId: '42', estado: 'REVERSED'});
  });

  describe('obtenerMovimientos', () => {
    it('debe obtener todos los movimientos', () => {
      const movimientosMock: Movimiento[] = [
        {
          movimientoId: 'MOV001',
          cuentaId: 'ACC001',
          fecha: '2024-01-15T10:30:00',
          tipoMovimiento: 'DEPOSITO',
          valor: 500,
          estado: 'APPROVED',
        },
      ];

      service.obtenerMovimientos().subscribe((resultado) => {
        expect(resultado).toEqual(movimientosMock);
      });

      const req = httpMock.expectOne('/movimientos');
      expect(req.request.method).toBe('GET');
      req.flush(movimientosMock);
    });
  });

  describe('crearMovimiento', () => {
    it('debe crear un nuevo movimiento', () => {
      const nuevoMovimiento = {
        cuentaId: 'ACC001',
        fecha: '2024-01-15T10:30',
        tipoMovimiento: 'DEPOSITO' as const,
        valor: 500,
      };

      const movimientoCreado: Movimiento = {
        movimientoId: 'MOV001',
        ...nuevoMovimiento,
        fecha: '2024-01-15T10:30:00',
        estado: 'APPROVED',
      };

      service.crearMovimiento(nuevoMovimiento).subscribe((resultado) => {
        expect(resultado).toEqual(movimientoCreado);
      });

      const req = httpMock.expectOne('/movimientos');
      expect(req.request.method).toBe('POST');
      // Verifica que la fecha ha sido normalizada
      expect(req.request.body.fecha).toBe('2024-01-15T10:30:00');
      req.flush(movimientoCreado);
    });
  });

  describe('calcularDepositos', () => {
    it('debe calcular la suma de depósitos APPROVEDs', () => {
      const movimientos: Movimiento[] = [
        {
          movimientoId: 'MOV001',
          cuentaId: 'ACC001',
          fecha: '2024-01-15T10:30:00',
          tipoMovimiento: 'DEPOSITO',
          valor: 500,
          estado: 'APPROVED',
        },
        {
          movimientoId: 'MOV002',
          cuentaId: 'ACC001',
          fecha: '2024-01-16T11:30:00',
          tipoMovimiento: 'DEPOSITO',
          valor: 300,
          estado: 'APPROVED',
        },
        {
          movimientoId: 'MOV003',
          cuentaId: 'ACC001',
          fecha: '2024-01-17T12:30:00',
          tipoMovimiento: 'RETIRO',
          valor: 200,
          estado: 'APPROVED',
        },
      ];

      const total = service.calcularDepositos(movimientos);
      expect(total).toBe(800);
    });

    it('debe retornar 0 si no hay depósitos APPROVEDs', () => {
      const movimientos: Movimiento[] = [
        {
          movimientoId: 'MOV001',
          cuentaId: 'ACC001',
          fecha: '2024-01-15T10:30:00',
          tipoMovimiento: 'RETIRO',
          valor: 200,
          estado: 'APPROVED',
        },
      ];

      const total = service.calcularDepositos(movimientos);
      expect(total).toBe(0);
    });
  });

  describe('calcularRetiros', () => {
    it('debe calcular la suma de retiros APPROVEDs', () => {
      const movimientos: Movimiento[] = [
        {
          movimientoId: 'MOV001',
          cuentaId: 'ACC001',
          fecha: '2024-01-15T10:30:00',
          tipoMovimiento: 'RETIRO',
          valor: 200,
          estado: 'APPROVED',
        },
        {
          movimientoId: 'MOV002',
          cuentaId: 'ACC001',
          fecha: '2024-01-16T11:30:00',
          tipoMovimiento: 'RETIRO',
          valor: 150,
          estado: 'APPROVED',
        },
        {
          movimientoId: 'MOV003',
          cuentaId: 'ACC001',
          fecha: '2024-01-17T12:30:00',
          tipoMovimiento: 'DEPOSITO',
          valor: 500,
          estado: 'APPROVED',
        },
      ];

      const total = service.calcularRetiros(movimientos);
      expect(total).toBe(350);
    });
  });

  describe('buscar', () => {
    const movimientos: Movimiento[] = [
      {
        movimientoId: 'MOV001',
        cuentaId: 'ACC001',
        fecha: '2024-01-15T10:30:00',
        tipoMovimiento: 'DEPOSITO',
        valor: 500,
        estado: 'APPROVED',
      },
      {
        movimientoId: 'MOV002',
        cuentaId: 'ACC001',
        fecha: '2024-01-16T11:30:00',
        tipoMovimiento: 'RETIRO',
        valor: 200,
        estado: 'REJECTED',
      },
    ];

    it('debe buscar por ID de movimiento', () => {
      const resultados = service.buscar(movimientos, 'MOV001');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].movimientoId).toBe('MOV001');
    });

    it('debe buscar por tipo de movimiento', () => {
      const resultados = service.buscar(movimientos, 'DEPOSITO');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].tipoMovimiento).toBe('DEPOSITO');
    });

    it('debe retornar todos si el término es vacío', () => {
      const resultados = service.buscar(movimientos, '');
      expect(resultados).toHaveLength(2);
    });
  });

  describe('filtrarPorFecha', () => {
    const movimientos: Movimiento[] = [
      {
        movimientoId: 'MOV001',
        cuentaId: 'ACC001',
        fecha: '2024-01-15T10:30:00',
        tipoMovimiento: 'DEPOSITO',
        valor: 500,
        estado: 'APPROVED',
      },
      {
        movimientoId: 'MOV002',
        cuentaId: 'ACC001',
        fecha: '2024-01-20T11:30:00',
        tipoMovimiento: 'RETIRO',
        valor: 200,
        estado: 'APPROVED',
      },
      {
        movimientoId: 'MOV003',
        cuentaId: 'ACC001',
        fecha: '2024-02-05T12:30:00',
        tipoMovimiento: 'DEPOSITO',
        valor: 300,
        estado: 'APPROVED',
      },
    ];

    it('debe filtrar movimientos por rango de fechas', () => {
      const resultados = service.filtrarPorFecha(movimientos, '2024-01-15', '2024-01-31');
      expect(resultados).toHaveLength(2);
    });

    it('debe retornar todos si las fechas están vacías', () => {
      const resultados = service.filtrarPorFecha(movimientos, '', '');
      expect(resultados).toHaveLength(3);
    });
  });

  describe('formatearFecha', () => {
    it('debe formatear una fecha válida', () => {
      const fecha = '2024-01-15T10:30:00';
      const formateada = service.formatearFecha(fecha);
      expect(formateada).toContain('15');
      expect(formateada).toContain('ene');
    });

    it('debe retornar la fecha original si no es válida', () => {
      const fecha = 'fecha-invalida';
      const formateada = service.formatearFecha(fecha);
      expect(formateada).toBe(fecha);
    });
  });
});

