package santacruz.jeremias.bancaExample.application.usecase;

import org.junit.jupiter.api.Test;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.MovimientoPersistencePort;
import santacruz.jeremias.bancaExample.domain.exception.LimiteExtraccionDiarioExcedidoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoOperativoException;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoOperativaException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoCorregibleException;
import santacruz.jeremias.bancaExample.domain.exception.SaldoInsuficienteException;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MovimientosServiceTest {

    private final MovimientoPersistencePort persistence = mock(MovimientoPersistencePort.class);
    private final CalcularSaldoUseCase saldo = mock(CalcularSaldoUseCase.class);
    private final CuentaPersistencePort cuenta = mock(CuentaPersistencePort.class);
    private final MovimientosService service = new MovimientosService(persistence, List.of(saldo), cuenta, new BigDecimal("1000.00"));

    @Test
    void shouldCreateMovimientoAndReturnGeneratedId() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), BigDecimal.ZERO));
        when(persistence.guardar(any(Movimiento.class))).thenAnswer(invocation -> {
            Movimiento movimiento = invocation.getArgument(0);
            return new Movimiento(
                    "42",
                    movimiento.cuentaId(),
                    movimiento.fecha(),
                    movimiento.tipoMovimiento(),
                    movimiento.valor(),
                    movimiento.estado()
            );
        });

        Movimiento creado = service.crearMovimiento(command());

        assertThat(creado.movimientoId()).isEqualTo("42");
        assertThat(creado.cuentaId()).isEqualTo("7");
        assertThat(creado.tipoMovimiento()).isEqualTo(TipoMovimiento.RETIRO);
        assertThat(creado.valor()).isEqualByComparingTo("125.50");
        verify(persistence).guardar(any(Movimiento.class));
        verify(persistence).obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate());
        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("374.50"));
    }

    @Test
    void shouldIncreaseStoredBalanceWhenCreatingAppliedCredit() {
        MovimientoCommand credito = new MovimientoCommand(
                "7", fecha(), TipoMovimiento.DEPOSITO, new BigDecimal("125.50"), EstadoTransaccionMovimiento.APPROVED
        );
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), BigDecimal.ZERO));
        when(persistence.guardar(any(Movimiento.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.crearMovimiento(credito);

        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("625.50"));
    }

    @Test
    void shouldRejectWithdrawalWhenBalanceIsInsufficient() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("100.00"), BigDecimal.ZERO));

        assertThatThrownBy(() -> service.crearMovimiento(command()))
                .isInstanceOf(SaldoInsuficienteException.class);

        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
        verify(persistence, never()).guardar(any(Movimiento.class));
    }

    @Test
    void shouldRejectWithdrawalWhenDailyLimitWouldBeExceeded() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("2000.00"), new BigDecimal("900.00")));

        assertThatThrownBy(() -> service.crearMovimiento(command()))
                .isInstanceOf(LimiteExtraccionDiarioExcedidoException.class);

        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
        verify(persistence, never()).guardar(any(Movimiento.class));
    }

    @Test
    void shouldRejectMovementForBlockedClienteWithoutUpdatingBalance() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(new EstadoCuentaMovimiento(
                        "9", new BigDecimal("500.00"), BigDecimal.ZERO, EstadoCuenta.ACTIVA, EstadoCliente.BLOQUEADO
                ));

        assertThatThrownBy(() -> service.crearMovimiento(command()))
                .isInstanceOf(ClienteNoOperativoException.class);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
        verify(persistence, never()).guardar(any(Movimiento.class));
    }

    @Test
    void shouldRejectMovementForBlockedCuentaWithoutUpdatingBalance() {
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(new EstadoCuentaMovimiento(
                        "9", new BigDecimal("500.00"), BigDecimal.ZERO, EstadoCuenta.BLOQUEADA, EstadoCliente.ACTIVO
                ));

        assertThatThrownBy(() -> service.crearMovimiento(command()))
                .isInstanceOf(CuentaNoOperativaException.class);
        verify(persistence, never()).actualizarSaldoBloqueado(any(), any());
        verify(persistence, never()).guardar(any(Movimiento.class));
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
    void shouldUpdateExistingMovimiento() {
        when(persistence.buscarPorIdBloqueando("42")).thenReturn(Optional.of(movimiento("42")));
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), new BigDecimal("125.50")));
        when(persistence.revertirYGuardarCorreccion(eq("42"), any(Movimiento.class)))
                .thenAnswer(invocation -> {
                    Movimiento correccion = invocation.getArgument(1);
                    return new Movimiento(
                            "43",
                            correccion.cuentaId(),
                            correccion.fecha(),
                            correccion.tipoMovimiento(),
                            correccion.valor(),
                            correccion.estado()
                    );
                });
        MovimientoCommand update = new MovimientoCommand(
                "7",
                fecha(),
                TipoMovimiento.DEPOSITO,
                new BigDecimal("200.00"),
                EstadoTransaccionMovimiento.APPROVED
        );

        Movimiento actualizado = service.actualizar("42", update);

        assertThat(actualizado.movimientoId()).isEqualTo("43");
        assertThat(actualizado.tipoMovimiento()).isEqualTo(TipoMovimiento.DEPOSITO);
        assertThat(actualizado.valor()).isEqualByComparingTo("200.00");
        assertThat(actualizado.estado()).isEqualTo(EstadoTransaccionMovimiento.REVERSED_CORRECTION);
        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("825.50"));
        verify(persistence).revertirYGuardarCorreccion(
                eq("42"),
                org.mockito.ArgumentMatchers.argThat(correccion ->
                        correccion.movimientoId() == null
                                && correccion.estado() == EstadoTransaccionMovimiento.REVERSED_CORRECTION
                                && correccion.tipoMovimiento() == TipoMovimiento.DEPOSITO
                                && correccion.valor().compareTo(new BigDecimal("200.00")) == 0)
        );
    }

    @Test
    void shouldNotUpdateWhenMovimientoDoesNotExist() {
        when(persistence.buscarPorIdBloqueando("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar("404", command()))
                .isInstanceOf(MovimientoNoEncontradoException.class);
        verify(persistence, never()).revertirYGuardarCorreccion(any(), any());
    }

    @Test
    void shouldReplaceOriginalWithdrawalInDailyLimitWhenCorrectingIt() {
        when(persistence.buscarPorIdBloqueando("42")).thenReturn(Optional.of(movimiento("42")));
        when(persistence.obtenerEstadoCuentaBloqueando("7", fecha().toLocalDate()))
                .thenReturn(estadoCuenta(new BigDecimal("500.00"), new BigDecimal("950.00")));
        when(persistence.revertirYGuardarCorreccion(eq("42"), any(Movimiento.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));
        MovimientoCommand correctedWithdrawal = new MovimientoCommand(
                "7",
                fecha(),
                TipoMovimiento.RETIRO,
                new BigDecimal("150.00"),
                EstadoTransaccionMovimiento.APPROVED
        );

        service.actualizar("42", correctedWithdrawal);

        verify(persistence).actualizarSaldoBloqueado("7", new BigDecimal("475.50"));
        verify(persistence).revertirYGuardarCorreccion(
                eq("42"),
                org.mockito.ArgumentMatchers.argThat(correccion ->
                        correccion.estado() == EstadoTransaccionMovimiento.REVERSED_CORRECTION)
        );
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
    void shouldDeleteExistingMovimiento() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(movimiento("42")));

        service.eliminar("42");

        verify(persistence).eliminarPorId("42");
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
