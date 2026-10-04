package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import santacruz.jeremias.bancaExample.application.command.MovimientoCommand;
import santacruz.jeremias.bancaExample.application.port.in.MovimientosUseCase;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.domain.model.Movimiento;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.MovimientoRequest;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.MovimientoResponse;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.SaldoExtraccionesDiariasResponse;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/movimientos")
public class MovimientosController {

    private final MovimientosUseCase movimientosUseCase;

    public MovimientosController(MovimientosUseCase movimientosUseCase) {
        this.movimientosUseCase = movimientosUseCase;
    }

    @PostMapping
    public ResponseEntity<MovimientoResponse> crearMovimiento(@Valid @RequestBody MovimientoRequest request) {
        MovimientoResponse response = toResponse(movimientosUseCase.crearMovimiento(toCommand(request)));
        var location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{movimientoId}")
                .buildAndExpand(response.movimientoId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/buscar")
    public List<MovimientoResponse> buscar(
            @RequestParam(required = false) String cuentaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin
    ) {
        return movimientosUseCase.buscar(cuentaId, inicio, fin).stream().map(this::toResponse).toList();
    }


    @GetMapping
    public List<MovimientoResponse> obtenerMovimientos() {
        return movimientosUseCase.obtenerTodos().stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/cuentas/{cuentaId}/extracciones-diarias")
    public SaldoExtraccionesDiariasResponse obtenerSaldoExtraccionesDiarias(
            @PathVariable String cuentaId,
            @RequestParam LocalDate fecha
    ) {
        return new SaldoExtraccionesDiariasResponse(
                cuentaId,
                fecha,
                movimientosUseCase.obtenerSaldoExtraccionesDiarias(cuentaId, fecha)
        );
    }

    @GetMapping("/{movimientoId}")
    public MovimientoResponse obtenerPorId(@PathVariable String movimientoId) {
        return toResponse(movimientosUseCase.obtenerPorId(movimientoId));
    }

    @PutMapping("/{movimientoId}")
    public MovimientoResponse actualizar(
            @PathVariable String movimientoId,
            @Valid @RequestBody MovimientoRequest request
    ) {
        return toResponse(movimientosUseCase.actualizar(movimientoId, toCommand(request)));
    }

    @DeleteMapping("/{movimientoId}")
    public ResponseEntity<Void> eliminar(@PathVariable String movimientoId) {
        movimientosUseCase.eliminar(movimientoId);
        return ResponseEntity.noContent().build();
    }


    private MovimientoCommand toCommand(MovimientoRequest request) {
        return new MovimientoCommand(
                request.cuentaId(),
                request.fecha(),
                TipoMovimiento.from(request.tipoMovimiento()),
                request.valor(),
                request.estado()
        );
    }

    private MovimientoResponse toResponse(Movimiento movimiento) {
        return new MovimientoResponse(
                movimiento.movimientoId(),
                movimiento.cuentaId(),
                movimiento.fecha(),
                movimiento.tipoMovimiento(),
                movimiento.valor(),
                movimiento.estado()
        );
    }
}
