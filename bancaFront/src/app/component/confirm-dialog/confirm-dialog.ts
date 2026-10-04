import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  ViewChild,
} from '@angular/core';

/**
 * Diálogo de confirmación para acciones destructivas.
 *
 * Evita `window.confirm`, que bloquea el event loop y no se puede estilizar.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  /** `danger` pinta el botón de confirmación en rojo. */
  readonly tone = input<'danger' | 'primary'>('danger');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;

  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }

  ngOnDestroy(): void {
    this.dialog.nativeElement.close();
  }
}