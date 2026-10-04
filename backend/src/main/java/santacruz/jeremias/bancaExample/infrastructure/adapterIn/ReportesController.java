package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import santacruz.jeremias.bancaExample.application.port.in.ReporteUseCase;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.CuentaResponse;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.MovimientoResponse;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.Report;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reportes")
public class ReportesController {
    private final ReporteUseCase reportes;

    public ReportesController(ReporteUseCase reportes) {
        this.reportes = reportes;
    }

    @GetMapping
    public List<Report> generar(
            @RequestParam @NotNull(message = "El cliente es obligatorio") String clienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return reportes.generar(clienteId, inicio, fin).entrySet().stream()
                .map(entry -> Report.from(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }
}
