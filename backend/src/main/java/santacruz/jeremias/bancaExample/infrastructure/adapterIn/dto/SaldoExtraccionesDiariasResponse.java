package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SaldoExtraccionesDiariasResponse(
        String cuentaId,
        LocalDate fecha,
        BigDecimal totalExtraido
) {
}
