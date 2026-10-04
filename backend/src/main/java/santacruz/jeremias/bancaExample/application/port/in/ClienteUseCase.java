package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.domain.model.Cliente;

public interface ClienteUseCase {
    Pagina<Cliente> buscar(String nombre, String identificacion, String estado, String search, Paginacion paginacion);

    Cliente crear(ClienteCommand command);

    Cliente obtenerPorId(String clienteId);

    Cliente actualizar(String clienteId, ClienteCommand command);

    void eliminar(String clienteId);
}
