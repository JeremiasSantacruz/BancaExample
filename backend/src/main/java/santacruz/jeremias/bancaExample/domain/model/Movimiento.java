package santacruz.jeremias.bancaExample.domain.model;

import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record Movimiento(
        String movimientoId,
        String cuentaId,
        LocalDateTime fecha,
        TipoMovimiento tipoMovimiento,
        BigDecimal valor,
        EstadoTransaccionMovimiento estado
) {
}
