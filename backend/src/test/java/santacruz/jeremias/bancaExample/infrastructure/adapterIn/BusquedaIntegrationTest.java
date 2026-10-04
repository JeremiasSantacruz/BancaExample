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
        mvc.perform(get("/clientes").param("nombre", "  ana  ")
                        .param("identificacion", "234").param("estado", "activo"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nombre").value("Ana Perez"));
        mvc.perform(get("/clientes").param("nombre", "missing"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0));
        mvc.perform(get("/clientes"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalPages").value(1));
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/cuentas/buscar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(4))
                .andExpect(jsonPath("$.totalElements").value(4));
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/movimientos/buscar").param("cuentaId", cuenta.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(4));
        mvc.perform(get("/movimientos/buscar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(5));
        mvc.perform(get("/movimientos/buscar").param("fin", "2026-10-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1));
        mvc.perform(get("/movimientos/buscar").param("inicio", "2026-10-05"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1));
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].cuentaId", org.hamcrest.Matchers.containsInAnyOrder(
                        corriente.getId().toString(), ahorro.getId().toString())))
                .andExpect(jsonPath("$.content[*].movimientos[*].fecha", org.hamcrest.Matchers.containsInAnyOrder(
                        "2026-10-03T00:00:00", "2026-10-04T23:59:59.999")));
        mvc.perform(get("/reportes").param("clienteId", ana.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2));
        var vacio = cliente("Vacio", "3", "activo");
        mvc.perform(get("/reportes").param("clienteId", vacio.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.totalElements").value(0));
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

    @Test
    void splitsEveryListIntoPagesAndRejectsInvalidPagination() throws Exception {
        var ana = cliente("Ana", "1", "activo");
        var juan = cliente("Juan", "2", "activo");
        var primera = cuenta(ana, "AHORRO", "activa");
        var segunda = cuenta(ana, "CORRIENTE", "activa");
        var tercera = cuenta(juan, "AHORRO", "activa");
        movimiento(primera, "2026-10-03T10:00:00");
        movimiento(segunda, "2026-10-03T11:00:00");
        movimiento(tercera, "2026-10-03T12:00:00");

        mvc.perform(get("/cuentas/buscar").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false));
        mvc.perform(get("/cuentas/buscar").param("size", "2").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.first").value(false))
                .andExpect(jsonPath("$.last").value(true));

        mvc.perform(get("/cuentas/buscar").param("size", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(1));

        mvc.perform(get("/movimientos").param("size", "1").param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(3));

        mvc.perform(get("/reportes").param("clienteId", ana.getId().toString()).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(primera.getId().toString()))
                .andExpect(jsonPath("$.content[0].movimientos.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/reportes").param("clienteId", ana.getId().toString())
                        .param("size", "1").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(segunda.getId().toString()));

        for (String[] params : new String[][]{
                {"page", "-1"}, {"size", "0"}, {"size", "101"}, {"size", "muchos"}}) {
            mvc.perform(get("/cuentas/buscar").param(params[0], params[1]))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void filtersListingsWithTheSearchText() throws Exception {
        var ana = cliente("Ana", "1", "activo");
        cliente("Juan", "2", "activo");
        var ahorro = cuenta(ana, "AHORRO", "activa");
        var corriente = cuenta(ana, "CORRIENTE", "cerrada");
        movimiento(ahorro, "2026-10-03T10:00:00", TipoMovimiento.DEPOSITO);
        movimiento(corriente, "2026-10-03T11:00:00", TipoMovimiento.RETIRO);

        mvc.perform(get("/clientes").param("search", "jua"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].nombre").value("Juan"));

        mvc.perform(get("/cuentas/buscar").param("search", "ahorro"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(ahorro.getId().toString()));
        mvc.perform(get("/cuentas/buscar").param("search", "cerrada"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(corriente.getId().toString()));
        mvc.perform(get("/cuentas/buscar").param("search", ahorro.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(ahorro.getId().toString()));
        mvc.perform(get("/cuentas/buscar").param("search", "juan"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0));

        mvc.perform(get("/movimientos/buscar").param("search", "retiro"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].tipoMovimiento").value("RETIRO"));
        mvc.perform(get("/movimientos/buscar").param("search", "deposito"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].tipoMovimiento").value("DEPOSITO"));
        mvc.perform(get("/movimientos/buscar").param("search", corriente.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].cuentaId").value(corriente.getId().toString()));
    }

    private ClienteEntity cliente(String nombre, String identificacion, String estado) {
        return clientes.saveAndFlush(new ClienteEntity(
                new PersonaEntity(nombre, "F", 30L, identificacion, "Calle 1", "123"), "clave", estado));
    }

    private CuentaEntity cuenta(ClienteEntity cliente, String tipo, String estado) {
        return cuentas.saveAndFlush(new CuentaEntity(cliente, tipo, BigDecimal.ZERO, estado));
    }

    private void movimiento(CuentaEntity cuenta, String fecha) {
        movimiento(cuenta, fecha, TipoMovimiento.DEPOSITO);
    }

    private void movimiento(CuentaEntity cuenta, String fecha, TipoMovimiento tipo) {
        movimientos.saveAndFlush(new MovimientoEntity(cuenta, LocalDateTime.parse(fecha),
                tipo, BigDecimal.TEN, EstadoTransaccionMovimiento.APPROVED));
    }
}
