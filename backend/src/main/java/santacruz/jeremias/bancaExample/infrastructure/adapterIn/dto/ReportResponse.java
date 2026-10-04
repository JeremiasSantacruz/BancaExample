package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import java.util.List;

public record ReportResponse(
        List<Report> reports
) {
}
