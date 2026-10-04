package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import santacruz.jeremias.bancaExample.application.command.CreateCuentaCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.model.Cuenta;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.CreateCuentaRequest;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.CuentaRequest;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.CuentaResponse;

import java.util.Locale;

@RestController
@RequestMapping("/cuentas")
public class CuentaController {

    private final CuentaUseCase cuentaUseCase;

    public CuentaController(CuentaUseCase cuentaUseCase) {
        this.cuentaUseCase = cuentaUseCase;
    }

    @PostMapping
    public CuentaResponse crear(@RequestBody CreateCuentaRequest request) {
        return toResponse(cuentaUseCase.crear(toCommand(request)));
    }

    @GetMapping("/buscar")
    public Pagina<CuentaResponse> buscar(@RequestParam(required = false) String clienteId,
                                       @RequestParam(required = false) String tipoCuenta,
                                       @RequestParam(required = false) String estado,
                                       @RequestParam(required = false) String search,
                                       @RequestParam(required = false) Integer page,
                                       @RequestParam(required = false) String size) {
        return cuentaUseCase.buscar(clienteId, tipoCuenta, estado, search, Paginacion.of(page, size))
                .map(this::toResponse);
    }

    @GetMapping("/{clienteId}")
    public Pagina<CuentaResponse> listar(@PathVariable String clienteId,
                                         @RequestParam(required = false) Integer page,
                                         @RequestParam(required = false) String size) {
        return cuentaUseCase.obtenerTodas(clienteId, Paginacion.of(page, size)).map(this::toResponse);
    }

    @GetMapping("/{clienteId}/{cuentaId}")
    public CuentaResponse obtenerPorId(@PathVariable String cuentaId) {
        return toResponse(cuentaUseCase.obtenerPorId(cuentaId));
    }

    @PutMapping("/{clienteId}/{cuentaId}")
    public CuentaResponse actualizar(@PathVariable String cuentaId, @RequestBody CuentaRequest request) {
        return toResponse(cuentaUseCase.actualizar(cuentaId, toCommand(request)));
    }

    @DeleteMapping("/{clienteId}/{cuentaId}")
    public ResponseEntity<Void> eliminar(@PathVariable String cuentaId) {
        cuentaUseCase.eliminar(cuentaId);
        return ResponseEntity.noContent().build();
    }

    private CuentaCommand toCommand(CuentaRequest request) {
        return new CuentaCommand(
                request.clienteId(),
                request.tipoCuenta(),
                request.saldoInicial(),
                request.estado()
        );
    }

    private CreateCuentaCommand toCommand(CreateCuentaRequest request) {
        return new CreateCuentaCommand(
                request.clienteId(),
                request.tipoCuenta()
        );
    }

    private CuentaResponse toResponse(Cuenta cuenta) {
        return new CuentaResponse(
                cuenta.clienteId(),
                cuenta.cuentaId(),
                cuenta.tipoCuenta().name(),
                cuenta.estado().name().toLowerCase(Locale.ROOT),
                cuenta.saldo()
        );
    }
}
