import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormDialog } from '../../../component/form-dialog/form-dialog';
import { FormField } from '../../../component/form-field/form-field';
import { Cliente, ClienteCreateDTO, ClienteEstado, CLIENTE_ESTADOS } from '../../../core/model';

/** Campos del formulario, para tipar `errorFor`. */
type ClienteCampo =
  | 'nombre'
  | 'identificacion'
  | 'telefono'
  | 'edad'
  | 'genero'
  | 'direccion'
  | 'contrasena'
  | 'estado';

/**
 * Formulario de alta y edición de clientes, dentro de un `app-form-dialog`.
 *
 * Manda un `ClienteCreateDTO` completo porque `ClienteRequest` marca todos sus
 * campos como obligatorios.
 */
@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, FormDialog, FormField],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.css',
})
export class ClienteForm {
  /** Cliente a editar. `null` significa alta. */
  readonly cliente = input<Cliente | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  /** Emite el DTO listo para enviar. No emite si el formulario es inválido. */
  readonly saved = output<ClienteCreateDTO>();
  readonly closed = output<void>();

  protected readonly estados = CLIENTE_ESTADOS;
  /** Marca el intento de envío para poder mostrar los errores. */
  protected readonly submitted = signal(false);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    edad: [18, [Validators.required, Validators.min(18), Validators.max(120)]],
    genero: ['', [Validators.required, Validators.maxLength(30)]],
    direccion: ['', [Validators.required, Validators.maxLength(120)]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    estado: ['ACTIVO' as ClienteEstado, Validators.required],
  });

  constructor() {
    // Al cambiar el cliente editado, el formulario se vuelve a llenar.
    effect(() => {
      const cliente = this.cliente();

      if (cliente) {
        this.submitted.set(false);
        this.form.setValue({
          nombre: cliente.nombre,
          identificacion: cliente.identificacion,
          telefono: cliente.telefono,
          edad: cliente.edad,
          genero: cliente.genero,
          direccion: cliente.direccion,
          contrasena: cliente.contrasena,
          estado: cliente.estado,
        });
      }
    });
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.saved.emit(this.form.getRawValue());
  }

  protected errorFor(campo: ClienteCampo): string {
    if (!this.submitted()) {
      return '';
    }

    const errors = this.form.controls[campo].errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (errors['minlength']) {
      return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
    }

    if (errors['min'] || errors['max']) {
      return 'Ingresa una edad entre 18 y 120.';
    }

    return 'Valor no válido.';
  }
}