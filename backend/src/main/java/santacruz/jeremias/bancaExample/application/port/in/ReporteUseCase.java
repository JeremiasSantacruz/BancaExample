package santacruz.jeremias.bancaExample.application.port.in;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

public interface ReporteUseCase {
    Map<Cuenta, List<Movimiento>> generar(String clienteId, LocalDate inicio, LocalDate fin);
}
