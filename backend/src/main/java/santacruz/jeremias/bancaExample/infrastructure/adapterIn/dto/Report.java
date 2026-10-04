package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import santacruz.jeremias.bancaExample.application.dto.ReporteCuenta;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.util.List;

public record Report(
        String clienteId,
        String cuentaId,
        String tipoCuenta,
        String estado,
        BigDecimal saldo,
        List<MovimientoResponse> movimientos
) {
    /** Un bloque del reporte: una cuenta con los movimientos del rango. */
    public static Report from(ReporteCuenta reporte) {
        return from(reporte.cuenta(), reporte.movimientos());
    }

    public static Report from(Cuenta cuenta, List<Movimiento> movimientos) {
        return new Report(
                cuenta.clienteId(),
                cuenta.cuentaId(),
                cuenta.tipoCuenta().name(),
                cuenta.estado().name(),
                cuenta.saldo(),
                movimientos.stream()
                        .map(MovimientoResponse::from)
                        .toList()
        );
    }
}

