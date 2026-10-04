import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchFilters } from './search-filters';

const CAMPOS = [
  { key: 'nombre', label: 'Nombre', type: 'text' as const },
  { key: 'estado', label: 'Estado', options: ['ACTIVO', 'BLOQUEADO'] },
];

describe('SearchFilters', () => {
  let fixture: ComponentFixture<SearchFilters>;
  let component: SearchFilters;

  const buscar = () =>
    ((fixture.nativeElement as HTMLElement).querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement).click();

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilters);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fields', CAMPOS);
    fixture.componentRef.setInput('values', { nombre: '', estado: '' });
    await fixture.whenStable();
  });

  it('renderiza un control por campo', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.filter-field').length).toBe(2);
    expect(element.querySelector('#filter-nombre')).not.toBeNull();
    expect(element.querySelector('#filter-estado')).not.toBeNull();
  });

  it('parte de los valores que le pasa el padre', async () => {
    fixture.componentRef.setInput('values', { nombre: 'Ana', estado: 'ACTIVO' });
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect((element.querySelector('#filter-nombre') as HTMLInputElement).value).toBe('Ana');
    expect((element.querySelector('#filter-estado') as HTMLSelectElement).value).toBe('ACTIVO');
  });

  it('emite los valores escritos al aplicar los filtros', () => {
    const emitido = vi.fn();
    component.filtersSearch.subscribe((valor) => emitido(valor));

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '#filter-nombre',
    ) as HTMLInputElement;
    input.value = 'Luis';
    input.dispatchEvent(new Event('input'));

    buscar();

    expect(emitido).toHaveBeenCalledWith({ nombre: 'Luis', estado: '' });
  });

  it('limpia los valores y avisa al padre', async () => {
    const reset = vi.fn();
    const searchSpy = vi.fn();
    component.filtersReset.subscribe(reset);
    component.filtersSearch.subscribe(searchSpy);

    fixture.componentRef.setInput('values', { nombre: 'Ana', estado: 'ACTIVO' });
    await fixture.whenStable();

    (element().querySelector('button.button-text') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(reset).toHaveBeenCalled();
    expect(searchSpy).not.toHaveBeenCalled();
    expect((element().querySelector('#filter-nombre') as HTMLInputElement).value).toBe('');
    expect((element().querySelector('#filter-estado') as HTMLSelectElement).value).toBe('');
  });

  it('descarta los valores no textuales de los filtros iniciales', async () => {
    fixture.componentRef.setInput('values', { nombre: 'Ana', estado: undefined });
    await fixture.whenStable();

    expect((element().querySelector('#filter-nombre') as HTMLInputElement).value).toBe('Ana');
    expect((element().querySelector('#filter-estado') as HTMLSelectElement).value).toBe('');
  });

  it('deshabilita los botones mientras carga', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect((element.querySelector('button.button-text') as HTMLButtonElement).disabled).toBe(true);
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Buscando');
  });
});