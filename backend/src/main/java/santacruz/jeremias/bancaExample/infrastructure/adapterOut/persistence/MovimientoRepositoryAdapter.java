package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.port.out.MovimientoPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoEncontradaException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.EstadoCuentaMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.MovimientoEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class MovimientoRepositoryAdapter implements MovimientoPersistencePort {

    @Override
    public List<Movimiento> buscarPorCliente(String clienteId, LocalDate inicio, LocalDate fin) {
        return movimientoJpaRepository.searchByCliente(parseId(clienteId),
                        inicio == null ? null : inicio.atStartOfDay(),
                        fin == null ? null : fin.plusDays(1).atStartOfDay())
                .stream().map(this::toDomain).toList();
    }

    private final MovimientoJpaRepository movimientoJpaRepository;
    private final CuentaJpaRepository cuentaJpaRepository;
    private final ClienteJpaRepository clienteJpaRepository;

    public MovimientoRepositoryAdapter(
            MovimientoJpaRepository movimientoJpaRepository,
            CuentaJpaRepository cuentaJpaRepository,
            ClienteJpaRepository clienteJpaRepository
    ) {
        this.movimientoJpaRepository = movimientoJpaRepository;
        this.cuentaJpaRepository = cuentaJpaRepository;
        this.clienteJpaRepository = clienteJpaRepository;
    }

    @Override
    public List<Movimiento> buscar(
            String cuentaId, LocalDate inicio, LocalDate fin
    ) {
        return movimientoJpaRepository.searchAll(cuentaId == null ? null : parseId(cuentaId),
                        inicio == null ? null : inicio.atStartOfDay(),
                        fin == null ? null : fin.plusDays(1).atStartOfDay())
                .stream().map(this::toDomain).toList();
    }

    @Override
    @Transactional
    public santacruz.jeremias.bancaExample.domain.model.Movimiento guardar(
            santacruz.jeremias.bancaExample.domain.model.Movimiento movimiento
    ) {
        CuentaEntity cuentaEntity = buscarCuenta(movimiento.cuentaId());
        MovimientoEntity entidad = new MovimientoEntity(
                cuentaEntity,
                movimiento.fecha(),
                movimiento.tipoMovimiento(),
                movimiento.valor(),
                movimiento.estado()
        );
        return toDomain(movimientoJpaRepository.save(entidad));
    }

    @Override
    public List<santacruz.jeremias.bancaExample.domain.model.Movimiento> listarTodos() {
        return movimientoJpaRepository.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<santacruz.jeremias.bancaExample.domain.model.Movimiento> buscarPorId(String movimientoId) {
        return movimientoJpaRepository.findById(parseId(movimientoId)).map(this::toDomain);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<santacruz.jeremias.bancaExample.domain.model.Movimiento> buscarPorIdBloqueando(
            String movimientoId
    ) {
        return movimientoJpaRepository.findByIdForUpdate(parseId(movimientoId)).map(this::toDomain);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public Movimiento actualizarEstado(String movimientoId, EstadoTransaccionMovimiento estado) {
        MovimientoEntity original = movimientoJpaRepository.findByIdForUpdate(parseId(movimientoId))
                .orElseThrow(() -> new MovimientoNoEncontradoException(movimientoId));
        original.actualizarEstado(estado);
        return toDomain(movimientoJpaRepository.save(original));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public santacruz.jeremias.bancaExample.domain.model.Movimiento revertirYGuardarCorreccion(
            String movimientoId,
            santacruz.jeremias.bancaExample.domain.model.Movimiento correccion
    ) {
        MovimientoEntity original = movimientoJpaRepository.findByIdForUpdate(parseId(movimientoId))
                .orElseThrow(() -> new MovimientoNoEncontradoException(movimientoId));
        original.actualizarEstado(EstadoTransaccionMovimiento.REVERSED);
        MovimientoEntity nuevaCorreccion = new MovimientoEntity(
                original.getCuenta(),
                correccion.fecha(),
                correccion.tipoMovimiento(),
                correccion.valor(),
                EstadoTransaccionMovimiento.REVERSED_CORRECTION
        );
        movimientoJpaRepository.save(original);
        return toDomain(movimientoJpaRepository.save(nuevaCorreccion));
    }

    @Override
    public void eliminarPorId(String movimientoId) {
        movimientoJpaRepository.deleteById(parseId(movimientoId));
    }

    @Override
    public BigDecimal obtenerSaldoExtraccionesDiarias(String cuentaId, LocalDate fecha) {
        Long id = parseId(cuentaId);
        if (!cuentaJpaRepository.existsById(id)) {
            throw new CuentaNoEncontradaException(cuentaId);
        }
        return movimientoJpaRepository.sumarExtraccionesAplicadas(
                id,
                fecha.atStartOfDay(),
                fecha.plusDays(1).atStartOfDay(),
                TipoMovimiento.RETIRO,
                estadosExtraccionEfectiva()
        );
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public EstadoCuentaMovimiento obtenerEstadoCuentaBloqueando(String cuentaId, LocalDate fecha) {
        Long id = parseId(cuentaId);
        CuentaEntity cuenta = cuentaJpaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new CuentaNoEncontradaException(cuentaId));
        Long clienteId = cuenta.getCliente().getId();
        var cliente = clienteJpaRepository.findByIdForUpdate(clienteId)
                .orElseThrow(() -> new IllegalStateException("La cuenta referencia un cliente inexistente."));
        BigDecimal extraccionesDiarias = movimientoJpaRepository.sumarExtraccionesAplicadas(
                id,
                fecha.atStartOfDay(),
                fecha.plusDays(1).atStartOfDay(),
                TipoMovimiento.RETIRO,
                estadosExtraccionEfectiva()
        );
        return new EstadoCuentaMovimiento(
                clienteId.toString(),
                cuenta.getSaldoActual(),
                extraccionesDiarias,
                EstadoCuenta.from(cuenta.getEstado()),
                EstadoCliente.from(cliente.getEstado())
        );
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void actualizarSaldoBloqueado(String cuentaId, BigDecimal saldo) {
        CuentaEntity cuenta = cuentaJpaRepository.findByIdForUpdate(parseId(cuentaId))
                .orElseThrow(() -> new CuentaNoEncontradaException(cuentaId));
        cuenta.actualizarSaldo(saldo);
    }

    private CuentaEntity buscarCuenta(String cuentaId) {
        return cuentaJpaRepository.findById(parseId(cuentaId))
                .orElseThrow(() -> new CuentaNoEncontradaException(cuentaId));
    }

    private santacruz.jeremias.bancaExample.domain.model.Movimiento toDomain(MovimientoEntity movimientoEntity) {
        return new santacruz.jeremias.bancaExample.domain.model.Movimiento(
                movimientoEntity.getId().toString(),
                movimientoEntity.getCuenta().getId().toString(),
                movimientoEntity.getFecha(),
                movimientoEntity.getTipoMovimiento(),
                movimientoEntity.getValor(),
                movimientoEntity.getEstado()
        );
    }

    private Long parseId(String id) {
        try {
            return Long.valueOf(id);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("El id debe ser numérico.", exception);
        }
    }

    private List<EstadoTransaccionMovimiento> estadosExtraccionEfectiva() {
        return List.of(
                EstadoTransaccionMovimiento.APPROVED,
                EstadoTransaccionMovimiento.REVERSED_CORRECTION
        );
    }
}
