package santacruz.jeremias.bancaExample.application.usecase;

import org.junit.jupiter.api.Test;
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.port.out.ClientePersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.domain.exception.ClienteDuplicadoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Persona;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClienteEntityServiceTest {

    private final ClientePersistencePort clientePersistence = mock(ClientePersistencePort.class);
    private final CuentaPersistencePort cuentaPersistence = mock(CuentaPersistencePort.class);
    private final ClienteService service = new ClienteService(clientePersistence, cuentaPersistence);

    @Test
    void shouldCreateClienteWhenIdentificationIsAvailable() {
        when(clientePersistence.existePorIdentificacion("123456")).thenReturn(false);
        when(clientePersistence.guardar(any(Cliente.class))).thenAnswer(invocation -> {
            Cliente cliente = invocation.getArgument(0);
            return new Cliente(
                    "42",
                    new Persona(
                            cliente.nombre(),
                            cliente.genero(),
                            cliente.edad(),
                            cliente.identificacion(),
                            cliente.direccion(),
                            cliente.telefono()
                    ),
                    cliente.contrasena(),
                    cliente.estado()
            );
        });

        Cliente cliente = service.crear(command());

        assertThat(cliente.clienteId()).isEqualTo("42");
        assertThat(cliente.nombre()).isEqualTo("Ana");
        assertThat(cliente.identificacion()).isEqualTo("123456");
        verify(clientePersistence).guardar(any(Cliente.class));
    }

    @Test
    void shouldRejectDuplicateIdentification() {
        when(clientePersistence.existePorIdentificacion("123456")).thenReturn(true);

        assertThatThrownBy(() -> service.crear(command()))
                .isInstanceOf(ClienteDuplicadoException.class)
                .hasMessageContaining("123456");
    }

    @Test
    void shouldUpdateClienteAndAllowItsCurrentIdentification() {
        Cliente current = cliente("1", "123456");
        when(clientePersistence.buscarPorId("1")).thenReturn(java.util.Optional.of(current));
        when(clientePersistence.actualizar(any(Cliente.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cliente updated = service.actualizar("1", commandWithIdentification("123456"));

        assertThat(updated.clienteId()).isEqualTo("1");
        assertThat(updated.identificacion()).isEqualTo("123456");
        verify(clientePersistence).actualizar(any(Cliente.class));
        verify(clientePersistence, never()).existePorIdentificacion("123456");
    }

    @Test
    void shouldChangeOnlyClienteStatusWhenBlockingIt() {
        when(clientePersistence.buscarPorId("1")).thenReturn(java.util.Optional.of(cliente("1", "123456")));
        when(clientePersistence.actualizar(any(Cliente.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cliente bloqueado = service.actualizar("1", commandWithState("BLOQUEADO"));

        assertThat(bloqueado.estado()).isEqualTo(EstadoCliente.BLOQUEADO);
        verify(clientePersistence).actualizar(org.mockito.ArgumentMatchers.argThat(
                cliente -> cliente.estado() == EstadoCliente.BLOQUEADO
        ));
        verify(cuentaPersistence, never()).actualizarEstadoPorCliente("1", EstadoCuenta.INACTIVA);
    }

    @Test
    void shouldInactivateAllAccountsWhenClienteBecomesInactive() {
        when(clientePersistence.buscarPorId("1")).thenReturn(java.util.Optional.of(cliente("1", "123456")));
        when(clientePersistence.actualizar(any(Cliente.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.actualizar("1", commandWithState("INACTIVO"));

        verify(cuentaPersistence).actualizarEstadoPorCliente("1", EstadoCuenta.INACTIVA);
    }

    @Test
    void shouldRejectUpdateWhenAnotherClienteHasIdentification() {
        when(clientePersistence.buscarPorId("1")).thenReturn(java.util.Optional.of(cliente("1", "123456")));
        when(clientePersistence.existePorIdentificacion("654321")).thenReturn(true);

        assertThatThrownBy(() -> service.actualizar("1", commandWithIdentification("654321")))
                .isInstanceOf(ClienteDuplicadoException.class)
                .hasMessageContaining("654321");
        verify(clientePersistence, never()).actualizar(any(Cliente.class));
    }

    @Test
    void shouldReturnNotFoundWhenClienteDoesNotExist() {
        when(clientePersistence.buscarPorId("404")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.obtenerPorId("404"))
                .isInstanceOf(ClienteNoEncontradoException.class)
                .hasMessageContaining("404");
    }

    @Test
    void shouldListClientes() {
        when(clientePersistence.buscar(null, null, null)).thenReturn(java.util.List.of(cliente("1", "123456")));

        assertThat(service.buscar(null, null, null )).hasSize(1);
        verify(clientePersistence).buscar(null, null, null);
    }

    @Test
    void shouldDeleteExistingCliente() {
        when(clientePersistence.buscarPorId("1")).thenReturn(java.util.Optional.of(cliente("1", "123456")));

        service.eliminar("1");

        verify(clientePersistence).actualizar(org.mockito.ArgumentMatchers.argThat(
                cliente -> cliente.estado() == EstadoCliente.INACTIVO
        ));
        verify(clientePersistence, never()).eliminarPorId("1");
        verify(cuentaPersistence).actualizarEstadoPorCliente("1", EstadoCuenta.INACTIVA);
    }

    private ClienteCommand command() {
        return new ClienteCommand(
                "clave",
                "activo",
                "Ana",
                "Femenino",
                28L,
                "123456",
                "Calle 1",
                "555-0100"
        );
    }

    private ClienteCommand commandWithIdentification(String identification) {
        return new ClienteCommand("clave", "activo", "Ana", "Femenino", 28L, identification, "Calle 1", "555-0100");
    }

    private ClienteCommand commandWithState(String estado) {
        return new ClienteCommand(estado, estado, "Ana", "Femenino", 28L, "123456", "Calle 1", "555-0100");
    }

    private Cliente cliente(String id, String identification) {
        return new Cliente(
                id,
                new Persona("Ana", "Femenino", 28L, identification, "Calle 1", "555-0100"),
                "clave",
                EstadoCliente.ACTIVO
        );
    }
}
