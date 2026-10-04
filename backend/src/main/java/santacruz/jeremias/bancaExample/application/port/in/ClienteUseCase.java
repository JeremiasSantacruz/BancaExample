package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.domain.model.Cliente;

import java.util.List;

public interface ClienteUseCase {
    List<Cliente> buscar(String nombre, String identificacion, String estado);

    Cliente crear(ClienteCommand command);

    Cliente obtenerPorId(String clienteId);

    Cliente actualizar(String clienteId, ClienteCommand command);

    void eliminar(String clienteId);
}
