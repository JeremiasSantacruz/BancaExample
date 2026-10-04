package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MovimientoResponse(
        String movimientoId,
        String cuentaId,
        LocalDateTime fecha,
        TipoMovimiento tipoMovimiento,
        BigDecimal valor,
        EstadoTransaccionMovimiento estado
) {
    public static MovimientoResponse from(Movimiento movimiento) {
        return new MovimientoResponse(movimiento.movimientoId(), movimiento.cuentaId(), movimiento.fecha(), movimiento.tipoMovimiento(), movimiento.valor(), movimiento.estado());
    }
}
