import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Cuenta} from '../models/cuenta.model';

describe('CuentaService', () => {
  let service: CuentaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CuentaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CuentaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('obtenerCuentasDelCliente', () => {
    it('debe obtener las cuentas de un cliente', () => {
      const clienteId = 'C001';
      const cuentasMock: Cuenta[] = [
        {
          cuentaId: 'ACC001',
          clienteId,
          tipoCuenta: 'AHORRO',
          estado: 'ACTIVA',
          saldoInicial: 1000,
        },
      ];

      service.obtenerCuentasDelCliente(clienteId).subscribe((resultado) => {
        expect(resultado).toEqual(cuentasMock);
      });

      const req = httpMock.expectOne(`/cuentas/${clienteId}`);
      expect(req.request.method).toBe('GET');
      req.flush(cuentasMock);
    });
  });

  describe('crearCuenta', () => {
    it('debe crear una nueva cuenta', () => {
      const nuevaCuenta = {
        clienteId: 'C001',
        tipoCuenta: 'AHORRO' as const,
      };

      const cuentaCreada: Cuenta = {
        cuentaId: 'ACC002',
        ...nuevaCuenta,
        estado: 'ACTIVA',
        saldoInicial: 0,
      };

      service.crearCuenta(nuevaCuenta).subscribe((resultado) => {
        expect(resultado).toEqual(cuentaCreada);
      });

      const req = httpMock.expectOne('/cuentas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevaCuenta);
      req.flush(cuentaCreada);
    });
  });

  describe('calcularSaldoTotal', () => {
    it('debe calcular el saldo total de múltiples cuentas', () => {
      const cuentas: Cuenta[] = [
        {
          cuentaId: 'ACC001',
          clienteId: 'C001',
          tipoCuenta: 'AHORRO',
          estado: 'ACTIVA',
          saldoInicial: 1000,
        },
        {
          cuentaId: 'ACC002',
          clienteId: 'C001',
          tipoCuenta: 'CORRIENTE',
          estado: 'ACTIVA',
          saldoInicial: 2000,
        },
      ];

      const total = service.calcularSaldoTotal(cuentas);
      expect(total).toBe(3000);
    });

    it('debe retornar 0 si no hay cuentas', () => {
      const total = service.calcularSaldoTotal([]);
      expect(total).toBe(0);
    });
  });

  describe('contarPorEstado', () => {
    it('debe contar cuentas por estado', () => {
      const cuentas: Cuenta[] = [
        {
          cuentaId: 'ACC001',
          clienteId: 'C001',
          tipoCuenta: 'AHORRO',
          estado: 'ACTIVA',
          saldoInicial: 1000,
        },
        {
          cuentaId: 'ACC002',
          clienteId: 'C001',
          tipoCuenta: 'CORRIENTE',
          estado: 'ACTIVA',
          saldoInicial: 2000,
        },
        {
          cuentaId: 'ACC003',
          clienteId: 'C002',
          tipoCuenta: 'AHORRO',
          estado: 'BLOQUEADA',
          saldoInicial: 500,
        },
      ];

      expect(service.contarPorEstado(cuentas, 'ACTIVA')).toBe(2);
      expect(service.contarPorEstado(cuentas, 'BLOQUEADA')).toBe(1);
      expect(service.contarPorEstado(cuentas, 'CERRADA')).toBe(0);
    });
  });

  describe('buscar', () => {
    const cuentas: Cuenta[] = [
      {
        cuentaId: 'ACC001',
        clienteId: 'C001',
        tipoCuenta: 'AHORRO',
        estado: 'ACTIVA',
        saldoInicial: 1000,
      },
      {
        cuentaId: 'ACC002',
        clienteId: 'C002',
        tipoCuenta: 'CORRIENTE',
        estado: 'ACTIVA',
        saldoInicial: 2000,
      },
    ];

    it('debe buscar por número de cuenta', () => {
      const resultados = service.buscar(cuentas, 'ACC001');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].cuentaId).toBe('ACC001');
    });

    it('debe buscar por tipo de cuenta', () => {
      const resultados = service.buscar(cuentas, 'CORRIENTE');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].tipoCuenta).toBe('CORRIENTE');
    });

    it('debe retornar todas las cuentas si el término es vacío', () => {
      const resultados = service.buscar(cuentas, '');
      expect(resultados).toHaveLength(2);
    });
  });

  describe('filtrarPorCliente', () => {
    const cuentas: Cuenta[] = [
      {
        cuentaId: 'ACC001',
        clienteId: 'C001',
        tipoCuenta: 'AHORRO',
        estado: 'ACTIVA',
        saldoInicial: 1000,
      },
      {
        cuentaId: 'ACC002',
        clienteId: 'C002',
        tipoCuenta: 'CORRIENTE',
        estado: 'ACTIVA',
        saldoInicial: 2000,
      },
    ];

    it('debe filtrar cuentas por cliente', () => {
      const resultados = service.filtrarPorCliente(cuentas, 'C001');
      expect(resultados).toHaveLength(1);
      expect(resultados[0].clienteId).toBe('C001');
    });

    it('debe retornar todas las cuentas si no hay filtro', () => {
      const resultados = service.filtrarPorCliente(cuentas, null);
      expect(resultados).toHaveLength(2);
    });
  });

  describe('obtenerActivas', () => {
    it('debe retornar solo las cuentas activas', () => {
      const cuentas: Cuenta[] = [
        {
          cuentaId: 'ACC001',
          clienteId: 'C001',
          tipoCuenta: 'AHORRO',
          estado: 'ACTIVA',
          saldoInicial: 1000,
        },
        {
          cuentaId: 'ACC002',
          clienteId: 'C001',
          tipoCuenta: 'CORRIENTE',
          estado: 'CERRADA',
          saldoInicial: 2000,
        },
      ];

      const resultados = service.obtenerActivas(cuentas);
      expect(resultados).toHaveLength(1);
      expect(resultados[0].estado).toBe('ACTIVA');
    });
  });
});

