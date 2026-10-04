import { Component, input } from '@angular/core';
import { UiNotification } from '../../core/service';

/**
 * Banner de aviso. Lee el aviso global de `NotificationService` a través de un
 * input, para que cada sección decida si lo muestra.
 *
 * Los estilos `.notice*` viven en `styles.css`.
 */
@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
  readonly notification = input<UiNotification | null>(null);
}