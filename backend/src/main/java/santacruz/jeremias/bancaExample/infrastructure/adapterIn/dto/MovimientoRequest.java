package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MovimientoRequest(
        @NotNull(message = "es obligatoria.") String cuentaId,
        @NotNull(message = "es obligatoria.") LocalDateTime fecha,
        @NotNull(message = "es obligatorio.") String tipoMovimiento,
        @NotNull(message = "es obligatorio.") @Positive(message = "debe ser mayor que cero.") BigDecimal valor,
        @NotNull(message = "es obligatorio.") EstadoTransaccionMovimiento estado
) {
}
