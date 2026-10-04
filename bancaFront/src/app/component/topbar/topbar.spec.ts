import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar';

describe('TopbarComponent', () => {
  let fixture: ComponentFixture<TopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    fixture.componentRef.setInput('sectionTitle', 'Cuentas');
    await fixture.whenStable();
  });

  it('muestra la sección activa en el breadcrumb', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.breadcrumb strong')?.textContent).toContain('Cuentas');
  });

  it('usa el usuario por defecto', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.topbar-user')?.textContent).toContain('Administrador');
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('AD');
  });

  it('permite sobreescribir el usuario', async () => {
    fixture.componentRef.setInput('userName', 'Jeremías');
    fixture.componentRef.setInput('userInitials', 'JS');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.topbar-user')?.textContent).toContain('Jeremías');
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('JS');
  });
});