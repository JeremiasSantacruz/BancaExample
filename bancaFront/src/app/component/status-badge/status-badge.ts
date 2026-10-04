import { Component, computed, input } from '@angular/core';

/**
 * Píldora de estado. Reemplaza el marcado `.status` que se repetía en cada
 * tabla, y resalta el estado operativo sin que cada tabla lo vuelva a decidir.
 */
@Component({
  selector: 'app-status-badge',
  template: `<span class="status" [class.status-good]="esOperativo()">{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class StatusBadge {
  /** Valor del enum de dominio, ya normalizado a mayúsculas. */
  readonly estado = input.required<string>();
  /** Estado que se resalta como operativo, por ejemplo `ACTIVO` o `ACTIVA`. */
  readonly good = input('ACTIVO');
  /** Permite mostrar otro texto sin tocar el enum. */
  readonly text = input<string>('');

  readonly label = computed(() => this.text() || this.estado());
  readonly esOperativo = computed(() => this.estado() === this.good());
}