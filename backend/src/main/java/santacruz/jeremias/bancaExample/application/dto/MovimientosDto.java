package santacruz.jeremias.bancaExample.application.dto;

import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MovimientosDto(
        LocalDateTime fecha,
        TipoMovimiento tipoMovimiento,
        BigDecimal valor,
        EstadoTransaccionMovimiento estado
) {
}
