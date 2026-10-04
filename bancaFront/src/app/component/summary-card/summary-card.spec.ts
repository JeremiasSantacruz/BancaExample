import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryCard } from './summary-card';

describe('SummaryCard', () => {
  let fixture: ComponentFixture<SummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryCard],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryCard);
    fixture.componentRef.setInput('label', 'Total clientes');
    fixture.componentRef.setInput('value', 12);
    await fixture.whenStable();
  });

  it('muestra etiqueta y valor', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.card-label')?.textContent).toContain('Total clientes');
    expect(element.querySelector('.card-value')?.textContent?.trim()).toBe('12');
  });

  it('acepta valores de texto, por ejemplo un importe formateado', async () => {
    fixture.componentRef.setInput('value', '$1.234,50');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.card-value')?.textContent).toContain(
      '$1.234,50',
    );
  });

  it('omite el ícono y el caption cuando no se pasan', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.card-icon')).toBeNull();
    expect(element.querySelector('.card-caption')).toBeNull();
  });

  it('aplica el tono en el host', async () => {
    fixture.componentRef.setInput('tone', 'green');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).classList.contains('tone-green')).toBe(true);
  });
});