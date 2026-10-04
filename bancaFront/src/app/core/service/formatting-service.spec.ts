import { TestBed } from '@angular/core/testing';
import { FormattingService } from './formatting-service';

describe('FormattingService', () => {
  let service: FormattingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormattingService);
  });

  it('formatea números como moneda', () => {
    const resultado = service.formatCurrency(1234.5);

    expect(resultado).toContain('1.234');
    expect(resultado).toContain('50');
  });

  it('trata valores ausentes como cero', () => {
    expect(service.formatCurrency(null)).toContain('0');
    expect(service.formatCurrency(undefined)).toContain('0');
    expect(service.formatCurrency('abc')).toContain('0');
  });

  it('devuelve vacío cuando no hay fecha', () => {
    expect(service.formatDateTime(null)).toBe('');
    expect(service.formatDateTime('')).toBe('');
  });

  it('deja la fecha tal cual si no se puede parsear', () => {
    expect(service.formatDateTime('no-es-fecha')).toBe('no-es-fecha');
  });

  it('formatea una fecha ISO legible', () => {
    expect(service.formatDateTime('2025-01-15T10:30:00')).toMatch(/2025/);
  });

  it('saca la inicial en mayúscula', () => {
    expect(service.initial('ana')).toBe('A');
    expect(service.initial('  luis')).toBe('L');
    expect(service.initial(null)).toBe('?');
  });

  it('recorta textos largos', () => {
    expect(service.truncate('Ana Gómez', 20)).toBe('Ana Gómez');
    expect(service.truncate('Ana Gómez Paulista', 5)).toBe('Ana G…');
  });

  it('arma fechas en el formato que espera el backend', () => {
    expect(service.toISODate(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(service.toISODateTime(new Date(2025, 0, 5, 9, 7))).toBe('2025-01-05T09:07');
  });

  it('devuelve el primer día del mes actual', () => {
    const hoy = new Date();

    expect(service.startOfCurrentMonth()).toBe(service.toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
  });

  it('today coincide con toISODate de ahora', () => {
    expect(service.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
