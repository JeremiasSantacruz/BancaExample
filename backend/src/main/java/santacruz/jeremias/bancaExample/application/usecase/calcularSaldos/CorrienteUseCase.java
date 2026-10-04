package santacruz.jeremias.bancaExample.application.usecase.calcularSaldos;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.SaldoInsuficienteException;

import java.math.BigDecimal;

@Component
public class CorrienteUseCase implements CalcularSaldoUseCase {
    @Value("${cuenta.corriente.saldo.minimo:-1000}")
    private BigDecimal saldoMinimo;

    @Override
    public Boolean support(TipoCuenta tipoCuenta) {
        return TipoCuenta.CORRIENTE == tipoCuenta;
    }

    @Override
    public BigDecimal calcularSaldo(BigDecimal saldo, BigDecimal valor) {
        BigDecimal nuevoSaldo = saldo.add(valor);
        if (nuevoSaldo.compareTo(saldoMinimo) < 0) {
            throw new SaldoInsuficienteException("El saldo no puede ser menor al saldo mínimo permitido para cuentas corrientes.");
        }
        return nuevoSaldo;
    }

}
