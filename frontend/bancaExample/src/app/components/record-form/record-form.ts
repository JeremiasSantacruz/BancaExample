import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, NgForm} from '@angular/forms';
import {Cliente} from '../../core/models/cliente.model';
import {Cuenta} from '../../core/models/cuenta.model';
import {Movimiento} from '../../core/models/movimiento.model';
import {Section} from '../../core/models/navigation.model';
import {ClienteService} from '../../core/services/cliente.service';

@Component({
  selector: 'app-record-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
  host: {style: 'display: block'},
})
export class RecordForm {
  @Input({required: true}) activeSection!: Section;
  @Input({required: true}) editingCliente!: Cliente | null;
  @Input({required: true}) editingCuenta!: Cuenta | null;
  @Input({required: true}) editingMovimiento!: Movimiento | null;
  @Input({required: true}) clienteForm!: any;
  @Input({required: true}) cuentaForm!: any;
  @Input({required: true}) movimientoForm!: any;
  @Input({required: true}) clienteEstados!: readonly string[];
  @Input({required: true}) cuentaEstados!: readonly string[];
  @Input({required: true}) clientes!: Cliente[];
  @Input({required: true}) cuentas!: Cuenta[];
  @Input({required: true}) busy!: boolean;

  @Output() readonly closeForm = new EventEmitter<void>();
  @Output() readonly saveCliente = new EventEmitter<NgForm>();
  @Output() readonly saveCuenta = new EventEmitter<NgForm>();
  @Output() readonly saveMovimiento = new EventEmitter<NgForm>();
  private readonly clienteService = inject(ClienteService);

  customerName(clienteId: string): string {
    return this.clienteService.obtenerNombre(this.clientes, clienteId);
  }
}
