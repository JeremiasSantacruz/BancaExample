import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import { FormDialog } from '../../../component/form-dialog/form-dialog';
import { FormField } from '../../../component/form-field/form-field';
import {
  Cuenta,
  MovimientoCreateDTO,
  MovimientoEstado,
  MovimientoTipo,
  MOVIMIENTO_ESTADOS,
  MOVIMIENTO_TIPOS,
} from '../../../core/model';
import { ClienteService, FormattingService, MovimientoService } from '../../../core/service';

type MovimientoCampo = 'cuentaId' | 'fecha' | 'tipoMovimiento' | 'valor' | 'estado';

/**
 * Formulario de alta de movimientos.
 *
 * El backend valida saldo suficiente, estados y el límite diario de retiros
 * (`MAXIMO_RETIRO_DIARIO`). El formulario muestra el saldo actual y lo ya
 * extraído en el día para que el rechazo sea esperable.
 */
@Component({
  selector: 'app-movimiento-form',
  imports: [ReactiveFormsModule, FormDialog, FormField],
  templateUrl: './movimiento-form.html',
  styleUrl: './movimiento-form.css',
})
export class MovimientoForm {
  /** Cuentas habilitadas para operar; la sección las calcula. */
  readonly cuentas = input.required<readonly Cuenta[]>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<MovimientoCreateDTO>();
  readonly closed = output<void>();

  protected readonly tipos = MOVIMIENTO_TIPOS;
  protected readonly estados = MOVIMIENTO_ESTADOS;
  protected readonly submitted = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly movimientoService = inject(MovimientoService);
  private readonly clienteService = inject(ClienteService);
  private readonly formatting = inject(FormattingService);

  protected readonly form = this.fb.nonNullable.group({
    cuentaId: ['', Validators.required],
    fecha: ['', Validators.required],
    tipoMovimiento: ['DEPOSITO' as MovimientoTipo, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    estado: ['APPROVED' as MovimientoEstado, Validators.required],
  });

  /**
   * Los valores del formulario no son signals, así que los controles que la
   * vista necesita observar se replican en signals desde `valueChanges`.
   */
  protected readonly cuentaId = signal('');
  protected readonly tipo = signal<MovimientoTipo>('DEPOSITO');
  protected readonly fecha = signal('');

  /** Cuenta elegida, resuelta desde el listado que le pasa la sección. */
  protected readonly selectedCuenta = computed<Cuenta | null>(
    () => this.cuentas().find((cuenta) => cuenta.cuentaId === this.cuentaId()) ?? null,
  );

  protected readonly isRetiro = computed(() => this.tipo() === 'RETIRO');

  /**
   * Cuánto se retiró de la cuenta en la fecha elegida.
   *
   * El endpoint devuelve cero cuando no hubo retiros efectivos: sirve para
   * informar, no para validar.
   */
  protected readonly dailyWithdrawal = toSignal(
    toObservable(
      computed(() => {
        const fecha = this.fecha().slice(0, 10);
        const cuentaId = this.cuentaId();

        return cuentaId && fecha ? { cuentaId, fecha } : null;
      }),
    ).pipe(
      switchMap((params) =>
        params
          ? this.movimientoService.obtenerExtraccionDiaria(params.cuentaId, params.fecha)
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  constructor() {
    this.form.controls.cuentaId.valueChanges.subscribe((valor) => this.cuentaId.set(valor));
    this.form.controls.tipoMovimiento.valueChanges.subscribe((valor) => this.tipo.set(valor));
    this.form.controls.fecha.valueChanges.subscribe((valor) => this.fecha.set(valor));

    const ahora = this.formatting.nowDateTime();
    this.form.controls.fecha.setValue(ahora);
    this.fecha.set(ahora);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const valor = this.form.getRawValue();

    this.saved.emit({
      cuentaId: valor.cuentaId,
      fecha: valor.fecha,
      tipoMovimiento: valor.tipoMovimiento,
      valor: valor.valor ?? 0,
      estado: valor.estado,
    });
  }

  protected formatCurrency(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : this.formatting.formatCurrency(valor);
  }

  protected customerName(clienteId: string): string {
    return this.clienteService.nombreDe(clienteId);
  }

  protected errorFor(campo: MovimientoCampo): string {
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
      return 'El valor debe ser mayor que cero.';
    }

    return 'Valor no válido.';
  }
}