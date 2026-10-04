import { Component, input } from '@angular/core';

/**
 * Envoltorio de un campo de formulario: label, control y mensaje de error.
 *
 * El control se proyecta con `<ng-content>`, así cada formulario sigue
 * usando `ngModel` sin tener que duplicar el marcado del label.
 */
@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
})
export class FormField {
  readonly label = input.required<string>();
  /** `id` del control proyectado, para asociar el `label`. */
  readonly controlId = input.required<string>();
  readonly error = input('');
  readonly hint = input('');
  /** Marca el campo como obligatorio en el label. */
  readonly required = input(false);
}