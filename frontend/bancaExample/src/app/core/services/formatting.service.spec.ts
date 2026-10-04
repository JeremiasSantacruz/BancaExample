import {TestBed} from '@angular/core/testing';

describe('FormattingService', () => {
  let service: FormattingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormattingService],
    });
    service = TestBed.inject(FormattingService);
  });

  describe('formatearMoneda', () => {
    it('debe formatear un número como moneda ARS', () => {
      const resultado = service.formatearMoneda(1000);
      expect(resultado).toContain('$');
      expect(resultado).toContain('1');
    });

    it('debe retornar formato predeterminado para valores no numéricos', () => {
      const resultado = service.formatearMoneda(NaN);
      expect(resultado).toBe(service.formatearMoneda(0));
    });

    it('debe formatear decimales correctamente', () => {
      const resultado = service.formatearMoneda(1000.50);
      expect(resultado).toContain('1');
    });
  });

  describe('formatearFecha', () => {
    it('debe formatear una fecha válida', () => {
      const fecha = '2024-01-15T10:30:00';
      const resultado = service.formatearFecha(fecha);
      expect(resultado).toContain('15');
    });

    it('debe retornar la fecha original si no es válida', () => {
      const fecha = 'fecha-invalida';
      const resultado = service.formatearFecha(fecha);
      expect(resultado).toBe(fecha);
    });

    it('debe manejar fechas vacías', () => {
      const fecha = '';
      const resultado = service.formatearFecha(fecha);
      expect(resultado).toBe('');
    });
  });

  describe('obtenerInicial', () => {
    it('debe retornar la primera letra en mayúscula', () => {
      expect(service.obtenerInicial('Juan')).toBe('J');
      expect(service.obtenerInicial('maría')).toBe('M');
    });

    it('debe retornar "U" para nombres vacíos', () => {
      expect(service.obtenerInicial('')).toBe('U');
    });

    it('debe manejar espacios en blanco', () => {
      expect(service.obtenerInicial('  Juan')).toBe('J');
    });
  });

  describe('truncar', () => {
    it('debe truncar texto cuando excede la longitud máxima', () => {
      const resultado = service.truncar('Buenos días', 5);
      expect(resultado).toBe('Bueno…');
      expect(resultado.length).toBe(6);
    });

    it('debe retornar el texto original si no excede la longitud', () => {
      const resultado = service.truncar('Hola', 10);
      expect(resultado).toBe('Hola');
    });

    it('debe manejar textos vacíos', () => {
      const resultado = service.truncar('', 10);
      expect(resultado).toBe('');
    });
  });

  describe('obtenerFechaHoy', () => {
    it('debe retornar una fecha en formato ISO', () => {
      const fecha = service.obtenerFechaHoy();
      expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('debe retornar una fecha válida', () => {
      const fecha = service.obtenerFechaHoy();
      const date = new Date(fecha);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('formatearFechaISO', () => {
    it('debe formatear una fecha en ISO correctamente', () => {
      const fecha = new Date(2024, 0, 15);
      const resultado = service.formatearFechaISO(fecha);
      expect(resultado).toMatch(/^2024-01-15$/);
    });

    it('debe agregar ceros a los dígitos menores a 10', () => {
      const fecha = new Date(2024, 1, 5);
      const resultado = service.formatearFechaISO(fecha);
      expect(resultado).toMatch(/^2024-02-05$/);
    });
  });

  describe('obtenerFechaHoraActual', () => {
    it('debe retornar una fecha y hora en formato datetime-local', () => {
      const resultado = service.obtenerFechaHoraActual();
      expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('debe retornar valores válidos', () => {
      const resultado = service.obtenerFechaHoraActual();
      const [fecha] = resultado.split('T');
      const date = new Date(fecha);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });
});

