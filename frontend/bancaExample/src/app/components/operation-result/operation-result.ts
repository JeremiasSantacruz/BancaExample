import {DOCUMENT} from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {UiNotification} from '../../core/services/notification.service';

@Component({
  selector: 'app-operation-result',
  templateUrl: './operation-result.html',
  styleUrl: './operation-result.css',
})
export class OperationResult implements AfterViewInit, OnDestroy {
  @Input({required: true}) result!: UiNotification;
  @Output() readonly dismissed = new EventEmitter<void>();
  @ViewChild('dialog', {static: true}) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousFocus = this.document.activeElement as HTMLElement | null;
    this.dialog.nativeElement.showModal();
  }

  ngOnDestroy(): void {
    this.dialog.nativeElement.close();
    const target =
      this.previousFocus?.isConnected && this.previousFocus !== this.document.body
        ? this.previousFocus
        : this.document.querySelector<HTMLButtonElement>('.page-heading button');
    target?.focus();
  }
}
