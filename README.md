# BancaExample

## Levantar todo con Docker

```bash
docker compose up --build
```

Eso levanta los tres servicios y deja la aplicación operativa:

| Servicio | URL | Notas |
| --- | --- | --- |
| Frontend (Angular en nginx) | http://localhost:4200 | Punto de entrada de la aplicación |
| Backend (Spring Boot) | http://localhost:8080 | También accesible desde el frontend en `/api` |
| PostgreSQL | `localhost:5432` | Base `banca_example`, usuario y contraseña `postgres` |

El esquema lo crea el propio backend al arrancar (`ddl-auto: update`), así que no hay scripts de inicialización que ejecutar.

El orden de arranque lo garantizan los healthchecks: el backend espera a que PostgreSQL acepte conexiones y el frontend espera a que el backend responda en `/clientes`. Por eso `docker compose up` puede tardar un minuto la primera vez (descarga de imágenes, descarga de dependencias de Gradle, `npm ci` y compilación de Angular).

Comandos habituales:

```bash
docker compose up -d --build          # Levyanta en segundo plano
docker compose up -d --build backend  # Reconstruye solo un servicio
docker compose logs -f backend        # Sigue los logs del backend
docker compose ps                     # Estado y salud de cada servicio
docker compose down                   # Detiene todo conservando los datos
docker compose down -v                # Detiene todo y borra el volumen de PostgreSQL
```

El frontend se compila con Angular y lo sirve nginx, que hace de proxy inverso: `/api/...` se reenvía al backend quitando el prefijo (igual que el proxy de desarrollo) y cualquier otra ruta devuelve `index.html` para que el router de la SPA funcione al recargar con F5. Como el navegador solo habla con nginx, no hay CORS entre la UI y el API. nginx resuelve el nombre del backend en cada petición, así que sigue funcionando si el contenedor del backend se recrea.

### Variables de entorno

Se pueden definir en un archivo `.env` junto a `docker-compose.yml` o en el entorno antes de `docker compose up`:

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `DB_NAME` | `banca_example` | Nombre de la base |
| `DB_USERNAME` | `postgres` | Usuario de PostgreSQL |
| `DB_PASSWORD` | `postgres` | Contraseña de PostgreSQL |
| `DB_PORT` | `5432` | Puerto del host para PostgreSQL |
| `BACKEND_PORT` | `8080` | Puerto del host para el backend |
| `FRONTEND_PORT` | `4200` | Puerto del host para el frontend |
| `MAXIMO_RETIRO_DIARIO` | `1000.00` | Límite diario de retiros por cuenta |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=75.0` | Opciones de JVM del backend |

Si el backend o el frontend se ejecutan también en local (`./gradlew bootRun` y `ng serve`), ambos ocupan los puertos 8080 y 4200: para levantar el stack de Docker en paralelo hay que cambiar `BACKEND_PORT` y `FRONTEND_PORT`, por ejemplo `FRONTEND_PORT=4201 docker compose up`.

## Base de datos local

Si solo se necesita PostgreSQL, se puede levantar únicamente ese servicio: `docker compose up -d database`. Por defecto queda disponible en `localhost:5432`, con base `banca_example` y usuario/contraseña `postgres`. La configuración de Spring Boot usa esos mismos valores por defecto. Para cambiarlos, define `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` y/o `DB_PORT` en el entorno antes de iniciar Compose; `DB_URL` puede usarse para configurar el datasource de la aplicación.

Para detener el servicio sin borrar los datos: `docker compose down`. Los datos persisten en el volumen `postgres_data` del proyecto (`bancaexample_postgres_data`).

## Logs

Spring Boot guarda los logs de la aplicación en `backend/logs/banca-example.log`, con rotación al superar 10 MB y retención de 30 archivos. Se puede cambiar la ubicación definiendo `LOG_FILE` (por ejemplo, `LOG_FILE=C:\logs\banca-example.log` en PowerShell). Los logs de movimientos registran identificadores, tipo y estado; no incluyen contraseñas ni importes.

## Backend

El flujo de creación de clientes sigue Clean Architecture / Hexagonal:

- `domain/model`: objetos del dominio `Cliente` y `Persona`, sin dependencias de Spring ni JPA.
- `application/command`, `application/port/in` y `application/usecase`: entrada y reglas del caso de uso `CrearCliente`.
- `application/port/out`: contrato de persistencia consumido por el caso de uso.
- `infrastructure/adapterIn`: controlador REST y DTOs HTTP.
- `infrastructure/adapterOut/persistence`: implementación del puerto con Spring Data JPA y mapeo entre dominio y entidades. El modelo de dominio mantiene `Cliente extends Persona`; la persistencia asigna PK independiente a cada tabla y relaciona cliente y persona con una FK 1:1 (`clientes.persona_id`).

`/clientes` expone las operaciones `POST`, `GET`, `GET /{clienteId}`, `PUT /{clienteId}` y `DELETE /{clienteId}`. Los estados válidos son `ACTIVO`, `BLOQUEADO`, `INACTIVO` y `CERRADO`; únicamente `ACTIVO` habilita operaciones. Al pasar un cliente a `INACTIVO` —también mediante borrado lógico— todas sus cuentas pasan a `INACTIVA` en la misma transacción. Cambiar a otros estados de cliente no altera los estados propios de las cuentas. Todas las operaciones pasan por `ClienteUseCase`; las identificaciones duplicadas responden HTTP 409, los clientes inexistentes HTTP 404 y los ids no numéricos HTTP 400.

La entidad JPA `Cuenta` tiene una PK propia, pertenece a un `Cliente` mediante una relación muchos-a-uno (`cuentas.cliente_id`) y almacena el saldo como `BigDecimal` con dos decimales. Sus estados son `ACTIVA`, `BLOQUEADA`, `INACTIVA` y `CERRADA`; únicamente `ACTIVA` permite operar y el borrado lógico la deja `CERRADA`. El estado de cuenta se administra independientemente y nunca modifica el del cliente. Para crear o actualizar cuentas, el cliente debe estar `ACTIVO`. El CRUD se expone en `/cuentas` y pasa por `CuentaUseCase`.

La entidad JPA `Movimiento` tiene PK propia y referencia una cuenta mediante una relación muchos-a-uno (`movimientos.cuenta_id`). El CRUD se expone en `/movimientos` y pasa por `MovimientosUseCase`. Los tipos de dominio son `TipoMovimiento.RETIRO` y `TipoMovimiento.DEPOSITO`; la API acepta también los valores legados `DEBITO` y `CREDITO`, que se normalizan a los enums. Los estados de transacción se representan mediante `EstadoTransaccionMovimiento`. Los movimientos requieren cuenta `ACTIVA` y cliente `ACTIVO`; bloquear al cliente impide operar sus cuentas, y pasar el cliente a `INACTIVO` además actualiza todas sus cuentas a `INACTIVA`. El saldo diario de extracciones se consulta con `GET /movimientos/cuentas/{cuentaId}/extracciones-diarias?fecha=YYYY-MM-DD`; suma retiros `APLICADO` y `REVERSED_CORRECTION` para esa cuenta y fecha, y devuelve cero si no hubo extracciones efectivas. Al crear un movimiento aplicado, el caso de uso actualiza el saldo persistido de la cuenta: resta retiros y suma depósitos. `PUT /movimientos/{movimientoId}` no reemplaza el registro: bloquea la cuenta, cambia solo el estado del original a `REVERSED` y crea un nuevo registro `REVERSED_CORRECTION` con los datos corregidos. Dentro de la misma transacción revierte el efecto del original y aplica la corrección al saldo; rechaza nuevas correcciones si el original ya no está `APLICADO`. Para retiros también valida saldo disponible y máximo diario configurable mediante `MAXIMO_RETIRO_DIARIO` (por defecto `1000.00`). El adaptador bloquea las filas de cuenta, cliente y movimiento con `PESSIMISTIC_WRITE` y obtiene el saldo almacenado junto al total diario de extracciones dentro de la misma transacción; el saldo no se reconstruye sumando movimientos. Saldo insuficiente, estados no operativos, movimientos no corregibles y límite excedido responden HTTP 422.

Las pruebas de cuentas y movimientos incluyen slices JPA y MVC, además de integraciones HTTP end-to-end con PostgreSQL Testcontainers. Las pruebas con Testcontainers requieren Docker disponible.

## Paginación de listados

Todos los listados de consulta responden una página en lugar de un arreglo plano. El cuerpo es el de la clase `Pagina`:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 0,
  "first": true,
  "last": true
}
```

Los endpoints paginados son `GET /clientes`, `GET /cuentas/buscar`, `GET /cuentas/{clienteId}`, `GET /movimientos`, `GET /movimientos/buscar` y `GET /reportes`. Aceptan `page` (base 0) y `size`, con `size=all` como valor especial para devolver todo el resultado en una sola página. Un `page` o `size` negativo y un `size` mayor a 100 responden HTTP 400.

`GET /reportes` pagina por cuenta, no por movimiento: cada bloque de `content` trae una cuenta con todos sus movimientos del rango pedido, y `totalElements` cuenta las cuentas del cliente.

La búsqueda rápida de las tablas viaja al backend en `search`, con retardo de 300 ms en el frontend. Los movimientos también aceptan `searchTipo` y `searchEstado`, porque el texto por sí solo no distingue un tipo ni un estado.

## Frontend

La interfaz Angular se ejecuta desde `frontend/bancaFront` con `npm start` (en Docker se compila y la sirve nginx, sin `ng serve`). Todas las llamadas HTTP pasan por el prefijo `/api`, que el proxy de desarrollo reenvía a `http://localhost:8080` quitando ese prefijo y que nginx reenvía al backend de igual manera. El prefijo también evita que las rutas de la SPA (`/clientes`, `/cuentas`, `/movimientos`, `/reportes`) se confundan con endpoints del backend, de modo que recargar la página con F5 sigue sirviendo la aplicación.

El reporte visual agrupa los movimientos en un bloque por cuenta y su botón de PDF abre el diálogo de impresión del navegador, donde se puede seleccionar **Guardar como PDF**.