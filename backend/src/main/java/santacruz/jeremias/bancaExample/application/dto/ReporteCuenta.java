package santacruz.jeremias.bancaExample.application.dto;

import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.util.List;

/**
 * Una cuenta del cliente junto con los movimientos del rango consultado.
 *
 * El reporte se arma por cuenta: cada entrada viaja con su propia lista, así el
 * frontend puede mostrar un bloque por cuenta sin tener que agrupar.
 *
 * @param cuenta      cuenta incluida en el reporte
 * @param movimientos movimientos de la cuenta dentro del rango, vacía si no tuvo
 */
public record ReporteCuenta(
        Cuenta cuenta,
        List<Movimiento> movimientos
) {
    public ReporteCuenta {
        movimientos = List.copyOf(movimientos);
    }
}
