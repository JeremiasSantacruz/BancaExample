package santacruz.jeremias.bancaExample.application.usecase.calcularSaldos;

import org.springframework.stereotype.Component;
import santacruz.jeremias.bancaExample.application.port.in.CalcularSaldoUseCase;
import santacruz.jeremias.bancaExample.domain.enums.TipoCuenta;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoPermitidoException;

import java.math.BigDecimal;

@Component
public class PlazoFijoUseCase implements CalcularSaldoUseCase {
    @Override
    public Boolean support(TipoCuenta tipoCuenta) {
        return TipoCuenta.PLAZO_FIJO == tipoCuenta;
    }

    @Override
    public BigDecimal calcularSaldo(BigDecimal saldo, BigDecimal valor) {
        throw new MovimientoNoPermitidoException();
    }

}
