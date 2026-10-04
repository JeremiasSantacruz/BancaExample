package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface MovimientosUseCase {
    Pagina<Movimiento> buscar(
            String cuentaId, java.time.LocalDate inicio, java.time.LocalDate fin,
            String search, Paginacion paginacion
    );

    Movimiento crearMovimiento(MovimientoCommand command);

    Pagina<Movimiento> obtenerTodos(Paginacion paginacion);

    Movimiento obtenerPorId(String movimientoId);

    Movimiento actualizar(String movimientoId, MovimientoCommand command);

    void eliminar(String movimientoId);

    BigDecimal obtenerSaldoExtraccionesDiarias(String cuentaId, LocalDate fecha);
}
