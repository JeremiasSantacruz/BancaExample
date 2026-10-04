import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Retardo antes de disparar una búsqueda.
 *
 * Sin esto se pediría el listado en cada tecla pulsada; con esto se espera a que
 * el usuario termine de escribir.
 */
export const RETARDO_BUSQUEDA_MS = 300;

/**
 * Envuelve a un callback para que solo reciba el último valor emitted en
 * `RETARDO_BUSQUEDA_MS` milisegundos.
 *
 * Hay que llamarla dentro de un contexto de inyección (por ejemplo, el
 * constructor del servicio) porque usa `takeUntilDestroyed`.
 */
export function conRetardo<T>(alEmitir: (valor: T) => void): (valor: T) => void {
  const pendientes = new Subject<T>();

  pendientes
    .pipe(debounceTime(RETARDO_BUSQUEDA_MS), takeUntilDestroyed())
    .subscribe((valor) => alEmitir(valor));

  return (valor: T) => pendientes.next(valor);
}