package santacruz.jeremias.bancaExample.application.usecase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
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
            if (EstadoTransaccionMovimiento.getNotReversible().contains(movimiento.estado())) {
                throw new IllegalArgumentException("Los estados de reversa solo se asignan durante una corrección.");
            }
            EstadoCuentaMovimiento estadoCuenta = movimientoPersistence.obtenerEstadoCuentaBloqueando(
                    movimiento.cuentaId(), movimiento.fecha().toLocalDate());
            if (!estadoCuenta.estadoCliente().esOperativo()) {
                throw new ClienteNoOperativoException(estadoCuenta.clienteId());
            }
            Cuenta cuenta = cuentaPersistencePort.buscarPorId(movimiento.cuentaId())
                    .orElseThrow(() -> new CuentaNoEncontradaException(movimiento.cuentaId()));
            cuenta = new Cuenta(cuenta.cuentaId(), cuenta.clienteId(), cuenta.tipoCuenta(),
                    estadoCuenta.saldoActual(), estadoCuenta.estadoCuenta());
            if (!cuenta.estado().esOperativa()) {
                throw new CuentaNoOperativaException(movimiento.cuentaId());
            }
            validarLimiteDiarioDeExtraccion(command, movimiento);
            BigDecimal saldoNuevo = getSaldoNuevo(cuenta, movimiento);
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

    private BigDecimal getSaldoNuevo(Cuenta cuenta, Movimiento movimiento) {
        CalcularSaldoUseCase calcularSaldoUseCase = calcularSaldoUseCases.stream()
                .filter(s -> s.support(cuenta.tipoCuenta()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No se encontró un caso de uso para el tipo de movimiento: " + cuenta.tipoCuenta()));
        BigDecimal valorMovimiento = movimiento.tipoMovimiento() == TipoMovimiento.RETIRO ? movimiento.valor().negate() : movimiento.valor();
        BigDecimal saldoNuevo = calcularSaldoUseCase.calcularSaldo(cuenta.saldo(), valorMovimiento);
        return saldoNuevo;
    }

    private void validarLimiteDiarioDeExtraccion(MovimientoCommand command, Movimiento movimiento) {
        if (command.tipoMovimiento().equals(TipoMovimiento.RETIRO)) {
            BigDecimal saldoExtraccionesDiarias = movimientoPersistence.obtenerSaldoExtraccionesDiarias(
                    movimiento.cuentaId(),
                    movimiento.fecha().toLocalDate()
            );
            if (saldoExtraccionesDiarias.add(movimiento.valor()).compareTo(maximoRetiroDiario) > 0) {
                throw new LimiteExtraccionDiarioExcedidoException(movimiento.cuentaId());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Pagina<Movimiento> buscar(
            String cuentaId, LocalDate inicio, LocalDate fin, String search, Paginacion paginacion
    ) {
        if (inicio != null && fin != null && inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha de fin.");
        }
        return movimientoPersistence.buscar(
                FiltrosBusqueda.id(cuentaId), inicio, fin, FiltrosBusqueda.texto(search), paginacion
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Pagina<Movimiento> obtenerTodos(Paginacion paginacion) {
        return movimientoPersistence.listarTodos(paginacion);
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
        if (command.estado() != EstadoTransaccionMovimiento.REVERSED) {
            throw new IllegalArgumentException("Solo se permite reversar el movimiento.");
        }
        if ((command.cuentaId() != null && !original.cuentaId().equals(command.cuentaId()))
                || (command.fecha() != null && !original.fecha().equals(command.fecha()))
                || (command.tipoMovimiento() != null && original.tipoMovimiento() != command.tipoMovimiento())
                || (command.valor() != null && original.valor().compareTo(command.valor()) != 0)) {
            throw new IllegalArgumentException("Solo se puede modificar el estado del movimiento.");
        }
        EstadoCuentaMovimiento estadoCuenta = movimientoPersistence.obtenerEstadoCuentaBloqueando(
                original.cuentaId(), original.fecha().toLocalDate());
        BigDecimal saldoRevertido = revertirSaldoOriginal(original, estadoCuenta.saldoActual());
        movimientoPersistence.actualizarSaldoBloqueado(original.cuentaId(), saldoRevertido);
        return movimientoPersistence.actualizarEstado(movimientoId, EstadoTransaccionMovimiento.REVERSED);
    }

    @Override
    @Transactional
    public void eliminar(String movimientoId) {
        obtenerPorId(movimientoId);
        throw new IllegalArgumentException("Los movimientos solo se pueden reversar; no se pueden eliminar.");
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
