import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Movimiento } from '../../core/model';
import { MovimientosTable } from './movimientos-table';

const MOVIMIENTOS: Movimiento[] = [
  {
    movimientoId: '1',
    cuentaId: '10',
    tipoMovimiento: 'DEPOSITO',
    estado: 'APPROVED',
    valor: 1000,
    fecha: '2025-01-15T10:00:00',
  },
  {
    movimientoId: '2',
    cuentaId: '10',
    tipoMovimiento: 'RETIRO',
    estado: 'APPROVED',
    valor: 250,
    fecha: '2025-01-16T10:00:00',
  },
];

describe('MovimientosTable', () => {
  let fixture: ComponentFixture<MovimientosTable>;

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientosTable],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientosTable);
    fixture.componentRef.setInput('movimientos', MOVIMIENTOS);
    await fixture.whenStable();
  });

  it('renderiza una fila por movimiento', () => {
    expect(element().querySelectorAll('tbody tr[app-movimiento-row]').length).toBe(2);
    expect(element().textContent).toContain('DEPOSITO');
    expect(element().textContent).toContain('RETIRO');
  });

  it('muestra el mensaje vacío cuando no hay movimientos', async () => {
    fixture.componentRef.setInput('movimientos', []);
    await fixture.whenStable();

    expect(element().querySelectorAll('tbody tr[app-movimiento-row]').length).toBe(0);
    expect(element().textContent).toContain('No hay movimientos para mostrar.');
  });

  it('permite un mensaje vacío propio de la sección', async () => {
    fixture.componentRef.setInput('movimientos', []);
    fixture.componentRef.setInput('emptyMessage', 'Sin movimientos en el período.');
    await fixture.whenStable();

    expect(element().textContent).toContain('Sin movimientos en el período.');
  });

  it('no ofrece la reversa si la sección no la habilita', () => {
    expect(element().querySelectorAll('tbody button').length).toBe(0);
  });

  it('ofrece la reversa cuando la sección la habilita', async () => {
    fixture.componentRef.setInput('canReverse', true);
    await fixture.whenStable();

    expect(element().querySelectorAll('tbody button').length).toBe(2);
  });

  it('deshabilita la reversa mientras hay una operación en curso', async () => {
    fixture.componentRef.setInput('canReverse', true);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    const botones = element().querySelectorAll('tbody button') as NodeListOf<HTMLButtonElement>;
    expect(botones.length).toBe(2);
    expect(botones[0].disabled).toBe(true);
  });

  it('emite el movimiento pedido a revertir', async () => {
    const reverse = vi.fn();
    fixture.componentInstance.reverse.subscribe(reverse);

    fixture.componentRef.setInput('canReverse', true);
    await fixture.whenStable();

    (element().querySelectorAll('tbody button')[1] as HTMLButtonElement).click();

    expect(reverse).toHaveBeenCalledWith(MOVIMIENTOS[1]);
  });
});
