package santacruz.jeremias.bancaExample.application.port.in;

import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;

import java.math.BigDecimal;

public interface CalcularSaldoUseCase {
    Boolean support(TipoCuenta tipoCuenta);
    BigDecimal calcularSaldo(BigDecimal saldo, BigDecimal valor);
}
