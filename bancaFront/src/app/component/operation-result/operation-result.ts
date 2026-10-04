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
import { UiNotification } from '../../core/service';

/**
 * Diálogo modal que confirma el resultado de un alta o edición.
 *
 * Usa `<dialog>` nativo para leveragear el foco y el `Esc` del navegador.
 */
@Component({
  selector: 'app-operation-result',
  templateUrl: './operation-result.html',
  styleUrl: './operation-result.css',
})
export class OperationResult implements AfterViewInit, OnDestroy {
  readonly result = input.required<UiNotification>();
  readonly dismissed = output<void>();

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

  /** Devuelve el foco al botón que abrió el diálogo. */
  private restoreFocus(): void {
    const target =
      this.previouslyFocused?.isConnected && this.previouslyFocused !== this.document.body
        ? this.previouslyFocused
        : this.document.querySelector<HTMLElement>('.page-heading button');

    target?.focus();
  }
}