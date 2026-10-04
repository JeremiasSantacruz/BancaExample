package santacruz.jeremias.bancaExample.application.usecase;

import org.junit.jupiter.api.Test;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoEncontradaException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoOperativoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.Persona;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CuentaEntityServiceTest {

    private final CuentaPersistencePort persistence = mock(CuentaPersistencePort.class);
    private final ClienteService clienteService = mock(ClienteService.class);
    private final CuentaService service = new CuentaService(persistence, clienteService);

    @Test
    void shouldCreateCuentaAndReturnGeneratedId() {
        when(clienteService.obtenerPorId("7")).thenReturn(cliente(EstadoCliente.ACTIVO));
        when(persistence.guardar(any(Cuenta.class))).thenAnswer(invocation -> {
            Cuenta cuenta = invocation.getArgument(0);
            return new Cuenta("42", cuenta.clienteId(), cuenta.tipoCuenta(), cuenta.saldo(), cuenta.estado());
        });

        Cuenta creada = service.crear(command());

        assertThat(creada.cuentaId()).isEqualTo("42");
        assertThat(creada.clienteId()).isEqualTo("7");
        assertThat(creada.tipoCuenta()).isEqualTo("AHORRO");
        assertThat(creada.saldo()).isEqualByComparingTo("1250.75");
        verify(persistence).guardar(any(Cuenta.class));
    }

    @Test
    void shouldNotCreateCuentaForBlockedCliente() {
        when(clienteService.obtenerPorId("7")).thenReturn(cliente(EstadoCliente.BLOQUEADO));

        assertThatThrownBy(() -> service.crear(command()))
                .isInstanceOf(ClienteNoOperativoException.class);

        verify(persistence, never()).guardar(any(Cuenta.class));
    }

    @Test
    void shouldReturnAllCuentas() {
        when(persistence.listarTodas()).thenReturn(List.of(cuenta("42"), cuenta("43")));

        assertThat(service.obtenerTodas()).extracting(Cuenta::cuentaId).containsExactly("42", "43");
        verify(persistence).listarTodas();
    }

    @Test
    void shouldGetCuentaById() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(cuenta("42")));

        assertThat(service.obtenerPorId("42")).isEqualTo(cuenta("42"));
        verify(persistence).buscarPorId("42");
    }

    @Test
    void shouldThrowWhenCuentaDoesNotExist() {
        when(persistence.buscarPorId("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtenerPorId("404"))
                .isInstanceOf(CuentaNoEncontradaException.class)
                .hasMessageContaining("404");
    }

    @Test
    void shouldUpdateExistingCuenta() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(cuenta("42")));
        when(persistence.actualizar(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CuentaCommand update = new CuentaCommand("7", "CORRIENTE", new BigDecimal("2000.00"), "inactiva");

        Cuenta actualizada = service.actualizar("42", update);

        assertThat(actualizada.cuentaId()).isEqualTo("42");
        assertThat(actualizada.tipoCuenta()).isEqualTo("CORRIENTE");
        assertThat(actualizada.saldo()).isEqualByComparingTo("2000.00");
        assertThat(actualizada.estado()).isEqualTo(EstadoCuenta.INACTIVA);
        verify(persistence).actualizar(any(Cuenta.class));
    }

    @Test
    void shouldChangeCuentaWithoutChangingClienteStatus() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(cuenta("42")));
        when(persistence.actualizar(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CuentaCommand update = new CuentaCommand("7", "AHORRO", new BigDecimal("1250.75"), "bloqueada");

        Cuenta actualizada = service.actualizar("42", update);

        assertThat(actualizada.estado()).isEqualTo(EstadoCuenta.BLOQUEADA);
        verify(clienteService, never()).obtenerPorId("7");
    }

    @Test
    void shouldNotUpdateWhenCuentaDoesNotExist() {
        when(persistence.buscarPorId("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar("404", command()))
                .isInstanceOf(CuentaNoEncontradaException.class);
        verify(persistence, never()).actualizar(any(Cuenta.class));
    }

    @Test
    void shouldDeleteExistingCuenta() {
        when(persistence.buscarPorId("42")).thenReturn(Optional.of(cuenta("42")));
        when(persistence.actualizar(any(Cuenta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.eliminar("42");

        verify(persistence).actualizar(org.mockito.ArgumentMatchers.argThat(
                cuenta -> cuenta.estado() == EstadoCuenta.CERRADA
        ));
        verify(persistence, never()).eliminarPorId("42");
    }

    @Test
    void shouldNotDeleteWhenCuentaDoesNotExist() {
        when(persistence.buscarPorId("404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.eliminar("404"))
                .isInstanceOf(CuentaNoEncontradaException.class);
        verify(persistence, never()).eliminarPorId("404");
    }

    private CuentaCommand command() {
        return new CuentaCommand("7", "AHORRO", new BigDecimal("1250.75"), "activa");
    }

    private Cuenta cuenta(String id) {
        return new Cuenta(id, "7", "AHORRO", new BigDecimal("1250.75"), EstadoCuenta.ACTIVA);
    }

    private Cliente cliente(EstadoCliente estado) {
        return new Cliente(
                "7",
                new Persona("Ana", "Femenino", 28L, "123", "Calle 1", "555-0100"),
                "clave",
                estado
        );
    }
}
