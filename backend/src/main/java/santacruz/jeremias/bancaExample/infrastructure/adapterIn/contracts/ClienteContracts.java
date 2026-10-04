package santacruz.jeremias.bancaExample.infrastructure.adapterIn.contracts;

import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteRequest;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteResponse;

public interface ClienteContracts {

    ClienteResponse crearCliente(ClienteRequest request);

    Pagina<ClienteResponse> obtenerClientes(
            String nombre, String identificacion, String estado, String search, Integer page, String size);

    ClienteResponse getClienteById(String clienteId);

    ClienteResponse actualizarCliente(String clienteId, ClienteRequest clienteRequest);

    void eliminarCliente(String clienteId);
}
