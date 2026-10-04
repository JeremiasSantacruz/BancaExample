package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface MovimientosUseCase {
    List<Movimiento> buscar(String cuentaId, java.time.LocalDate inicio, java.time.LocalDate fin);

    Movimiento crearMovimiento(MovimientoCommand command);

    List<Movimiento> obtenerTodos();

    Movimiento obtenerPorId(String movimientoId);

    Movimiento actualizar(String movimientoId, MovimientoCommand command);

    void eliminar(String movimientoId);

    BigDecimal obtenerSaldoExtraccionesDiarias(String cuentaId, LocalDate fecha);
}
