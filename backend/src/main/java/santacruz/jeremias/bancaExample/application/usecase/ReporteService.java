package santacruz.jeremias.bancaExample.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.dto.ReporteCuenta;
import santacruz.jeremias.bancaExample.application.port.in.ReporteUseCase;
import santacruz.jeremias.bancaExample.application.port.out.ClientePersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.CuentaPersistencePort;
import santacruz.jeremias.bancaExample.application.port.out.MovimientoPersistencePort;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReporteService implements ReporteUseCase {

    private final ClientePersistencePort clientes;
    private final CuentaPersistencePort cuentaPersistencePort;
    private final MovimientoPersistencePort movimientos;

    public ReporteService(ClientePersistencePort clientes, CuentaPersistencePort cuentaPersistencePort, MovimientoPersistencePort movimientos) {
        this.clientes = clientes;
        this.cuentaPersistencePort = cuentaPersistencePort;
        this.movimientos = movimientos;
    }

    @Override
    public Pagina<ReporteCuenta> generar(
            String clienteId, LocalDate inicio, LocalDate fin, Paginacion paginacion
    ) {
        String id = FiltrosBusqueda.id(clienteId);
        if (inicio != null && fin != null && inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha de fin.");
        }
        clientes.buscarPorId(id).orElseThrow(() -> new ClienteNoEncontradoException(id));

        Pagina<Cuenta> cuentas = cuentaPersistencePort.buscar(
                id, null, null, null, paginacion
        );

        if (cuentas.content().isEmpty()) {
            return cuentas.map(cuenta -> new ReporteCuenta(cuenta, List.<Movimiento>of()));
        }

        Map<String, List<Movimiento>> movimientosPorCuenta = movimientos.buscarPorCliente(id, inicio, fin)
                .stream()
                .collect(Collectors.groupingBy(Movimiento::cuentaId));

        return cuentas.map(cuenta -> new ReporteCuenta(
                cuenta,
                movimientosPorCuenta.getOrDefault(cuenta.cuentaId(), List.of())
        ));
    }
}