package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.dto.ReporteCuenta;

import java.time.LocalDate;

public interface ReporteUseCase {
    /**
     * Reporte por cuenta: la página es de cuentas y cada una viaja con sus
     * movimientos del rango, para que el frontend muestre un bloque por cuenta.
     */
    Pagina<ReporteCuenta> generar(String clienteId, LocalDate inicio, LocalDate fin, Paginacion paginacion);
}
