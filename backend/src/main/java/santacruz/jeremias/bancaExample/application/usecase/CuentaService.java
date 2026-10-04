package santacruz.jeremias.bancaExample.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoOperativoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class CuentaService implements CuentaUseCase {

    private final CuentaPersistencePort cuentaPersistence;
    private final ClienteService clienteService;

    public CuentaService(CuentaPersistencePort cuentaPersistence, ClienteService clienteService) {
        this.cuentaPersistence = cuentaPersistence;
        this.clienteService = clienteService;
    }

    @Override
    @Transactional
    public Cuenta crear(CreateCuentaCommand command) {
        Cliente cliente = clienteService.obtenerPorId(command.clienteId());
        if (!cliente.estado().esOperativo()) {
            throw new ClienteNoOperativoException(command.clienteId());
        }
        if (!TipoCuenta.isValidTipoCuenta(command.tipoCuenta())) {
            throw new IllegalArgumentException("Tipo de cuenta no válido");
        }
        Optional<Cuenta> existing = cuentaPersistence.buscarPorIdClienteAndTipoCuenta(command.clienteId(), command.tipoCuenta());
        return existing.orElseGet(() -> cuentaPersistence.guardar(toDomain(null, command)));
    }

    @Override
    @Transactional(readOnly = true)
    public Pagina<Cuenta> obtenerTodas(String clienteId, Paginacion paginacion) {
        return cuentaPersistence.listarTodas(Long.parseLong(FiltrosBusqueda.id(clienteId)), paginacion);
    }

    @Override
    @Transactional(readOnly = true)
    public Pagina<Cuenta> buscar(
            String clienteId, String tipoCuenta, String estado, String search, Paginacion paginacion
    ) {
        return cuentaPersistence.buscar(FiltrosBusqueda.id(clienteId),
                FiltrosBusqueda.enumerado(tipoCuenta, TipoCuenta.class),
                FiltrosBusqueda.enumerado(estado, EstadoCuenta.class),
                FiltrosBusqueda.texto(search), paginacion);
    }


    @Override
    @Transactional(readOnly = true)
    public Cuenta obtenerPorId(String cuentaId) {
        return cuentaPersistence.buscarPorId(cuentaId)
                .orElseThrow(() -> new santacruz.jeremias.bancaExample.domain.exception.CuentaNoEncontradaException(cuentaId));
    }

    @Override
    @Transactional
    public Cuenta actualizar(String cuentaId, CuentaCommand command) {
        obtenerPorId(cuentaId);
        return cuentaPersistence.actualizar(toDomain(cuentaId, command));
    }

    @Override
    @Transactional
    public void eliminar(String cuentaId) {
        Cuenta actual = obtenerPorId(cuentaId);
        cuentaPersistence.actualizar(new Cuenta(
                actual.cuentaId(),
                actual.clienteId(),
                actual.tipoCuenta(),
                actual.saldo(),
                EstadoCuenta.CERRADA
        ));
    }

    private Cuenta toDomain(String cuentaId, CreateCuentaCommand command) {
        return new Cuenta(
                cuentaId,
                command.clienteId(),
                TipoCuenta.valueOf(command.tipoCuenta()),
                BigDecimal.ZERO,
                EstadoCuenta.ACTIVA
        );
    }

    private Cuenta toDomain(String cuentaId, CuentaCommand command) {
        return new Cuenta(
                cuentaId,
                command.clienteId(),
                TipoCuenta.valueOf(command.tipoCuenta()),
                command.saldoInicial(),
                EstadoCuenta.from(command.estado())
        );
    }
}
