package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.out.ClientePersistencePort;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Persona;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

import java.util.Locale;
import java.util.Optional;

@Repository
public class ClienteRepositoryAdapter implements ClientePersistencePort {

    /** Orden estable para poder cortar páginas sin repetir ni perder clientes. */
    private static final Sort ORDEN_POR_DEFECTO = Sort.by(
            Sort.Order.asc("personaEntity.nombre"),
            Sort.Order.asc("id")
    );

    @Override
    public Pagina<Cliente> buscar(
            String nombre, String identificacion, String estado, String search, Paginacion paginacion
    ) {
        return PaginacionSpringData.toPagina(
                clienteJpaRepository.searchAll(
                        nombre, identificacion, estado, search,
                        PaginacionSpringData.toIdOpcional(search),
                        PaginacionSpringData.toPageable(paginacion, ORDEN_POR_DEFECTO)
                ),
                paginacion,
                this::toDomain
        );
    }


    private final ClienteJpaRepository clienteJpaRepository;

    public ClienteRepositoryAdapter(ClienteJpaRepository clienteJpaRepository) {
        this.clienteJpaRepository = clienteJpaRepository;
    }

    @Override
    public boolean existePorIdentificacion(String identificacion) {
        return clienteJpaRepository.countByPersonaEntity_Identificacion(identificacion) > 0;
    }

    @Override
    public Cliente guardar(
            Cliente cliente
    ) {
        PersonaEntity personaEntity = new PersonaEntity(
                cliente.nombre(),
                cliente.genero(),
                cliente.edad(),
                cliente.identificacion(),
                cliente.direccion(),
                cliente.telefono()
        );
        ClienteEntity clienteEntity = new ClienteEntity(
                personaEntity, cliente.contrasena(), cliente.estado().name().toLowerCase(Locale.ROOT)
        );
        return toDomain(clienteJpaRepository.save(clienteEntity));
    }

    @Override
    public Optional<Cliente> buscarPorId(String clienteId) {
        return clienteJpaRepository.findById(parseId(clienteId)).map(this::toDomain);
    }

    @Override
    public Cliente actualizar(
            Cliente cliente
    ) {
        ClienteEntity clienteEntity = clienteJpaRepository.findById(parseId(cliente.clienteId()))
                .orElseThrow(() -> new ClienteNoEncontradoException(cliente.clienteId()));
        clienteEntity.getPersona().actualizar(
                cliente.nombre(),
                cliente.genero(),
                cliente.edad(),
                cliente.identificacion(),
                cliente.direccion(),
                cliente.telefono()
        );
        clienteEntity.actualizar(
                cliente.contrasena(), cliente.estado().name().toLowerCase(Locale.ROOT)
        );
        return toDomain(clienteJpaRepository.save(clienteEntity));
    }

    @Override
    public void eliminarPorId(String clienteId) {
        clienteJpaRepository.deleteById(parseId(clienteId));
    }

    private Cliente toDomain(ClienteEntity clienteEntity) {
        PersonaEntity personaEntity = clienteEntity.getPersona();
        return new Cliente(
                clienteEntity.getId().toString(),
                new Persona(
                        personaEntity.getNombre(),
                        personaEntity.getGenero(),
                        personaEntity.getEdad(),
                        personaEntity.getIdentificacion(),
                        personaEntity.getDireccion(),
                        personaEntity.getTelefono()
                ),
                clienteEntity.getContrasena(),
                santacruz.jeremias.bancaExample.domain.enums.EstadoCliente.from(clienteEntity.getEstado())
        );
    }

    private Long parseId(String clienteId) {
        try {
            return Long.valueOf(clienteId);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("El id del cliente debe ser numérico.", exception);
        }
    }
}
