import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  let fixture: ComponentFixture<Pagination>;
  let componente: Pagination;

  const element = () => fixture.nativeElement as HTMLElement;
  const botones = () => Array.from(element().querySelectorAll<HTMLButtonElement>('nav button'));
  const etiquetas = () => botones().map((boton) => boton.textContent?.trim());
  const botonConTexto = (texto: string) => botones().find((boton) => boton.textContent?.trim() === texto);

  /** Crea el componente con una página de resultado. */
  async function montar(overrides: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(Pagination);
    componente = fixture.componentInstance;

    fixture.componentRef.setInput('page', 0);
    fixture.componentRef.setInput('size', 10);
    fixture.componentRef.setInput('totalElements', 24);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.componentRef.setInput('range', { desde: 1, hasta: 10 });

    for (const [nombre, valor] of Object.entries(overrides)) {
      fixture.componentRef.setInput(nombre, valor);
    }

    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Pagination] }).compileComponents();
  });

  it('muestra el rango visible sobre el total', async () => {
    await montar();

    expect(element().querySelector('.pagination-summary')?.textContent).toContain(
      'Mostrando 1-10 de 24',
    );
  });

  it('avisa que no hay resultados en vez de mostrar un rango vacío', async () => {
    await montar({ totalElements: 0, totalPages: 0, range: { desde: 0, hasta: 0 } });

    expect(element().querySelector('.pagination-summary')?.textContent).toContain('Sin resultados');
  });

  it('numera las páginas empezando en 1', async () => {
    await montar();

    // Botones: anterior, páginas, siguiente.
    expect(etiquetas()).toEqual(['‹', '1', '2', '3', '›']);
  });

  it('marca la página actual', async () => {
    await montar({ page: 1, range: { desde: 11, hasta: 20 } });

    const actual = botones().find((boton) => boton.classList.contains('active'));
    expect(actual?.textContent?.trim()).toBe('2');
    expect(actual?.getAttribute('aria-current')).toBe('page');
  });

  it('acorta el listado con puntos suspensivos cuando hay muchas páginas', async () => {
    await montar({ page: 10, totalPages: 20, range: { desde: 101, hasta: 110 } });

    // Primera, actual y vecinas, y última.
    expect(etiquetas()).toEqual(['‹', '1', '10', '11', '12', '20', '›']);
    expect(element().querySelectorAll('.pagination-gap').length).toBe(2);
  });

  it('oculta los números cuando hay una sola página', async () => {
    await montar({ totalPages: 1, totalElements: 3, range: { desde: 1, hasta: 3 } });

    expect(etiquetas()).toEqual(['‹', '›']);
  });

  it('emite la página pedida', async () => {
    await montar();
    const emissions: number[] = [];
    componente.pageChange.subscribe((page) => emissions.push(page));

    botonConTexto('3')?.click();

    expect(emissions).toEqual([2]);
  });

  it('avanza y retrocede una página', async () => {
    await montar({ page: 1, range: { desde: 11, hasta: 20 } });
    const emissions: number[] = [];
    componente.pageChange.subscribe((page) => emissions.push(page));

    botones()[0].click();
    botones()[botones().length - 1].click();

    expect(emissions).toEqual([0, 2]);
  });

  it('no vuelve a pedir la página en la que ya está', async () => {
    await montar();
    const emissions: number[] = [];
    componente.pageChange.subscribe((page) => emissions.push(page));

    botonConTexto('1')?.click();

    expect(emissions).toEqual([]);
  });

  it('deshabilita la anterior en la primera página y la siguiente en la última', async () => {
    await montar();
    expect(botones()[0].disabled).toBe(true);
    expect(botones()[botones().length - 1].disabled).toBe(false);

    await montar({ page: 2, range: { desde: 21, hasta: 24 } });
    expect(botones()[0].disabled).toBe(false);
    expect(botones()[botones().length - 1].disabled).toBe(true);
  });

  it('no emite nada mientras está deshabilitado', async () => {
    await montar({ disabled: true });
    const emissions: number[] = [];
    componente.pageChange.subscribe((page) => emissions.push(page));

    botones()[botones().length - 1].click();

    expect(emissions).toEqual([]);
  });

  it('ofrece los tamaños de página y emite el nuevo tamaño', async () => {
    await montar();
    const select = element().querySelector('select') as HTMLSelectElement;

    expect(Array.from(select.options).map((opcion) => opcion.value)).toEqual(['5', '10', '25', '50']);
    expect(select.value).toBe('10');

    const emissions: number[] = [];
    componente.sizeChange.subscribe((size) => emissions.push(size));

    select.value = '25';
    select.dispatchEvent(new Event('change'));

    expect(emissions).toEqual([25]);
  });

  it('no emite el mismo tamaño que ya está aplicado', async () => {
    await montar();
    const emissions: number[] = [];
    componente.sizeChange.subscribe((size) => emissions.push(size));

    const select = element().querySelector('select') as HTMLSelectElement;
    select.value = '10';
    select.dispatchEvent(new Event('change'));

    expect(emissions).toEqual([]);
  });

  it('expone la paginación con una etiqueta accesible', async () => {
    await montar();

    expect(element().querySelector('nav')?.getAttribute('aria-label')).toBe('Paginación');
    expect(botones()[0].getAttribute('aria-label')).toBe('Página anterior');
    expect(botones()[botones().length - 1].getAttribute('aria-label')).toBe('Página siguiente');
    expect(element().querySelector('select')?.getAttribute('aria-label')).toBe(
      'Elementos por página',
    );
  });
});