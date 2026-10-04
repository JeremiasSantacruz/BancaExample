package santacruz.jeremias.bancaExample.application.usecase;

import org.junit.jupiter.api.Test;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.MovimientoPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoCorregibleException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.EstadoCuentaMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MovimientosServiceTest {

    private final MovimientoPersistencePort persistence = mock(MovimientoPersistencePort.class);
    private final CalcularSaldoUseCase saldo = new santacruz.jeremias.bancaExample.application.usecase.calcularSaldos.SaldoAhorroUseCase();
    private final CuentaPersistencePort cuenta = mock(CuentaPersistencePort.class);
    private final MovimientosService service = new MovimientosService(persistence, List.of(saldo), cuenta, new BigDecimal("1000.00"));

    @org.junit.jupiter.api.BeforeEach
    void prepararPersistencia() {
        when(cuenta.buscarPorId("7")).thenReturn(Optional.of(new santacruz.jeremias.bancaExample.domain.model.Cuenta(
                "7", "9", santacruz.jeremias.bancaExample.domain.enums.TipoCuenta.AHORRO,
                new BigDecimal("500"), EstadoCuenta.ACTIVA)));
        when(persistence.obtenerSaldoExtraccionesDiarias("7", fecha().toLocalDate())).thenReturn(BigDecimal.ZERO);
        when(persistence.guardar(any())).thenAnswer(invocation -> {
            Movimiento m = invocation.getArgument(0);
            return new Movimiento("42", m.cuentaId(), m.fecha(), m.tipoMovimiento(), m.valor(), m.estado());
        });
    }
    @Test
    void shouldCreateMovimientoAndReturnGeneratedId() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), BigDecimal.ZERO));
        Movimiento creado = service.crearMovimiento(command());
        assertThat(creado.movimientoId()).isEqualTo("42");
        assertThat(creado.estado()).isEqualTo(EstadoTransaccionMovimiento.APPROVED);
        assertThat(creado.valor()).isEqualByComparingTo("125.50");
        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("374.50"));
    }
    @Test
    void shouldIncreaseStoredBalanceWhenCreatingAppliedCredit() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), BigDecimal.ZERO));
        Movimiento creado = service.crearMovimiento(new MovimientoCommand("7", fecha(), TipoMovimiento.DEPOSITO,
                new BigDecimal("125.50"), EstadoTransaccionMovimiento.APPROVED));
        assertThat(creado.estado()).isEqualTo(EstadoTransaccionMovimiento.APPROVED);
        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("625.50"));
    }
    @Test
    void shouldRecordRejectedWithdrawalWhenBalanceIsInsufficient() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("100.00"), BigDecimal.ZERO));
        assertThat(service.crearMovimiento(command()).estado()).isEqualTo(EstadoTransaccionMovimiento.REJECTED);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
    }
    @Test
    void shouldRecordRejectedWithdrawalWhenDailyLimitWouldBeExceeded() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("2000"), new BigDecimal("900")));
        when(persistence.obtenerSaldoExtraccionesDiarias("7", fecha().toLocalDate())).thenReturn(new BigDecimal("900"));
        assertThat(service.crearMovimiento(command()).estado()).isEqualTo(EstadoTransaccionMovimiento.REJECTED);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
    }
    @Test
    void shouldRecordRejectedMovementForBlockedClienteWithoutUpdatingBalance() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate())).thenReturn(
                new EstadoCuentaMovimiento("9", new BigDecimal("500"), BigDecimal.ZERO, EstadoCuenta.ACTIVA, EstadoCliente.BLOQUEADO));
        assertThat(service.crearMovimiento(command()).estado()).isEqualTo(EstadoTransaccionMovimiento.REJECTED);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
    }
    @Test
    void shouldRecordRejectedMovementForBlockedCuentaWithoutUpdatingBalance() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate())).thenReturn(
                new EstadoCuentaMovimiento("9", new BigDecimal("500"), BigDecimal.ZERO, EstadoCuenta.BLOQUEADA, EstadoCliente.ACTIVO));
        assertThat(service.crearMovimiento(command()).estado()).isEqualTo(EstadoTransaccionMovimiento.REJECTED);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
    }

    @Test
    void shouldReturnAllMovimientos() {
        when(persistence.listarTodos()).thenReturn(List.of(movimiento("42"), movimiento("43")));

        assertThat(service.obtenerTodos()).extracting(Movimiento::movimientoId).containsExactly("42", "43");
        verify(persistence).listarTodos();
    }

    @Test
    void shouldReturnDailyWithdrawalBalanceForAccountAndDate() {
        LocalDate fecha = LocalDate.of(2026, 10, 2);
        when(persistence.obtenerSaldoExtraccionesDiarias("7", fecha)).thenReturn(new BigDecimal("175.50"));

        assertThat(service.obtenerSaldoExtraccionesDiarias("7", fecha)).isEqualByComparingTo("175.50");
        verify(persistence).obtenerSaldoExtraccionesDiarias("7", fecha);
    }

    @Test
    void shouldGetMovimientoById() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(movimiento("42")));

        assertThat(service.obtenerPorId("42")).isEqualTo(movimiento("42"));
        verify(persistence).buscarPorId("42");
    }

    @Test
    void shouldThrowWhenMovimientoDoesNotExist() {
        when(persistence.buscarPorId("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtenerPorId("404"))
                .isInstanceOf(MovimientoNoEncontradoException.class)
                .hasMessageContaining("404");
    }

    @Test
    void shouldReverseExistingMovimientoWithoutCreatingCorrection() {
        when(persistence.buscarPorIdBloqueando("42")).thenReturn(Optional.of(movimiento("42")));
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), new BigDecimal("125.50")));
        Movimiento reversed = new Movimiento("42", "7", fecha(), TipoMovimiento.RETIRO,
                new BigDecimal("125.50"), EstadoTransaccionMovimiento.REVERSED);
        when(persistence.actualizarEstado("42", EstadoTransaccionMovimiento.REVERSED)).thenReturn(reversed);

        assertThat(service.actualizar("42", new MovimientoCommand(null, null, null, null,
                EstadoTransaccionMovimiento.REVERSED))).isEqualTo(reversed);
        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("625.50"));
        verify(persistence, never()).revertirYGuardarCorreccion(any(), any());
    }

    @Test
    void shouldNotUpdateWhenMovimientoDoesNotExist() {
        when(persistence.buscarPorIdBloqueando("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar("404", command()))
                .isInstanceOf(MovimientoNoEncontradoException.class);
        verify(persistence, never()).revertirYGuardarCorreccion(any(), any());
    }

    @Test
    void shouldRejectChangesToMovementAmount() {
        when(persistence.buscarPorIdBloqueando("42")).thenReturn(Optional.of(movimiento("42")));
        MovimientoCommand update = new MovimientoCommand("7", fecha(), TipoMovimiento.RETIRO,
                new BigDecimal("150.00"), EstadoTransaccionMovimiento.REVERSED);
        assertThatThrownBy(() -> service.actualizar("42", update)).isInstanceOf(IllegalArgumentException.class);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
    }

    @Test
    void shouldNotCorrectMovementThatIsNotApplied() {
        Movimiento reversed = new Movimiento(
                "42", "7", fecha(), TipoMovimiento.RETIRO, new BigDecimal("125.50"),
                EstadoTransaccionMovimiento.REVERSED
        );
        when(persistence.buscarPorIdBloqueando("42")).thenReturn(Optional.of(reversed));

        assertThatThrownBy(() -> service.actualizar("42", command()))
                .isInstanceOf(MovimientoNoCorregibleException.class);
        verify(persistence, never()).obtenerEstadoCuentaBloqueando(any(), any());
        verify(persistence, never()).revertirYGuardarCorreccion(any(), any());
    }

    @Test
    void shouldRejectDeletingExistingMovimiento() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(movimiento("42")));
        assertThatThrownBy(() -> service.eliminar("42")).isInstanceOf(IllegalArgumentException.class);
        verify(persistence, never()).eliminarPorId(any());
    }

    @Test
    void shouldNotDeleteWhenMovimientoDoesNotExist() {
        when(persistence.buscarPorId("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.eliminar("404"))
                .isInstanceOf(MovimientoNoEncontradoException.class);
        verify(persistence, never()).eliminarPorId("404");
    }

    private MovimientoCommand command() {
        return new MovimientoCommand(
                "7", fecha(), TipoMovimiento.RETIRO, new BigDecimal("125.50"), EstadoTransaccionMovimiento.APPROVED
        );
    }

    private Movimiento movimiento(String id) {
        return new Movimiento(
                id, "7", fecha(), TipoMovimiento.RETIRO, new BigDecimal("125.50"),
                EstadoTransaccionMovimiento.APPROVED
        );
    }

    private EstadoCuentaMovimiento estadoCuenta(BigDecimal saldo, BigDecimal extracciones) {
        return new EstadoCuentaMovimiento("9", saldo, extracciones, EstadoCuenta.ACTIVA, EstadoCliente.ACTIVO);
    }

    private LocalDateTime fecha() {
        return LocalDateTime.of(2026, 10, 2, 12, 30);
    }
}
