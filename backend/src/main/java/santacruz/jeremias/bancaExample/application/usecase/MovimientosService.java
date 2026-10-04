package santacruz.jeremias.bancaExample.application.usecase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.application.port.in.MovimientosUseCase;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.MovimientoPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.exception.*;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.EstadoCuentaMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class MovimientosService implements MovimientosUseCase {
    @Override
    @Transactional(readOnly = true)
    public List<Movimiento> buscar(String cuentaId, LocalDate inicio, LocalDate fin) {
        if (inicio != null && fin != null && inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha de fin.");
        }
        return movimientoPersistence.buscar(FiltrosBusqueda.id(cuentaId), inicio, fin);
    }


    private static final Logger logger = LoggerFactory.getLogger(MovimientosService.class);

    private final MovimientoPersistencePort movimientoPersistence;
    private final List<CalcularSaldoUseCase> calcularSaldoUseCases;
    private final CuentaPersistencePort cuentaPersistencePort;
    private final BigDecimal maximoRetiroDiario;

    public MovimientosService(
            MovimientoPersistencePort movimientoPersistence, List<CalcularSaldoUseCase> calcularSaldoUseCases,
            CuentaPersistencePort cuentaPersistencePort, @Value("${app.movimientos.maximo-retiro-diario:1000.00}") BigDecimal maximoRetiroDiario
    ) {
        this.movimientoPersistence = movimientoPersistence;
        this.calcularSaldoUseCases = calcularSaldoUseCases;
        this.cuentaPersistencePort = cuentaPersistencePort;
        this.maximoRetiroDiario = maximoRetiroDiario;
    }

    @Override
    @Transactional
    public Movimiento crearMovimiento(MovimientoCommand command) {
        try {
            logger.info("Creando movimiento: {}", command);
            Movimiento movimiento = toDomain(null, command);
            validarMovimiento(movimiento);
            if (movimiento.estado() == EstadoTransaccionMovimiento.REVERSED
                    || movimiento.estado() == EstadoTransaccionMovimiento.REVERSED_CORRECTION) {
                throw new IllegalArgumentException("Los estados de reversa solo se asignan durante una corrección.");
            }
            Cuenta cuenta = cuentaPersistencePort.buscarPorId(movimiento.cuentaId())
                    .orElseThrow(() -> new CuentaNoEncontradaException(movimiento.cuentaId()));
            if (!cuenta.estado().esOperativa()) {
                throw new CuentaNoOperativaException(movimiento.cuentaId());
            }
            if (command.tipoMovimiento().equals(TipoMovimiento.RETIRO)) {
                BigDecimal saldoExtraccionesDiarias = movimientoPersistence.obtenerSaldoExtraccionesDiarias(
                        movimiento.cuentaId(),
                        movimiento.fecha().toLocalDate()
                );
                if (saldoExtraccionesDiarias.add(movimiento.valor()).compareTo(maximoRetiroDiario) > 0) {
                    throw new LimiteExtraccionDiarioExcedidoException(movimiento.cuentaId());
                }
            }
            CalcularSaldoUseCase calcularSaldoUseCase = calcularSaldoUseCases.stream()
                    .filter(s -> s.support(cuenta.tipoCuenta()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("No se encontró un caso de uso para el tipo de movimiento: " + cuenta.tipoCuenta()));
            BigDecimal valorMovimiento = movimiento.tipoMovimiento() == TipoMovimiento.RETIRO ? movimiento.valor().negate() : movimiento.valor();
            BigDecimal saldoNuevo = calcularSaldoUseCase.calcularSaldo(cuenta.saldo(), valorMovimiento);
            movimientoPersistence.actualizarSaldoBloqueado(movimiento.cuentaId(), saldoNuevo);
            Movimiento creado = movimientoPersistence.guardar(movimiento);
            logger.info(
                    "Movimiento creado: id={}, cuentaId={}, tipo={}, estado={}",
                    creado.movimientoId(),
                    creado.cuentaId(),
                    creado.tipoMovimiento(),
                    creado.estado()
            );
            return creado;
        } catch (Exception e) {
            logger.error("Error al crear movimiento: {}", e.getMessage(), e);
            Movimiento movimiento = toDomainAnulado(null, command);
            return movimientoPersistence.guardar(movimiento);
        }
}

    @Override
    @Transactional(readOnly = true)
    public List<Movimiento> obtenerTodos() {
        return movimientoPersistence.listarTodos();
    }

    @Override
    @Transactional(readOnly = true)
    public Movimiento obtenerPorId(String movimientoId) {
        return movimientoPersistence.buscarPorId(movimientoId)
                .orElseThrow(() -> new MovimientoNoEncontradoException(movimientoId));
    }

    @Override
    @Transactional
    public Movimiento actualizar(String movimientoId, MovimientoCommand command) {
        Movimiento original = movimientoPersistence.buscarPorIdBloqueando(movimientoId)
                .orElseThrow(() -> new MovimientoNoEncontradoException(movimientoId));
        if (original.estado() != EstadoTransaccionMovimiento.APPROVED) {
            throw new MovimientoNoCorregibleException(movimientoId);
        }
        if (!original.cuentaId().equals(command.cuentaId())) {
            throw new IllegalArgumentException("La corrección debe pertenecer a la misma cuenta del movimiento original.");
        }

        Movimiento correccion = new Movimiento(
                null,
                original.cuentaId(),
                command.fecha(),
                command.tipoMovimiento(),
                command.valor(),
                EstadoTransaccionMovimiento.REVERSED_CORRECTION
        );
        validarMovimiento(correccion);

        EstadoCuentaMovimiento estadoCuenta = movimientoPersistence.obtenerEstadoCuentaBloqueando(
                original.cuentaId(),
                correccion.fecha().toLocalDate()
        );
        if (!estadoCuenta.estadoCliente().esOperativo()) {
            throw new ClienteNoOperativoException(estadoCuenta.clienteId());
        }
        if (!estadoCuenta.estadoCuenta().esOperativa()) {
            throw new CuentaNoOperativaException(original.cuentaId());
        }

        BigDecimal saldoRevertido = revertirSaldoOriginal(original, estadoCuenta.saldoActual());
        BigDecimal extraccionesDiarias = estadoCuenta.extraccionesDiarias();
        if (original.tipoMovimiento() == TipoMovimiento.RETIRO
                && original.fecha().toLocalDate().equals(correccion.fecha().toLocalDate())) {
            extraccionesDiarias = extraccionesDiarias.subtract(original.valor());
        }
        EstadoCuentaMovimiento estadoAjustado = new EstadoCuentaMovimiento(
                estadoCuenta.clienteId(),
                saldoRevertido,
                extraccionesDiarias,
                estadoCuenta.estadoCuenta(),
                estadoCuenta.estadoCliente()
        );
        BigDecimal saldoCorregido = calcularSaldoNuevo(correccion, estadoAjustado);
        movimientoPersistence.actualizarSaldoBloqueado(original.cuentaId(), saldoCorregido);

        Movimiento creado = movimientoPersistence.revertirYGuardarCorreccion(movimientoId, correccion);
        logger.info(
                "Movimiento corregido: originalId={}, correccionId={}, cuentaId={}, tipo={}",
                original.movimientoId(),
                creado.movimientoId(),
                creado.cuentaId(),
                creado.tipoMovimiento()
        );
        return creado;
    }

    @Override
    @Transactional
    public void eliminar(String movimientoId) {
        obtenerPorId(movimientoId);
        movimientoPersistence.eliminarPorId(movimientoId);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal obtenerSaldoExtraccionesDiarias(String cuentaId, LocalDate fecha) {
        return movimientoPersistence.obtenerSaldoExtraccionesDiarias(cuentaId, fecha);
    }

    private Movimiento toDomain(String movimientoId, MovimientoCommand command) {
        return new Movimiento(
                movimientoId,
                command.cuentaId(),
                command.fecha(),
                command.tipoMovimiento(),
                command.valor(),
                command.estado()
        );
    }

    private Movimiento toDomainAnulado(String movimientoId, MovimientoCommand command) {
        return new Movimiento(
                movimientoId,
                command.cuentaId(),
                command.fecha(),
                command.tipoMovimiento(),
                command.valor(),
                EstadoTransaccionMovimiento.REJECTED
        );
    }

    private void validarMovimiento(Movimiento movimiento) {
        if (movimiento.cuentaId() == null || movimiento.cuentaId().isBlank()) {
            throw new IllegalArgumentException("La cuenta del movimiento es obligatoria.");
        }
        if (movimiento.valor() == null || movimiento.valor().signum() <= 0) {
            throw new IllegalArgumentException("El valor del movimiento debe ser mayor que cero.");
        }
        if (movimiento.tipoMovimiento() == null) {
            throw new IllegalArgumentException("El tipo de movimiento es obligatorio.");
        }
        if (movimiento.estado() == null) {
            throw new IllegalArgumentException("El estado del movimiento es obligatorio.");
        }
        if (movimiento.fecha() == null) {
            throw new IllegalArgumentException("La fecha del movimiento es obligatoria.");
        }
    }

    private BigDecimal calcularSaldoNuevo(Movimiento movimiento, EstadoCuentaMovimiento estadoCuenta) {
        if (movimiento.tipoMovimiento() == TipoMovimiento.RETIRO) {
            if (estadoCuenta.saldoActual().compareTo(movimiento.valor()) < 0) {
                logger.warn("Movimiento rechazado por saldo insuficiente: cuentaId={}", movimiento.cuentaId());
                throw new SaldoInsuficienteException(movimiento.cuentaId());
            }
            if (estadoCuenta.extraccionesDiarias().add(movimiento.valor()).compareTo(maximoRetiroDiario) > 0) {
                logger.warn("Movimiento rechazado por límite diario excedido: cuentaId={}", movimiento.cuentaId());
                throw new LimiteExtraccionDiarioExcedidoException(movimiento.cuentaId());
            }
            return estadoCuenta.saldoActual().subtract(movimiento.valor());
        }
        return estadoCuenta.saldoActual().add(movimiento.valor());
    }

    private BigDecimal revertirSaldoOriginal(Movimiento original, BigDecimal saldoActual) {
        if (original.tipoMovimiento() == TipoMovimiento.RETIRO) {
            return saldoActual.add(original.valor());
        }
        if (saldoActual.compareTo(original.valor()) < 0) {
            logger.warn(
                    "Corrección rechazada porque el saldo no permite revertir el depósito original: movimientoId={}",
                    original.movimientoId()
            );
            throw new SaldoInsuficienteException(original.cuentaId());
        }
        return saldoActual.subtract(original.valor());
    }
}
