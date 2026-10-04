package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;

public interface CuentaUseCase {
    Pagina<Cuenta> buscar(String clienteId, String tipoCuenta, String estado, String search, Paginacion paginacion);

    Cuenta crear(CreateCuentaCommand command);

    Pagina<Cuenta> obtenerTodas(String clienteId, Paginacion paginacion);

    Cuenta obtenerPorId(String cuentaId);

    Cuenta actualizar(String cuentaId, CuentaCommand command);

    void eliminar(String cuentaId);
}
