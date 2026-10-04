package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CuentaEntityJpaRepositoryTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("cuentas_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private CuentaJpaRepository cuentaJpaRepository;

    @Autowired
    private ClienteJpaRepository clienteJpaRepository;

    @Autowired
    private PersonaJpaRepository personaJpaRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldPersistCuentaWithItsOwnPrimaryKeyAndClienteForeignKey() {
        ClienteEntity clienteEntity = crearCliente();
        CuentaEntity cuentaEntity = cuentaJpaRepository.saveAndFlush(
                new CuentaEntity(clienteEntity, "AHORRO", new BigDecimal("1250.75"), "activa")
        );
        entityManager.clear();

        CuentaEntity persistida = cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow();

        assertThat(persistida.getId()).isNotNull();
        assertThat(persistida.getCliente().getId()).isEqualTo(clienteEntity.getId());
        assertThat(persistida.getTipoCuenta()).isEqualTo("AHORRO");
        assertThat(persistida.getSaldoInicial()).isEqualByComparingTo("1250.75");
        assertThat(primaryKeyColumn()).isEqualTo("id");
        assertThat(foreignKeyColumn()).isEqualTo("cliente_id");
    }

    @Test
    void shouldFindMultipleAccountsForTheirCliente() {
        ClienteEntity clienteEntity = crearCliente();
        cuentaJpaRepository.save(new CuentaEntity(clienteEntity, "AHORRO", new BigDecimal("100.00"), "activa"));
        cuentaJpaRepository.save(new CuentaEntity(clienteEntity, "CORRIENTE", new BigDecimal("250.50"), "activa"));
        cuentaJpaRepository.flush();
        entityManager.clear();

        var cuentas = cuentaJpaRepository.findAllByClienteEntity_Id(clienteEntity.getId());

        assertThat(cuentas).hasSize(2);
        assertThat(cuentas.get(0).getId()).isNotEqualTo(cuentas.get(1).getId());
        assertThat(cuentas).extracting(CuentaEntity::getTipoCuenta)
                .containsExactlyInAnyOrder("AHORRO", "CORRIENTE");
        assertThat(cuentas).extracting(CuentaEntity::getSaldoInicial)
                .containsExactlyInAnyOrder(new BigDecimal("100.00"), new BigDecimal("250.50"));
    }

    private ClienteEntity crearCliente() {
        PersonaEntity personaEntity = personaJpaRepository.save(new PersonaEntity(
                "Ana",
                "Femenino",
                28L,
                "123456",
                "Calle 1",
                "555-0100"
        ));
        return clienteJpaRepository.saveAndFlush(new ClienteEntity(personaEntity, "clave", "activo"));
    }

    private String primaryKeyColumn() {
        return jdbcTemplate.queryForObject("""
                select kcu.column_name
                from information_schema.key_column_usage kcu
                join information_schema.table_constraints tc
                  on tc.constraint_catalog = kcu.constraint_catalog
                 and tc.constraint_schema = kcu.constraint_schema
                 and tc.constraint_name = kcu.constraint_name
                where tc.constraint_type = 'PRIMARY KEY'
                  and tc.table_schema = current_schema()
                  and tc.table_name = 'cuentas'
                """, String.class);
    }

    private String foreignKeyColumn() {
        return jdbcTemplate.queryForObject("""
                select kcu.column_name
                from information_schema.key_column_usage kcu
                join information_schema.table_constraints tc
                  on tc.constraint_catalog = kcu.constraint_catalog
                 and tc.constraint_schema = kcu.constraint_schema
                 and tc.constraint_name = kcu.constraint_name
                where tc.constraint_type = 'FOREIGN KEY'
                  and tc.table_schema = current_schema()
                  and tc.table_name = 'cuentas'
                """, String.class);
    }
}
