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
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.MovimientoEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class MovimientoEntityJpaRepositoryTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("movimientos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MovimientoJpaRepository movimientoJpaRepository;

    @Autowired
    private CuentaJpaRepository cuentaJpaRepository;

    @Autowired
    private ClienteJpaRepository clienteJpaRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldPersistMovimientoWithOwnPrimaryKeyAndCuentaForeignKey() {
        CuentaEntity cuentaEntity = crearCuenta();
        LocalDateTime fecha = LocalDateTime.of(2026, 10, 2, 12, 30);
        MovimientoEntity movimientoEntity = movimientoJpaRepository.saveAndFlush(
                new MovimientoEntity(
                        cuentaEntity, fecha, TipoMovimiento.RETIRO, new BigDecimal("125.50"),
                        EstadoTransaccionMovimiento.APPROVED
                )
        );
        entityManager.clear();

        MovimientoEntity persisted = movimientoJpaRepository.findById(movimientoEntity.getId()).orElseThrow();

        assertThat(persisted.getId()).isNotNull();
        assertThat(persisted.getCuenta().getId()).isEqualTo(cuentaEntity.getId());
        assertThat(persisted.getFecha()).isEqualTo(fecha);
        assertThat(persisted.getTipoMovimiento()).isEqualTo(TipoMovimiento.RETIRO);
        assertThat(persisted.getValor()).isEqualByComparingTo("125.50");
        assertThat(jdbcTemplate.queryForObject(
                "select tipo_movimiento from movimientos where id = ?",
                String.class,
                movimientoEntity.getId()
        )).isEqualTo("RETIRO");
        assertThat(primaryKeyColumn()).isEqualTo("id");
        assertThat(foreignKeyColumn()).isEqualTo("cuenta_id");
    }

    @Test
    void shouldFindMovimientosByCuenta() {
        CuentaEntity cuentaEntity = crearCuenta();
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, LocalDateTime.of(2026, 10, 2, 10, 0), TipoMovimiento.DEPOSITO,
                new BigDecimal("200.00"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, LocalDateTime.of(2026, 10, 2, 11, 0), TipoMovimiento.RETIRO,
                new BigDecimal("50.00"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.flush();
        entityManager.clear();

        var movimientos = movimientoJpaRepository.findAllByCuentaEntity_Id(cuentaEntity.getId());

        assertThat(movimientos).hasSize(2);
        assertThat(movimientos).extracting(MovimientoEntity::getTipoMovimiento)
                .containsExactlyInAnyOrder(TipoMovimiento.DEPOSITO, TipoMovimiento.RETIRO);
        assertThat(movimientos).extracting(MovimientoEntity::getValor)
                .containsExactlyInAnyOrder(new BigDecimal("200.00"), new BigDecimal("50.00"));
    }

    @Test
    void shouldSumAppliedDebitMovementsForAccountAndDateOnly() {
        CuentaEntity cuentaEntity = crearCuenta();
        LocalDate fecha = LocalDate.of(2026, 10, 2);
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(0, 0), TipoMovimiento.RETIRO,
                new BigDecimal("50.00"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(23, 59), TipoMovimiento.RETIRO,
                new BigDecimal("25.50"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(12, 0), TipoMovimiento.DEPOSITO,
                new BigDecimal("300.00"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(13, 0), TipoMovimiento.RETIRO,
                new BigDecimal("90.00"), EstadoTransaccionMovimiento.REJECTED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(14, 0), TipoMovimiento.RETIRO,
                new BigDecimal("20.00"), EstadoTransaccionMovimiento.REVERSED
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.atTime(15, 0), TipoMovimiento.RETIRO,
                new BigDecimal("15.00"), EstadoTransaccionMovimiento.REVERSED_CORRECTION
        ));
        movimientoJpaRepository.save(new MovimientoEntity(
                cuentaEntity, fecha.plusDays(1).atStartOfDay(), TipoMovimiento.RETIRO,
                new BigDecimal("70.00"), EstadoTransaccionMovimiento.APPROVED
        ));
        movimientoJpaRepository.flush();
        entityManager.clear();

        BigDecimal total = movimientoJpaRepository.sumarExtraccionesAplicadas(
                cuentaEntity.getId(),
                fecha.atStartOfDay(),
                fecha.plusDays(1).atStartOfDay(),
                TipoMovimiento.RETIRO,
                java.util.List.of(
                        EstadoTransaccionMovimiento.APPROVED,
                        EstadoTransaccionMovimiento.REVERSED_CORRECTION
                )
        );

        assertThat(total).isEqualByComparingTo("90.50");
    }

    private CuentaEntity crearCuenta() {
        ClienteEntity clienteEntity = clienteJpaRepository.saveAndFlush(new ClienteEntity(
                new PersonaEntity("Ana", "Femenino", 28L, "movimiento-" + System.nanoTime(), "Calle 1", "555-0100"),
                "clave",
                "activo"
        ));
        return cuentaJpaRepository.saveAndFlush(
                new CuentaEntity(clienteEntity, "AHORRO", new BigDecimal("1000.00"), "activa")
        );
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
                  and tc.table_name = 'movimientos'
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
                  and tc.table_name = 'movimientos'
                """, String.class);
    }
}
