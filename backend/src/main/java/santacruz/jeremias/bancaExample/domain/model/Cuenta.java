package santacruz.jeremias.bancaExample.domain.model;

import java.math.BigDecimal;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;

public record Cuenta(
        String cuentaId,
        String clienteId,
        TipoCuenta tipoCuenta,
        BigDecimal saldo,
        EstadoCuenta estado
) {
}
