package santacruz.jeremias.bancaExample.application.port.out;

import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;

import java.util.List;
import java.util.Optional;

public interface CuentaPersistencePort {
    List<Cuenta> buscar(String clienteId, String tipoCuenta, String estado);

    Cuenta guardar(Cuenta cuenta);

    List<Cuenta> listarTodas(Long clienteId);

    Optional<Cuenta> buscarPorId(String cuentaId);

    Optional<Cuenta> buscarPorIdClienteAndTipoCuenta(String clienteId, String tipoCuenta);

    Cuenta actualizar(Cuenta cuenta);

    void eliminarPorId(String cuentaId);

    void actualizarEstadoPorCliente(String clienteId, EstadoCuenta estado);
}
