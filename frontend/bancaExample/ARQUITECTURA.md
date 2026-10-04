# Arquitectura del Frontend - Buenas Prácticas

## Descripción General

Este frontend ha sido refactorizado siguiendo principios de **Clean Code** y **SOLID** para mejorar la mantenibilidad, testabilidad y escalabilidad.

---

## Principios SOLID Implementados

### 1. **Single Responsibility Principle (SRP)**

Cada servicio tiene una única responsabilidad:

- **ClienteService**: Gestiona operaciones de clientes
- **CuentaService**: Gestiona operaciones de cuentas
- **MovimientoService**: Gestiona operaciones de movimientos
- **FormattingService**: Centraliza lógica de formateo
- **ApiService**: Base para comunicación HTTP

```typescript
// ✅ BIEN - Responsabilidad única
ClienteService: Obtiene, crea, actualiza, elimina
clientes
CuentaService: Gestiona
cuentas
MovimientoService: Gestiona
movimientos

// ❌ MAL - Múltiples responsabilidades (anterior)
App
Component: Hacía
todo(HTTP, lógica, presentación)
```

### 2. **Open/Closed Principle (OCP)**

Los servicios están abiertos para extensión pero cerrados para modificación:

- ApiService proporciona métodos base HTTP
- Servicios específicos extienden funcionalidad sin modificar ApiService

### 3. **Liskov Substitution Principle (LSP)**

Los servicios pueden ser intercambiados por sus implementaciones sin cambiar el comportamiento

### 4. **Interface Segregation Principle (ISP)**

Interfaces específicas y pequeñas:

```typescript
// Cada modelo tiene su interfaz dedicada
interface Cliente {
  ...
}

interface Cuenta {
  ...
}

interface Movimiento {
  ...
}

// DTOs para crear/actualizar
type ClienteCreateDTO = Omit<Cliente, 'clienteId'>;
type CuentaUpdateDTO = Partial<CuentaCreateDTO>;
```

### 5. **Dependency Injection (DI)**

Uso de inyección de dependencias de Angular:

```typescript
private readonly
clienteService = inject(ClienteService);
private readonly
cuentaService = inject(CuentaService);
```

---

## Estructura de Carpetas

```
src/app/
├── app.ts                      # Componente raíz (contenedor)
├── app.html                    # Template principal
├── app.css                     # Estilos del componente raíz
├── app.spec.ts                 # Pruebas del componente
│
├── core/                        # Lógica de negocio reutilizable
│   ├── models/
│   │   ├── cliente.model.ts     # Interfaz y tipos de Cliente
│   │   ├── cuenta.model.ts      # Interfaz y tipos de Cuenta
│   │   ├── movimiento.model.ts  # Interfaz y tipos de Movimiento
│   │   └── index.ts             # Barrel export
│   │
│   └── services/
│       ├── api.service.ts           # Base para HTTP
│       ├── api.service.spec.ts      # (Tests)
│       ├── cliente.service.ts       # Lógica de Clientes
│       ├── cliente.service.spec.ts  # (Tests)
│       ├── cuenta.service.ts        # Lógica de Cuentas
│       ├── cuenta.service.spec.ts   # (Tests)
│       ├── movimiento.service.ts    # Lógica de Movimientos
│       ├── movimiento.service.spec.ts # (Tests)
│       ├── formatting.service.ts    # Formateo de datos
│       ├── formatting.service.spec.ts # (Tests)
│       └── index.ts                 # Barrel export
```

---

## Patrones Implementados

### 1. **Barrel Exports Pattern**

Simplifica las importaciones:

```typescript
// ❌ Antes
import {ClienteService} from './core/services/cliente.service';
import {CuentaService} from './core/services/cuenta.service';
import {MovimientoService} from './core/services/movimiento.service';

// ✅ Ahora
import {ClienteService, CuentaService, MovimientoService} from './core/services';
```

### 2. **Service Layer Pattern**

Servicios manejan la lógica de negocio, componentes manejan presentación:

```typescript
// Servicio - Lógica pura
calcularDepositos(movimientos
:
Movimiento[]
):
number
{ ...
}

// Componente - Solo usa el servicio
get
appliedDeposits()
:
number
{
  return this.movimientoService.calcularDepositos(this.movimientos);
}
```

### 3. **Error Handling Centralizado**

Manejo consistente de errores en ApiService:

```typescript
private
handleError(error
:
unknown
):
Observable < never > {
  // Extrae mensajes, normaliza errores
  // Todos los servicios usan este manejo
}
```

### 4. **DTO (Data Transfer Object)**

Separación clara entre modelos y DTOs:

```typescript
type ClienteCreateDTO = Omit<Cliente, 'clienteId'>;
type ClienteUpdateDTO = Partial<ClienteCreateDTO>;
```

---

## Clean Code - Mejoras Implementadas

### 1. **Nombres Significativos**

```typescript
// ❌ Antes
loadClientes()
showError()
localDate()

// ✅ Ahora
cargarClientes()
mostrarError()
obtenerFechaHoy()
```

### 2. **Funciones Pequeñas y Enfocadas**

```typescript
// Cada método hace UNA cosa
buscar(clientes, termino)
:
Cliente[]
contarPorEstado(clientes, estado)
:
number
obtenerNombre(clientes, id)
:
string
```

### 3. **Documentación en el Código**

```typescript
/**
 * Obtiene todos los clientes registrados
 * @returns Observable<Cliente[]>
 */
obtenerClientes()
:
Observable<Cliente[]>
```

### 4. **Privacidad Apropiada**

```typescript
private readonly
clienteService = inject(ClienteService);  // Privado
readonly
navigation = [...];                              // Solo lectura
```

### 5. **Evitar Duplicación (DRY)**

```typescript
// FormattingService centraliza lógica de formateo
formatearMoneda()
formatearFecha()
obtenerInicial()
```

---

## Testing - Pruebas Unitarias

Cada servicio y componente tiene suite de tests:

```bash
npm run test
```

### Cobertura de Tests

- **ClienteService**: 8+ tests
- **CuentaService**: 8+ tests
- **MovimientoService**: 8+ tests
- **FormattingService**: 7+ tests
- **App Component**: 13+ tests

### Ejemplo de Test

```typescript
it('debe filtrar clientes por nombre', () => {
  component.searchTerm = 'juan';
  expect(component.filteredClientes.length).toBe(1);
  expect(component.filteredClientes[0].nombre).toBe('Juan Pérez');
});
```

---

## Flujo de Datos

```
                    ┌─────────────────┐
                    │   App Component │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Services     │
                    │  (Lógica Negoc.)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ApiService    │
                    │   (HTTP)        │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Backend API   │
                    └─────────────────┘
```

---

## Cómo Agregar una Nueva Funcionalidad

### 1. Crear el Modelo

```typescript
// models/nueva-entidad.model.ts
export interface NuevaEntidad {
  ...
}

export type NuevaEntidadCreateDTO = Omit<NuevaEntidad, 'id'>;
```

### 2. Crear el Servicio

```typescript
// services/nueva-entidad.service.ts
@Injectable({providedIn: 'root'})
export class NuevaEntidadService {
  constructor(private readonly api: ApiService) {
  }

  obtener(): Observable<NuevaEntidad[]> {
    return this.api.get<NuevaEntidad[]>('/nueva-entidad');
  }

  // ... más métodos
}
```

### 3. Usar en el Componente

```typescript
private readonly
nuevaService = inject(NuevaEntidadService);

ngOnInit()
{
  this.nuevaService.obtener().subscribe({
    next: (datos) => this.nuevoDatos = datos,
    error: (error) => this.mostrarError(error)
  });
}
```

### 4. Agregar Tests

```typescript
// nueva-entidad.service.spec.ts
describe('NuevaEntidadService', () => {
  // Tests...
});
```

---

## Mejores Prácticas

✅ **HACER:**

- Usar tipos fuertemente tipados
- Implementar manejo de errores consistente
- Escribir tests para toda lógica reutilizable
- Usar servicios inyectados (DI)
- Documentar métodos complejos
- Separar lógica de presentación

❌ **NO HACER:**

- Lógica HTTP directa en componentes
- Clases monolíticas con múltiples responsabilidades
- Compartir estado sin servicios
- Ignorar manejo de errores
- Tests sin cobertura
- Nombres ambiguos

---

## Recursos Adicionales

- [Angular Best Practices](https://angular.io/guide/styleguide)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)

---

## Conclusión

Esta arquitectura proporciona:

- ✅ Código más limpio y legible
- ✅ Mejor testabilidad
- ✅ Mayor escalabilidad
- ✅ Mantenimiento más fácil
- ✅ Reutilización de código

