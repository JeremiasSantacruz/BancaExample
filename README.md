# BancaExample

## Base de datos local

Inicia PostgreSQL con Docker Compose:

```bash
docker compose up -d database
```

Por defecto, PostgreSQL queda disponible en `localhost:5432`, con base `banca_example` y usuario/contraseña `postgres`. La configuración de Spring Boot usa esos mismos valores por defecto. Para cambiarlos, define `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` y/o `DB_PORT` en el entorno antes de iniciar Compose; `DB_URL` puede usarse para configurar el datasource de la aplicación.

Para detener el servicio sin borrar los datos: `docker compose down`. Los datos persisten en el volumen `postgres_data`.

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

## Frontend

La interfaz Angular se ejecuta desde `frontend/bancaExample` con `npm start`. Durante el desarrollo, el proxy de Angular reenvía `/clientes`, `/cuentas` y `/movimientos` a `http://localhost:8080`. El reporte visual consulta el listado de movimientos y su botón de PDF abre el diálogo de impresión del navegador, donde se puede seleccionar **Guardar como PDF**.