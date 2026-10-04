package santacruz.jeremias.bancaExample.application.usecase.calcularSaldos;

import org.springframework.stereotype.Component;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.SaldoInsuficienteException;

import java.math.BigDecimal;

@Component
public class SaldoAhorroUseCase implements CalcularSaldoUseCase {
    @Override
    public Boolean support(TipoCuenta tipoCuenta) {
        return TipoCuenta.AHORRO == tipoCuenta;
    }

    @Override
    public BigDecimal calcularSaldo(BigDecimal saldo, BigDecimal valor) {
        BigDecimal nuevoSaldo = saldo.add(valor);
        if (nuevoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            throw new SaldoInsuficienteException("Saldo insuficiente para realizar la operación");
        }
        return nuevoSaldo;
    }

}
