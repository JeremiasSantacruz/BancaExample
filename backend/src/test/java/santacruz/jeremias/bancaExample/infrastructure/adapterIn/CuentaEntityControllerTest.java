package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CuentaController.class)
class CuentaEntityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CuentaUseCase cuentaUseCase;

    @Test
    void shouldCreateCuentaAndReturnLocation() throws Exception {
        when(cuentaUseCase.crear(any(CuentaCommand.class))).thenReturn(cuenta());

        mockMvc.perform(post("/cuentas")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "clienteId": "7",
                                  "tipoCuenta": "AHORRO",
                                  "estado": "activa",
                                  "saldo": 1250.75
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaId").value("42"))
                .andExpect(jsonPath("$.clienteId").value("7"))
                .andExpect(jsonPath("$.saldo").value(1250.75));

        verify(cuentaUseCase).crear(any(CuentaCommand.class));
    }

    @Test
    void shouldListAndGetCuentas() throws Exception {
        when(cuentaUseCase.obtenerTodas()).thenReturn(List.of(cuenta()));
        when(cuentaUseCase.obtenerPorId("42")).thenReturn(cuenta());

        mockMvc.perform(get("/cuentas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipoCuenta").value("AHORRO"));
        mockMvc.perform(get("/cuentas/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaId").value("42"));

        verify(cuentaUseCase).obtenerTodas();
        verify(cuentaUseCase).obtenerPorId("42");
    }

    @Test
    void shouldUpdateAndDeleteCuenta() throws Exception {
        when(cuentaUseCase.actualizar(eq("42"), any(CuentaCommand.class))).thenReturn(cuenta());

        mockMvc.perform(put("/cuentas/42")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "clienteId": "7",
                                  "tipoCuenta": "CORRIENTE",
                                  "estado": "activa",
                                  "saldoInicial": 2000.00
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaId").value("42"));

        mockMvc.perform(delete("/cuentas/42"))
                .andExpect(status().isNoContent());

        verify(cuentaUseCase).actualizar(eq("42"), any(CuentaCommand.class));
        verify(cuentaUseCase).eliminar("42");
    }

    private Cuenta cuenta() {
        return new Cuenta("42", "7", "AHORRO", new BigDecimal("1250.75"), EstadoCuenta.ACTIVA);
    }
}
