package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import java.math.BigDecimal;

public record CuentaRequest(
        String clienteId,
        String tipoCuenta,
        String estado,
        BigDecimal saldoInicial
) {
}
