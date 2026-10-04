import {Component, Input} from '@angular/core';
import {UiNotification} from '../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
  @Input({required: true}) notification!: UiNotification | null;
}
