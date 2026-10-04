package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.MovimientoEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.ClienteJpaRepository;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.CuentaJpaRepository;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.MovimientoJpaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create")
@AutoConfigureMockMvc
@Transactional
@Testcontainers
class BusquedaIntegrationTest {
    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mvc;
    @Autowired private ClienteJpaRepository clientes;
    @Autowired private CuentaJpaRepository cuentas;
    @Autowired private MovimientoJpaRepository movimientos;

    @Test
    void combinesClientFiltersAndSupportsPartialCaseInsensitiveNames() throws Exception {
        cliente("Ana Perez", "123456", "activo");
        cliente("Ana Lopez", "987654", "bloqueado");
        mvc.perform(get("/clientes/buscar").param("nombre", "  ana  ")
                        .param("identificacion", "234").param("estado", "activo"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Ana Perez"));
        mvc.perform(get("/clientes/buscar").param("nombre", "missing"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/clientes/buscar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void combinesAccountClientTypeAndState() throws Exception {
        var ana = cliente("Ana", "1", "activo");
        var juan = cliente("Juan", "2", "activo");
        cuenta(ana, "AHORRO", "activa");
        cuenta(ana, "CORRIENTE", "activa");
        cuenta(ana, "AHORRO", "cerrada");
        cuenta(juan, "AHORRO", "activa");
        mvc.perform(get("/cuentas/buscar").param("clienteId", ana.getId().toString())
                        .param("tipoCuenta", "ahorro").param("estado", "activa"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/cuentas/buscar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        mvc.perform(get("/cuentas/buscar").param("clienteId", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/cuentas/buscar").param("tipoCuenta", "bad"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void includesBothReportDaysAndCombinesAnExactAccountId() throws Exception {
        var ana = cliente("Ana", "1", "activo");
        var cuenta = cuenta(ana, "AHORRO", "activa");
        var otra = cuenta(ana, "CORRIENTE", "activa");
        movimiento(cuenta, "2026-10-02T23:59:59");
        movimiento(cuenta, "2026-10-03T00:00:00");
        movimiento(cuenta, "2026-10-04T23:59:59.999");
        movimiento(cuenta, "2026-10-05T00:00:00");
        movimiento(otra, "2026-10-03T12:00:00");
        mvc.perform(get("/movimientos/buscar").param("cuentaId", cuenta.getId().toString())
                        .param("inicio", "2026-10-03").param("fin", "2026-10-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/movimientos/buscar").param("cuentaId", cuenta.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        mvc.perform(get("/movimientos/buscar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
        mvc.perform(get("/movimientos/buscar").param("fin", "2026-10-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/movimientos/buscar").param("inicio", "2026-10-05"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void rejectsInvalidDateRangesAndIds() throws Exception {
        mvc.perform(get("/movimientos/buscar").param("inicio", "2026-10-05").param("fin", "2026-10-03"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/movimientos/buscar").param("inicio", "not-a-date"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/movimientos/buscar").param("cuentaId", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reportIncludesAllClientAccountsAndBothDatesWithoutOtherClients() throws Exception {
        var ana = cliente("Ana", "1", "activo");
        var juan = cliente("Juan", "2", "activo");
        var ahorro = cuenta(ana, "AHORRO", "activa");
        var corriente = cuenta(ana, "CORRIENTE", "activa");
        movimiento(ahorro, "2026-10-03T00:00:00");
        movimiento(corriente, "2026-10-04T23:59:59.999");
        movimiento(ahorro, "2026-10-05T00:00:00");
        movimiento(cuenta(juan, "AHORRO", "activa"), "2026-10-03T12:00:00");
        mvc.perform(get("/reportes").param("clienteId", ana.getId().toString())
                        .param("inicio", "2026-10-03").param("fin", "2026-10-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].cuentaId", org.hamcrest.Matchers.containsInAnyOrder(
                        corriente.getId().toString(), ahorro.getId().toString())))
                .andExpect(jsonPath("$[*].movimientos[*].fecha", org.hamcrest.Matchers.containsInAnyOrder(
                        "2026-10-03T00:00:00", "2026-10-04T23:59:59.999")));
        mvc.perform(get("/reportes").param("clienteId", ana.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        var vacio = cliente("Vacio", "3", "activo");
        mvc.perform(get("/reportes").param("clienteId", vacio.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void reportRequiresAnExistingClientAndValidDates() throws Exception {
        mvc.perform(get("/reportes")).andExpect(status().isBadRequest());
        for (String id : new String[]{"", "bad", "0", "-1"}) {
            mvc.perform(get("/reportes").param("clienteId", id)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/reportes").param("clienteId", "999999"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/reportes").param("clienteId", "1").param("inicio", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/reportes").param("clienteId", "1")
                        .param("inicio", "2026-10-05").param("fin", "2026-10-03"))
                .andExpect(status().isBadRequest());
    }

    private ClienteEntity cliente(String nombre, String identificacion, String estado) {
        return clientes.saveAndFlush(new ClienteEntity(
                new PersonaEntity(nombre, "F", 30L, identificacion, "Calle 1", "123"), "clave", estado));
    }

    private CuentaEntity cuenta(ClienteEntity cliente, String tipo, String estado) {
        return cuentas.saveAndFlush(new CuentaEntity(cliente, tipo, BigDecimal.ZERO, estado));
    }

    private void movimiento(CuentaEntity cuenta, String fecha) {
        movimientos.saveAndFlush(new MovimientoEntity(cuenta, LocalDateTime.parse(fecha),
                TipoMovimiento.DEPOSITO, BigDecimal.TEN, EstadoTransaccionMovimiento.APPROVED));
    }
}
