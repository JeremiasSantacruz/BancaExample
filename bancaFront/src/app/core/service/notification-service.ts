import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'error' | 'success';

export interface UiNotification {
  kind: NotificationKind;
  message: string;
}

/**
 * Aviso global de la aplicación.
 *
 * Vive en un servicio para que cualquier sección pueda informar el resultado de
 * una operación sin cablear outputs hasta el shell.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notification = signal<UiNotification | null>(null);
  readonly current = this.notification.asReadonly();

  show(kind: NotificationKind, message: string): void {
    if (!message.trim()) {
      return;
    }

    const actual = this.current();

    if (actual?.kind === kind && actual.message === message) {
      return;
    }

    this.notification.set({ kind, message });
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  clear(kind?: NotificationKind): void {
    if (!kind || this.current()?.kind === kind) {
      this.notification.set(null);
    }
  }
}