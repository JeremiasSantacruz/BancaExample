package santacruz.jeremias.bancaExample.application.usecase;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.port.in.ClienteUseCase;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.ClienteDuplicadoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create")
@Testcontainers
@Transactional
class ClienteEntityUseCaseIntegrationTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("clientes_use_case_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private ClienteUseCase clienteUseCase;

    @Autowired
    private CuentaUseCase cuentaUseCase;

    @Test
    void shouldCreateAndRetrieveCliente() {
        Cliente creado = clienteUseCase.crear(command("Ana", "123456"));

        assertThat(creado.clienteId()).isNotBlank();
        assertThat(creado.nombre()).isEqualTo("Ana");
        assertThat(creado.identificacion()).isEqualTo("123456");
        assertThat(creado.estado()).isEqualTo(EstadoCliente.ACTIVO);

        Cliente encontrado = clienteUseCase.obtenerPorId(creado.clienteId());
        assertThat(encontrado.clienteId()).isEqualTo(creado.clienteId());
        assertThat(encontrado.nombre()).isEqualTo("Ana");
        assertThat(encontrado.contrasena()).isEqualTo("clave");
    }

    @Test
    void shouldRejectClienteWithDuplicateIdentification() {
        clienteUseCase.crear(command("Ana", "123456"));

        assertThatThrownBy(() -> clienteUseCase.crear(command("Luis", "123456")))
                .isInstanceOf(ClienteDuplicadoException.class)
                .hasMessageContaining("123456");
    }

    @Test
    void shouldListCreatedClientes() {
        clienteUseCase.crear(command("Ana", "123456"));
        clienteUseCase.crear(command("Luis", "654321"));

        assertThat(clienteUseCase.buscar(null, null, null))
                .extracting(Cliente::nombre)
                .containsExactlyInAnyOrder("Ana", "Luis");
    }

    @Test
    void shouldUpdateClienteAndKeepItsIdentifier() {
        Cliente creado = clienteUseCase.crear(command("Ana", "123456"));
        ClienteCommand actualizacion = new ClienteCommand(
                "nueva-clave",
                "inactivo",
                "Ana Ruiz",
                "Femenino",
                29L,
                "654321",
                "Calle 2",
                "555-0200"
        );

        Cliente actualizado = clienteUseCase.actualizar(creado.clienteId(), actualizacion);

        assertThat(actualizado.clienteId()).isEqualTo(creado.clienteId());
        assertThat(actualizado.nombre()).isEqualTo("Ana Ruiz");
        assertThat(actualizado.identificacion()).isEqualTo("654321");
        assertThat(actualizado.contrasena()).isEqualTo("nueva-clave");
        assertThat(actualizado.estado()).isEqualTo(EstadoCliente.INACTIVO);
        assertThat(clienteUseCase.obtenerPorId(creado.clienteId()).nombre()).isEqualTo("Ana Ruiz");
    }

    @Test
    void shouldRejectUpdateUsingAnotherClientesIdentification() {
        Cliente ana = clienteUseCase.crear(command("Ana", "123456"));
        clienteUseCase.crear(command("Luis", "654321"));

        assertThatThrownBy(() -> clienteUseCase.actualizar(ana.clienteId(), command("Ana Ruiz", "654321")))
                .isInstanceOf(ClienteDuplicadoException.class)
                .hasMessageContaining("654321");

        assertThat(clienteUseCase.obtenerPorId(ana.clienteId()).identificacion()).isEqualTo("123456");
    }

    @Test
    void shouldDeleteCliente() {
        Cliente creado = clienteUseCase.crear(command("Ana", "123456"));

        clienteUseCase.eliminar(creado.clienteId());

        Cliente inactivo = clienteUseCase.obtenerPorId(creado.clienteId());
        assertThat(inactivo.estado()).isEqualTo(EstadoCliente.INACTIVO);
        assertThat(clienteUseCase.buscar(null, null, null)).extracting(Cliente::clienteId)
                .containsExactly(creado.clienteId());
    }

    @Test
    void shouldInactivateAllClienteAccountsWhenClienteBecomesInactive() {
        Cliente creado = clienteUseCase.crear(command("Ana", "123456"));
        var ahorro = cuentaUseCase.crear(new CreateCuentaCommand(
                creado.clienteId(), TipoCuenta.AHORRO.name()
        ));
        var corriente = cuentaUseCase.crear(new CreateCuentaCommand(
                creado.clienteId(), TipoCuenta.CORRIENTE.name()
        ));

        clienteUseCase.actualizar(creado.clienteId(), commandWithState("inactivo", "Ana", "123456"));

        assertThat(cuentaUseCase.obtenerPorId(ahorro.cuentaId()).estado()).isEqualTo(EstadoCuenta.INACTIVA);
        assertThat(cuentaUseCase.obtenerPorId(corriente.cuentaId()).estado()).isEqualTo(EstadoCuenta.INACTIVA);
        assertThat(clienteUseCase.obtenerPorId(creado.clienteId()).estado()).isEqualTo(EstadoCliente.INACTIVO);
    }

    @Test
    void shouldReportNotFoundForReadUpdateAndDelete() {
        String missingId = "999999";

        assertThatThrownBy(() -> clienteUseCase.obtenerPorId(missingId))
                .isInstanceOf(ClienteNoEncontradoException.class);
        assertThatThrownBy(() -> clienteUseCase.actualizar(missingId, command("Ana", "123456")))
                .isInstanceOf(ClienteNoEncontradoException.class);
        assertThatThrownBy(() -> clienteUseCase.eliminar(missingId))
                .isInstanceOf(ClienteNoEncontradoException.class);
    }

    private ClienteCommand command(String nombre, String identificacion) {
        return new ClienteCommand(
                "clave",
                "activo",
                nombre,
                "Femenino",
                28L,
                identificacion,
                "Calle 1",
                "555-0100"
        );
    }

    private ClienteCommand commandWithState(String estado, String nombre, String identificacion) {
        return new ClienteCommand(
                "clave",
                estado,
                nombre,
                "Femenino",
                28L,
                identificacion,
                "Calle 1",
                "555-0100"
        );
    }
}
