import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormDialog } from '../../../component/form-dialog/form-dialog';
import { FormField } from '../../../component/form-field/form-field';
import {
  Cliente,
  Cuenta,
  CuentaEstado,
  CuentaFormValue,
  CUENTA_ESTADOS,
  TipoCuenta,
  TIPOS_CUENTA,
} from '../../../core/model';

type CuentaCampo = 'clienteId' | 'tipoCuenta' | 'estado' | 'saldoInicial';

/**
 * Formulario de alta y edición de cuentas.
 *
 * Solo se ofrecen clientes `ACTIVO`, porque el backend rechaza la creación de
 * cuentas para clientes que no lo están.
 */
@Component({
  selector: 'app-cuenta-form',
  imports: [ReactiveFormsModule, FormDialog, FormField],
  templateUrl: './cuenta-form.html',
  styleUrl: './cuenta-form.css',
})
export class CuentaForm {
  /** Cuenta a editar. `null` significa alta. */
  readonly cuenta = input<Cuenta | null>(null);
  /** Clientes habilitados para operar; la sección los carga. */
  readonly clientes = input.required<readonly Cliente[]>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<CuentaFormValue>();
  readonly closed = output<void>();

  protected readonly tipos = TIPOS_CUENTA;
  protected readonly estados = CUENTA_ESTADOS;
  protected readonly submitted = signal(false);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    clienteId: ['', Validators.required],
    tipoCuenta: ['AHORRO' as TipoCuenta, Validators.required],
    estado: ['ACTIVA' as CuentaEstado, Validators.required],
    saldoInicial: [0 as number | null, [Validators.min(0)]],
  });

  constructor() {
    effect(() => {
      const cuenta = this.cuenta();

      if (cuenta) {
        this.submitted.set(false);
        this.form.setValue({
          clienteId: cuenta.clienteId,
          tipoCuenta: cuenta.tipoCuenta,
          estado: cuenta.estado,
          saldoInicial: cuenta.saldo,
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

    const valor = this.form.getRawValue();
    const editando = this.cuenta();

    this.saved.emit({
      cuentaId: editando?.cuentaId,
      clienteId: valor.clienteId,
      tipoCuenta: valor.tipoCuenta,
      estado: valor.estado,
      saldoInicial: valor.saldoInicial ?? undefined,
    });
  }

  protected errorFor(campo: CuentaCampo): string {
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

    if (errors['min']) {
      return 'El saldo no puede ser negativo.';
    }

    return 'Valor no válido.';
  }
}