package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Persona;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(ClienteRepositoryAdapter.class)
class ClienteEntityRepositoryAdapterTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private ClienteJpaRepository clienteJpaRepository;

    @Autowired
    private PersonaJpaRepository personaJpaRepository;

    @Autowired
    private ClienteRepositoryAdapter adapter;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldPersistClienteWithSeparateGeneratedIdentifiers() {
        personaJpaRepository.saveAndFlush(new PersonaEntity(
                "Persona independiente", "Femenino", 40L, "999999", "Calle 9", "555-9999"
        ));
        Cliente saved = adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));

        assertThat(saved.clienteId()).isNotBlank();
        assertThat(saved.nombre()).isEqualTo("Ana");
        assertThat(saved.contrasena()).isEqualTo("clave");
        assertThat(saved.estado()).isEqualTo(EstadoCliente.ACTIVO);

        entityManager.flush();
        entityManager.clear();
        var persisted = clienteJpaRepository.findById(Long.valueOf(saved.clienteId())).orElseThrow();

        assertThat(persisted.getPersona().getNombre()).isEqualTo("Ana");
        assertThat(persisted.getPersona().getIdentificacion()).isEqualTo("123456");
        assertThat(persisted.getId()).isNotEqualTo(persisted.getPersona().getId());
    }

    @Test
    void shouldHavePrimaryKeysOnPersonaAndClienteTables() {
        personaJpaRepository.saveAndFlush(new PersonaEntity(
                "Persona independiente", "Femenino", 40L, "999999", "Calle 9", "555-9999"
        ));
        Cliente saved = adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));
        entityManager.flush();

        assertThat(primaryKeyColumn("personas")).isEqualTo("id");
        assertThat(primaryKeyColumn("clientes")).isEqualTo("id");
        assertThat(foreignKeyColumn("clientes")).isEqualTo("persona_id");
        assertThat(saved.clienteId()).isNotBlank();

        entityManager.clear();
        var persisted = clienteJpaRepository.findById(Long.valueOf(saved.clienteId())).orElseThrow();
        assertThat(persisted.getId()).isNotEqualTo(persisted.getPersona().getId());
    }

    @Test
    void shouldCheckWhetherIdentificationExists() {
        adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));

        assertThat(adapter.existePorIdentificacion("123456")).isTrue();
        assertThat(adapter.existePorIdentificacion("654321")).isFalse();
    }

    @Test
    void shouldFindClienteById() {
        Cliente saved = adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));
        entityManager.flush();
        entityManager.clear();

        var found = adapter.buscarPorId(saved.clienteId());

        assertThat(found).isPresent();
        assertThat(found.orElseThrow().nombre()).isEqualTo("Ana");
        assertThat(found.orElseThrow().identificacion()).isEqualTo("123456");
    }

    @Test
    void shouldListAllClientes() {
        adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));
        adapter.guardar(cliente(null, "654321", "Luis", "clave-2", "activo"));
        entityManager.flush();
        entityManager.clear();

        var clientes = adapter.listarTodos();

        assertThat(clientes).hasSize(2);
        assertThat(clientes).extracting(Cliente::clienteId).doesNotContainNull();
        assertThat(clientes).extracting(Cliente::nombre)
                .containsExactlyInAnyOrder("Ana", "Luis");
    }

    @Test
    void shouldUpdateClienteAndInheritedPersonaFields() {
        Cliente saved = adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));
        entityManager.flush();
        entityManager.clear();

        Cliente updated = adapter.actualizar(
                cliente(saved.clienteId(), "654321", "Ana Ruiz", "nueva-clave", "inactivo")
        );

        assertThat(updated.clienteId()).isEqualTo(saved.clienteId());
        assertThat(updated.nombre()).isEqualTo("Ana Ruiz");
        assertThat(updated.identificacion()).isEqualTo("654321");
        assertThat(updated.contrasena()).isEqualTo("nueva-clave");
        assertThat(updated.estado()).isEqualTo(EstadoCliente.INACTIVO);

        entityManager.flush();
        entityManager.clear();
        var persisted = clienteJpaRepository.findById(Long.valueOf(saved.clienteId())).orElseThrow();
        assertThat(persisted.getPersona().getNombre()).isEqualTo("Ana Ruiz");
        assertThat(persisted.getPersona().getIdentificacion()).isEqualTo("654321");
        assertThat(persisted.getContrasena()).isEqualTo("nueva-clave");
        assertThat(persisted.getEstado()).isEqualTo("inactivo");
    }

    @Test
    void shouldDeleteClienteAndItsPersonaRow() {
        Cliente saved = adapter.guardar(cliente(null, "123456", "Ana", "clave", "activo"));
        entityManager.flush();
        var persisted = clienteJpaRepository.findById(Long.valueOf(saved.clienteId())).orElseThrow();
        Long personaId = persisted.getPersona().getId();
        entityManager.clear();

        adapter.eliminarPorId(saved.clienteId());
        entityManager.flush();
        entityManager.clear();

        assertThat(clienteJpaRepository.findById(Long.valueOf(saved.clienteId()))).isEmpty();
        Object remainingPersonaRows = entityManager.createNativeQuery(
                        "select count(*) from personas where id = :id"
                )
                        .setParameter("id", personaId)
                .getSingleResult();
        assertThat(((Number) remainingPersonaRows).longValue()).isZero();
    }

    private Cliente cliente(
            String id,
            String identificacion,
            String nombre,
            String contrasena,
            String estado
    ) {
        return new Cliente(
                id,
                new Persona(nombre, "Femenino", 28L, identificacion, "Calle 1", "555-0100"),
                contrasena,
                EstadoCliente.from(estado)
        );
    }

    private String primaryKeyColumn(String tableName) {
        return jdbcTemplate.queryForObject("""
                select kcu.column_name
                from information_schema.key_column_usage kcu
                join information_schema.table_constraints tc
                  on tc.constraint_catalog = kcu.constraint_catalog
                 and tc.constraint_schema = kcu.constraint_schema
                 and tc.constraint_name = kcu.constraint_name
                where tc.constraint_type = 'PRIMARY KEY'
                  and tc.table_schema = current_schema()
                  and tc.table_name = ?
                """, String.class, tableName);
    }

    private String foreignKeyColumn(String tableName) {
        return jdbcTemplate.queryForObject("""
                select kcu.column_name
                from information_schema.key_column_usage kcu
                join information_schema.table_constraints tc
                  on tc.constraint_catalog = kcu.constraint_catalog
                 and tc.constraint_schema = kcu.constraint_schema
                 and tc.constraint_name = kcu.constraint_name
                where tc.constraint_type = 'FOREIGN KEY'
                  and tc.table_schema = current_schema()
                  and tc.table_name = ?
                """, String.class, tableName);
    }
}
