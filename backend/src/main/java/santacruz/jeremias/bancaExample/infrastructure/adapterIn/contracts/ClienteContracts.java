package santacruz.jeremias.bancaExample.infrastructure.adapterIn.contracts;

import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteRequest;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteResponse;

import java.util.List;

public interface ClienteContracts {

    ClienteResponse crearCliente(ClienteRequest request);

    List<ClienteResponse> obtenerClientes(String nombre, String identificacion, String estado);

    ClienteResponse getClienteById(String clienteId);

    ClienteResponse actualizarCliente(String clienteId, ClienteRequest clienteRequest);

    void eliminarCliente(String clienteId);

}
