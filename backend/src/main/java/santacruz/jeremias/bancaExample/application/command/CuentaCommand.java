package santacruz.jeremias.bancaExample.application.command;

import java.math.BigDecimal;

public record CuentaCommand(
        String clienteId,
        String tipoCuenta,
        BigDecimal saldoInicial,
        String estado
) {
}
