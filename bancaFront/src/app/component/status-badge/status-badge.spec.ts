import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('estado', 'ACTIVO');
    await fixture.whenStable();
  });

  it('muestra el estado recibido', () => {
    expect(element().querySelector('.status')?.textContent?.trim()).toBe('ACTIVO');
  });

  it('resalta el estado operativo por defecto', () => {
    expect(element().querySelector('.status-good')).not.toBeNull();
  });

  it('permite cambiar cuál es el estado operativo', async () => {
    fixture.componentRef.setInput('estado', 'ACTIVA');
    fixture.componentRef.setInput('good', 'ACTIVA');
    await fixture.whenStable();

    expect(element().querySelector('.status-good')).not.toBeNull();
  });

  it('no resalta los estados que no son operativos', async () => {
    fixture.componentRef.setInput('estado', 'BLOQUEADA');
    await fixture.whenStable();

    expect(element().querySelector('.status-good')).toBeNull();
    expect(element().textContent).toContain('BLOQUEADA');
  });

  it('permite mostrar otro texto sin tocar el enum', async () => {
    fixture.componentRef.setInput('text', 'Operativa');
    await fixture.whenStable();

    expect(element().textContent).toContain('Operativa');
    // El estado operativo se sigue evaluando contra el enum.
    expect(element().querySelector('.status-good')).not.toBeNull();
  });
});
