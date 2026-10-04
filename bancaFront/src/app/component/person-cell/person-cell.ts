import { Component, computed, input } from '@angular/core';

/**
 * Celda de persona: avatar con la inicial, nombre y un subtítulo.
 *
 * La usan las tablas de clientes y de cuentas, así el formato del titular se
 * mantiene igual en toda la aplicación.
 */
@Component({
  selector: 'app-person-cell',
  templateUrl: './person-cell.html',
  styleUrl: './person-cell.css',
})
export class PersonCell {
  readonly name = input.required<string>();
  /** Dirección, teléfono o cualquier dato secundario bajo el nombre. */
  readonly subtitle = input('');
  readonly initial = input('');

  protected readonly avatarInitial = computed(() => {
    const provided = this.initial().trim();

    return provided ? provided.toUpperCase() : (this.name().trim().charAt(0).toUpperCase() || '?');
  });
}