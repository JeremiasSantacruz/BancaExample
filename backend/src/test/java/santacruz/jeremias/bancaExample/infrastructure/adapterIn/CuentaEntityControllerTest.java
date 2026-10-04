package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
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
        when(cuentaUseCase.crear(any(CreateCuentaCommand.class))).thenReturn(cuenta());

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

        verify(cuentaUseCase).crear(any(CreateCuentaCommand.class));
    }

    @Test
    void shouldListAndGetCuentas() throws Exception {
        when(cuentaUseCase.obtenerTodas("7")).thenReturn(List.of(cuenta()));
        when(cuentaUseCase.obtenerPorId("42")).thenReturn(cuenta());

        mockMvc.perform(get("/cuentas/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipoCuenta").value("AHORRO"));
        mockMvc.perform(get("/cuentas/7/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaId").value("42"));

        verify(cuentaUseCase).obtenerTodas("7");
        verify(cuentaUseCase).obtenerPorId("42");
    }

    @Test
    void shouldUpdateAndDeleteCuenta() throws Exception {
        when(cuentaUseCase.actualizar(eq("42"), any(CuentaCommand.class))).thenReturn(cuenta());

        mockMvc.perform(put("/cuentas/7/42")
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

        mockMvc.perform(delete("/cuentas/7/42"))
                .andExpect(status().isNoContent());

        verify(cuentaUseCase).actualizar(eq("42"), any(CuentaCommand.class));
        verify(cuentaUseCase).eliminar("42");
    }

    private Cuenta cuenta() {
        return new Cuenta("42", "7", TipoCuenta.AHORRO, new BigDecimal("1250.75"), EstadoCuenta.ACTIVA);
    }
}
