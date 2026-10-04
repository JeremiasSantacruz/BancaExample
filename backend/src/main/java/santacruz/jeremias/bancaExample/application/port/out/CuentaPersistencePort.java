package santacruz.jeremias.bancaExample.application.port.out;

import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;

import java.util.List;
import java.util.Optional;

public interface CuentaPersistencePort {
    Pagina<Cuenta> buscar(String clienteId, String tipoCuenta, String estado, String search, Paginacion paginacion);

    Cuenta guardar(Cuenta cuenta);

    Pagina<Cuenta> listarTodas(Long clienteId, Paginacion paginacion);

    Optional<Cuenta> buscarPorId(String cuentaId);

    Optional<Cuenta> buscarPorIdClienteAndTipoCuenta(String clienteId, String tipoCuenta);

    Cuenta actualizar(Cuenta cuenta);

    void eliminarPorId(String cuentaId);

    void actualizarEstadoPorCliente(String clienteId, EstadoCuenta estado);
}
