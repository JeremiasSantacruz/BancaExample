package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;

import java.util.List;

public interface CuentaUseCase {
    List<Cuenta> buscar(String clienteId, String tipoCuenta, String estado);

    Cuenta crear(CreateCuentaCommand command);

    List<Cuenta> obtenerTodas(String clienteId);

    Cuenta obtenerPorId(String cuentaId);

    Cuenta actualizar(String cuentaId, CuentaCommand command);

    void eliminar(String cuentaId);
}
