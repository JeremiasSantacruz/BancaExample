import {TestBed} from '@angular/core/testing';
import {Movimiento} from '../../core/models/movimiento.model';

describe('MovimientosSection', () => {
  const deposito: Movimiento = {
    movimientoId: 'M1',
    cuentaId: 'C1',
    fecha: '2026-10-03T12:00:00',
    tipoMovimiento: 'DEPOSITO',
    valor: 100,
    estado: 'APPROVED',
  };
  const retiro: Movimiento = {
    ...deposito,
    movimientoId: 'M2',
    tipoMovimiento: 'RETIRO',
    estado: 'REJECTED',
  };

  async function render(movimientos: Movimiento[] = [deposito, retiro]) {
    await TestBed.configureTestingModule({imports: [MovimientosSection]}).compileComponents();
    const fixture = TestBed.createComponent(MovimientosSection);
    for (const [name, value] of Object.entries({
      movimientos,
      filteredMovimientos: movimientos,
      appliedDeposits: 100,
      appliedWithdrawals: 0,
      searchTerm: '',
    }))
      fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture;
  }

  it('renders summaries and movement rows with their original styles', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.summary-card').length).toBe(3);
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.querySelectorAll('tbody tr')[0].querySelector('.deposit-amount')).toBeTruthy();
    expect(root.querySelectorAll('tbody tr')[1].querySelector('.withdraw-amount')).toBeTruthy();
    expect(
      root.querySelectorAll('tbody tr')[1].querySelector('.text-action:not(.danger-action)'),
    ).toBeNull();
  });

  it('forwards search and reversal events to the parent', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    const searches: string[] = [];
    const corrections: Movimiento[] = [];
    const deletions: Movimiento[] = [];
    fixture.componentInstance.searchTermChange.subscribe((value) => searches.push(value));
    fixture.componentInstance.editMovimiento.subscribe((value) => corrections.push(value));
    fixture.componentInstance.deleteMovimiento.subscribe((value) => deletions.push(value));
    const input = root.querySelector<HTMLInputElement>('[aria-label="Buscar movimientos"]')!;
    input.value = 'C1';
    input.dispatchEvent(new Event('input'));
    (root.querySelector('.text-action:not(.danger-action)') as HTMLButtonElement).click();
    expect(root.querySelector('.danger-action')).toBeNull();
    expect(searches).toEqual(['C1']);
    expect(corrections).toEqual([deposito]);
    expect(deletions).toEqual([]);
  });

  it('renders the empty table state', async () => {
    const fixture = await render([]);
    const cell = fixture.nativeElement.querySelector('tbody .empty-state');
    expect(cell.textContent).toContain('No hay movimientos');
    expect(cell.getAttribute('colspan')).toBe('6');
  });
});
