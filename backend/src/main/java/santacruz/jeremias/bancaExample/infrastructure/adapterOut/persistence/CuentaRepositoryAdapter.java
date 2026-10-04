package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoEncontradaException;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Repository
public class CuentaRepositoryAdapter implements CuentaPersistencePort {

    /** Orden estable para poder cortar páginas sin repetir ni perder cuentas. */
    private static final Sort ORDEN_POR_DEFECTO = Sort.by(Sort.Order.asc("id"));

    @Override
    public Pagina<Cuenta> buscar(
            String clienteId, String tipoCuenta, String estado, String search, Paginacion paginacion
    ) {
        return PaginacionSpringData.toPagina(
                cuentaJpaRepository.searchAll(
                        clienteId == null ? null : parseId(clienteId), tipoCuenta, estado, search,
                        PaginacionSpringData.toIdOpcional(search),
                        PaginacionSpringData.toPageable(paginacion, ORDEN_POR_DEFECTO)
                ),
                paginacion,
                this::toDomain
        );
    }


    private final CuentaJpaRepository cuentaJpaRepository;
    private final ClienteJpaRepository clienteJpaRepository;

    public CuentaRepositoryAdapter(
            CuentaJpaRepository cuentaJpaRepository,
            ClienteJpaRepository clienteJpaRepository
    ) {
        this.cuentaJpaRepository = cuentaJpaRepository;
        this.clienteJpaRepository = clienteJpaRepository;
    }

    @Override
    public Cuenta guardar(
            Cuenta cuenta
    ) {
        ClienteEntity clienteEntity = buscarCliente(cuenta.clienteId());
        CuentaEntity entidad = new CuentaEntity(
                clienteEntity, cuenta.tipoCuenta().name(), cuenta.saldo(),
                cuenta.estado().name().toLowerCase(Locale.ROOT)
        );
        return toDomain(cuentaJpaRepository.save(entidad));
    }

    @Override
    public Pagina<Cuenta> listarTodas(Long clienteId, Paginacion paginacion) {
        if (clienteId == null) {
            return Pagina.vacia(paginacion.page(), paginacion.size());
        }

        if (paginacion.todos()) {
            List<Cuenta> cuentas = cuentaJpaRepository.findAllByClienteEntity_Id(clienteId)
                    .stream().map(this::toDomain).toList();

            return Pagina.of(cuentas, 0, cuentas.size(), cuentas.size());
        }

        return PaginacionSpringData.toPagina(
                cuentaJpaRepository.searchAll(
                        clienteId, null, null, null, null,
                        PaginacionSpringData.toPageable(paginacion, ORDEN_POR_DEFECTO)
                ),
                paginacion,
                this::toDomain
        );
    }

    @Override
    public Optional<Cuenta> buscarPorId(String cuentaId) {
        return cuentaJpaRepository.findById(parseId(cuentaId)).map(this::toDomain);
    }

    @Override
    public Optional<Cuenta> buscarPorIdClienteAndTipoCuenta(String clienteId, String tipoCuenta) {
        return cuentaJpaRepository.findAllByClienteEntity_IdAndTipoCuenta(parseId(clienteId), tipoCuenta)
                .map(this::toDomain);
    }

    @Override
    public Cuenta actualizar(
            Cuenta cuenta
    ) {
        CuentaEntity entidad = cuentaJpaRepository.findById(parseId(cuenta.cuentaId()))
                .orElseThrow(() -> new CuentaNoEncontradaException(cuenta.cuentaId()));
        ClienteEntity clienteEntity = buscarCliente(cuenta.clienteId());
        entidad.actualizar(
                clienteEntity, cuenta.tipoCuenta().name(), cuenta.saldo(),
                cuenta.estado().name().toLowerCase(Locale.ROOT)
        );
        return toDomain(cuentaJpaRepository.save(entidad));
    }

    @Override
    public void eliminarPorId(String cuentaId) {
        cuentaJpaRepository.deleteById(parseId(cuentaId));
    }

    @Override
    @Transactional
    public void actualizarEstadoPorCliente(String clienteId, EstadoCuenta estado) {
        cuentaJpaRepository.actualizarEstadoPorClienteId(
                parseId(clienteId),
                estado.name().toLowerCase(Locale.ROOT)
        );
    }

    private ClienteEntity buscarCliente(String clienteId) {
        return clienteJpaRepository.findById(parseId(clienteId))
                .orElseThrow(() -> new ClienteNoEncontradoException(clienteId));
    }

    private Cuenta toDomain(CuentaEntity cuentaEntity) {
        return new Cuenta(
                cuentaEntity.getId().toString(),
                cuentaEntity.getCliente().getId().toString(),
                TipoCuenta.valueOf(cuentaEntity.getTipoCuenta()),
                cuentaEntity.getSaldoInicial(),
                EstadoCuenta.from(cuentaEntity.getEstado())
        );
    }

    private Long parseId(String id) {
        try {
            return Long.valueOf(id);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("El id debe ser numérico.", exception);
        }
    }
}
