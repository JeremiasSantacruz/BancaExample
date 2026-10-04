package santacruz.jeremias.bancaExample.application.port.out;

import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.domain.model.Cliente;

import java.util.List;
import java.util.Optional;

public interface ClientePersistencePort {

    Cliente guardar(Cliente cliente);

    Pagina<Cliente> buscar(String nombre, String identificacion, String estado, String search, Paginacion paginacion);

    boolean existePorIdentificacion(String identificacion);

    Optional<Cliente> buscarPorId(String clienteId);

    Cliente actualizar(Cliente cliente);

    void eliminarPorId(String clienteId);
}
