package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.in.ReporteUseCase;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.Report;

import java.time.LocalDate;

@RestController
@RequestMapping("/reportes")
public class ReportesController {
    private final ReporteUseCase reportes;

    public ReportesController(ReporteUseCase reportes) {
        this.reportes = reportes;
    }

    /**
     * La respuesta es una página de cuentas: cada elemento trae su cuenta y los
     * movimientos del rango, para que el frontend muestre un bloque por cuenta.
     */
    @GetMapping
    public Pagina<Report> generar(
            @RequestParam @NotNull(message = "El cliente es obligatorio") String clienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) String size) {
        return reportes.generar(clienteId, inicio, fin, Paginacion.of(page, size)).map(Report::from);
    }
}
