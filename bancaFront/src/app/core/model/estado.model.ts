/**
 * Normalización de estados.
 *
 * El backend no es consistente en la caja del `estado`:
 * - `ClienteController` y `CuentaController` responden `estado().name().toLowerCase()`
 *   (por ejemplo `"activo"` / `"activa"`).
 * - `MovimientosController` y `ReportesController` responden el nombre del enum tal cual.
 *
 * Normalizamos siempre a mayúsculas para poder comparar contra los enums del
 * dominio sin depender de cómo respondió cada endpoint.
 */
export function normalizarEstado<T extends string>(
  valor: string | null | undefined,
): T | null {
  const normalizado = (valor ?? '').trim().toUpperCase();

  return normalizado ? (normalizado as T) : null;
}

/**
 * Indica si un estado pertenece a la lista permitida.
 * Útil para validar los valores que llegan desde los formularios.
 */
export function esEstadoValido<T extends string>(
  valor: string | null | undefined,
  permitidos: readonly T[],
): valor is T {
  const normalizado = normalizarEstado<T>(valor);

  return normalizado !== null && permitidos.includes(normalizado);
}