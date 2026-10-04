package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.port.in.MovimientosUseCase;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MovimientosController.class)
class MovimientosControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MovimientosUseCase movimientosUseCase;

    @Test
    void shouldCreateMovimientoAndReturnLocation() throws Exception {
        when(movimientosUseCase.crearMovimiento(any(MovimientoCommand.class))).thenReturn(movimiento());

        mockMvc.perform(post("/movimientos")
                        .contentType(APPLICATION_JSON)
                        .content(requestJson("RETIRO", "125.50")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.endsWith("/movimientos/42")))
                .andExpect(jsonPath("$.movimientoId").value("42"))
                .andExpect(jsonPath("$.cuentaId").value("7"))
                .andExpect(jsonPath("$.valor").value(125.50));

        verify(movimientosUseCase).crearMovimiento(any(MovimientoCommand.class));
    }

    @Test
    void shouldListAndGetMovimientos() throws Exception {
        when(movimientosUseCase.obtenerTodos()).thenReturn(List.of(movimiento()));
        when(movimientosUseCase.obtenerPorId("42")).thenReturn(movimiento());

        mockMvc.perform(get("/movimientos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipoMovimiento").value("RETIRO"));
        mockMvc.perform(get("/movimientos/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movimientoId").value("42"));

        verify(movimientosUseCase).obtenerTodos();
        verify(movimientosUseCase).obtenerPorId("42");
    }

    @Test
    void shouldReturnDailyWithdrawalBalance() throws Exception {
        when(movimientosUseCase.obtenerSaldoExtraccionesDiarias("7", LocalDate.of(2026, 10, 2)))
                .thenReturn(new BigDecimal("175.50"));

        mockMvc.perform(get("/movimientos/cuentas/7/extracciones-diarias")
                        .queryParam("fecha", "2026-10-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaId").value("7"))
                .andExpect(jsonPath("$.fecha").value("2026-10-02"))
                .andExpect(jsonPath("$.totalExtraido").value(175.50));

        verify(movimientosUseCase).obtenerSaldoExtraccionesDiarias("7", LocalDate.of(2026, 10, 2));
    }

    @Test
    void shouldReverseMovimientoAndRejectDeletion() throws Exception {
        when(movimientosUseCase.actualizar(eq("42"), any(MovimientoCommand.class))).thenReturn(movimiento());

        mockMvc.perform(put("/movimientos/42")
                        .contentType(APPLICATION_JSON)
                        .content("{\"estado\":\"REVERSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movimientoId").value("42"));

        org.mockito.Mockito.doThrow(new IllegalArgumentException("Solo se permiten reversas"))
                .when(movimientosUseCase).eliminar("42");
        mockMvc.perform(delete("/movimientos/42"))
                .andExpect(status().isBadRequest());

        verify(movimientosUseCase).actualizar(eq("42"), any(MovimientoCommand.class));
        verify(movimientosUseCase).eliminar("42");
    }

    @Test
    void shouldReturnBadRequestForInvalidMovimientoFields() throws Exception {
        mockMvc.perform(post("/movimientos")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "cuentaId": "7",
                                  "tipoMovimiento": "RETIRO",
                                  "valor": 0,
                                  "estado": "APPROVED"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("fecha: es obligatoria.")))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("valor: debe ser mayor que cero.")));

        verifyNoInteractions(movimientosUseCase);
    }

    @Test
    void shouldReturnBadRequestForMalformedJson() throws Exception {
        mockMvc.perform(post("/movimientos")
                        .contentType(APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("El cuerpo de la solicitud no es válido o tiene un formato incorrecto."));

        verifyNoInteractions(movimientosUseCase);
    }

    private Movimiento movimiento() {
        return new Movimiento(
                "42",
                "7",
                LocalDateTime.of(2026, 10, 2, 12, 30),
                TipoMovimiento.RETIRO,
                new BigDecimal("125.50"),
                EstadoTransaccionMovimiento.APPROVED
        );
    }

    private String requestJson(String tipoMovimiento, String valor) {
        return """
                {
                  "cuentaId": "7",
                  "fecha": "2026-10-02T12:30:00",
                  "tipoMovimiento": "%s",
                  "valor": %s,
                  "estado": "APPROVED"
                }
                """.formatted(tipoMovimiento, valor);
    }
}
