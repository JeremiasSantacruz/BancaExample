import {Injectable, signal} from '@angular/core';

export type NotificationKind = 'error' | 'success';

export interface UiNotification {
  kind: NotificationKind;
  message: string;
}

@Injectable({providedIn: 'root'})
export class NotificationService {
  private readonly notification = signal<UiNotification | null>(null);
  readonly current = this.notification.asReadonly();

  show(kind: NotificationKind, message: string): void {
    if (!message.trim()) return;
    const current = this.current();
    if (current?.kind === kind && current.message === message) return;
    this.notification.set({kind, message});
  }

  clear(kind?: NotificationKind): void {
    if (!kind || this.current()?.kind === kind) this.notification.set(null);
  }
}
