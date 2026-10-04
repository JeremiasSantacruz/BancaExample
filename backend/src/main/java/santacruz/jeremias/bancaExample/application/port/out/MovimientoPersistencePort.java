package santacruz.jeremias.bancaExample.application.port.out;

import santacruz.jeremias.bancaExample.domain.model.EstadoCuentaMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MovimientoPersistencePort {

    List<Movimiento> buscarPorCliente(String clienteId, LocalDate inicio, LocalDate fin);

    List<Movimiento> buscar(String cuentaId, java.time.LocalDate inicio, java.time.LocalDate fin);

    Movimiento guardar(Movimiento movimiento);

    List<Movimiento> listarTodos();

    Optional<Movimiento> buscarPorId(String movimientoId);

    Optional<Movimiento> buscarPorIdBloqueando(String movimientoId);

    Movimiento actualizarEstado(String movimientoId, santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento estado);

    Movimiento revertirYGuardarCorreccion(String movimientoId, Movimiento correccion);

    void eliminarPorId(String movimientoId);

    BigDecimal obtenerSaldoExtraccionesDiarias(String cuentaId, LocalDate fecha);

    EstadoCuentaMovimiento obtenerEstadoCuentaBloqueando(String cuentaId, LocalDate fecha);

    void actualizarSaldoBloqueado(String cuentaId, BigDecimal saldo);
}
