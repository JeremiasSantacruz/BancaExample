package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
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
    @Override
    public List<Cuenta> buscar(String clienteId, String tipoCuenta, String estado) {
        return cuentaJpaRepository.searchAll(clienteId == null ? null : parseId(clienteId), tipoCuenta, estado)
                .stream().map(this::toDomain).toList();
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
    public List<Cuenta> listarTodas(Long clienteId) {
        return cuentaJpaRepository.findAllByClienteEntity_Id(clienteId).stream().map(this::toDomain).toList();
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
