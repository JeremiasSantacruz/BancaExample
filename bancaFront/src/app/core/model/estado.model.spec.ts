import { esEstadoValido, normalizarEstado } from './estado.model';

describe('normalizarEstado', () => {
  it('sube a mayúsculas el estado que devuelve el backend en minúsculas', () => {
    expect(normalizarEstado('activo')).toBe('ACTIVO');
    expect(normalizarEstado('bloqueada')).toBe('BLOQUEADA');
  });

  it('deja intacto el estado que ya viene en mayúsculas', () => {
    expect(normalizarEstado('APPROVED')).toBe('APPROVED');
  });

  it('recorta espacios antes de comparar', () => {
    expect(normalizarEstado('  inactiva  ')).toBe('INACTIVA');
  });

  it('devuelve null cuando no hay estado', () => {
    expect(normalizarEstado(null)).toBeNull();
    expect(normalizarEstado(undefined)).toBeNull();
    expect(normalizarEstado('   ')).toBeNull();
  });
});

describe('esEstadoValido', () => {
  const permitidos = ['ACTIVO', 'BLOQUEADO'] as const;

  it('acepta los estados del dominio sin importar la caja', () => {
    expect(esEstadoValido('activo', permitidos)).toBe(true);
    expect(esEstadoValido('BLOQUEADO', permitidos)).toBe(true);
  });

  it('rechaza estados que no pertenecen al dominio', () => {
    expect(esEstadoValido('CERRADO', permitidos)).toBe(false);
    expect(esEstadoValido('', permitidos)).toBe(false);
  });
});