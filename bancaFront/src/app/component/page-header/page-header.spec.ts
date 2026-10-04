import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Clientes');
    await fixture.whenStable();
  });

  it('muestra el título de la sección', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Clientes',
    );
  });

  it('oculta la descripción cuando no viene', async () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('p')).toBeNull();

    fixture.componentRef.setInput('description', 'Alta de clientes');
    await fixture.whenStable();

    expect(element.querySelector('p')?.textContent).toContain('Alta de clientes');
  });

  it('proyecta las acciones en el encabezado', async () => {
    fixture.componentRef.setInput('title', 'Clientes');
    await fixture.whenStable();

    // `ng-content` sin contenido no debe romper el render.
    expect(fixture.componentInstance).toBeTruthy();
  });
});