import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NavigationItem, Section} from '../../core/models/navigation.model';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: {style: 'display: contents'},
})
export class Sidebar {
  @Input({required: true}) navigation!: NavigationItem[];
  @Input({required: true}) activeSection!: Section;
  @Input({required: true}) clienteCount!: number;

  @Output() readonly sectionSelected = new EventEmitter<Section>();
}
