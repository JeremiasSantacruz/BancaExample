import { DOCUMENT } from '@angular/common';
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
 * Marco de diálogo para los formularios de alta y edición.
 *
 * Los formularios de cada sección proyecciónan sus campos con `<ng-content>`
 * y solomanejan su propio estado; el marco se encarga del modal, del foco y
 * de los botones de acción.
 */
@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.html',
  styleUrl: './form-dialog.css',
})
export class FormDialog implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  /** Deshabilita el submit mientras se guarda. */
  readonly busy = input(false);
  readonly submitLabel = input('Guardar');
  /** Error del submit, mostrado arriba de los botones. */
  readonly error = input<string | null>(null);
  /** `id` del `<form>` proyectado, al que apunta el botón de guardar. */
  readonly formId = input.required<string>();

  readonly submitted = output<void>();
  readonly closed = output<void>();

  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;

  private readonly document = inject(DOCUMENT);
  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused = this.document.activeElement as HTMLElement | null;
    this.dialog.nativeElement.showModal();
  }

  ngOnDestroy(): void {
    this.dialog.nativeElement.close();
    this.restoreFocus();
  }

  private restoreFocus(): void {
    const target =
      this.previouslyFocused?.isConnected && this.previouslyFocused !== this.document.body
        ? this.previouslyFocused
        : this.document.querySelector<HTMLElement>('.page-heading button');

    target?.focus();
  }
}