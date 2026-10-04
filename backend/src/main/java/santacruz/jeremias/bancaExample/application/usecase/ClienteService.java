package santacruz.jeremias.bancaExample.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.port.in.ClienteUseCase;
import santacruz.jeremias.bancaExample.application.port.out.ClientePersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.ClienteDuplicadoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Persona;

import java.util.List;

@Service
public class ClienteService implements ClienteUseCase {

    private final ClientePersistencePort clientePersistence;
    private final CuentaPersistencePort cuentaPersistence;

    public ClienteService(
            ClientePersistencePort clientePersistence,
            CuentaPersistencePort cuentaPersistence
    ) {
        this.clientePersistence = clientePersistence;
        this.cuentaPersistence = cuentaPersistence;
    }

    @Override
    @Transactional
    public Cliente crear(ClienteCommand command) {
        if (clientePersistence.existePorIdentificacion(command.identificacion())) {
            throw new ClienteDuplicadoException(command.identificacion());
        }
        return clientePersistence.guardar(toDomain(null, command, true));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Cliente> buscar(String nombre, String identificacion, String estado) {
        return clientePersistence.buscar(FiltrosBusqueda.texto(nombre), FiltrosBusqueda.texto(identificacion),
                FiltrosBusqueda.enumerado(estado, EstadoCliente.class));
    }

    @Override
    @Transactional(readOnly = true)
    public Cliente obtenerPorId(String clienteId) {
        return clientePersistence.buscarPorId(clienteId)
                .orElseThrow(() -> new ClienteNoEncontradoException(clienteId));
    }

    @Override
    @Transactional
    public Cliente actualizar(String clienteId, ClienteCommand command) {
        Cliente actual = obtenerPorId(clienteId);
        if (!actual.identificacion().equals(command.identificacion())
                && clientePersistence.existePorIdentificacion(command.identificacion())) {
            throw new ClienteDuplicadoException(command.identificacion());
        }
        EstadoCliente nuevoEstado = EstadoCliente.from(command.estado());
        Cliente actualizado = toDomain(actual.clienteId(), command, false);
        if (nuevoEstado == EstadoCliente.INACTIVO) {
            cuentaPersistence.actualizarEstadoPorCliente(actual.clienteId(), EstadoCuenta.INACTIVA);
        }
        return clientePersistence.actualizar(actualizado);
    }

    @Override
    @Transactional
    public void eliminar(String clienteId) {
        Cliente actual = obtenerPorId(clienteId);
        Cliente inactivo = new Cliente(
                actual.clienteId(),
                actual,
                actual.contrasena(),
                EstadoCliente.INACTIVO
        );
        cuentaPersistence.actualizarEstadoPorCliente(actual.clienteId(), EstadoCuenta.INACTIVA);
        clientePersistence.actualizar(inactivo);
    }

    private Cliente toDomain(String clienteId, ClienteCommand command, boolean created) {
        Persona persona = new Persona(
                command.nombre(),
                command.genero(),
                command.edad(),
                command.identificacion(),
                command.direccion(),
                command.telefono()
        );
        EstadoCliente estado = created ? EstadoCliente.ACTIVO : EstadoCliente.from(command.estado());
        return new Cliente(clienteId, persona, command.contrasena(), estado);
    }
}
