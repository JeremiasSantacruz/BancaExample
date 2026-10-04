package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import santacruz.jeremias.bancaExample.domain.model.Cuenta;

import java.math.BigDecimal;

public record CuentaResponse(
        String clienteId,
        String cuentaId,
        String tipoCuenta,
        String estado,
        BigDecimal saldo
) {
    public static CuentaResponse from(Cuenta cuenta) {
        return new CuentaResponse(
                cuenta.clienteId(),
                cuenta.cuentaId(),
                cuenta.tipoCuenta().name(),
                cuenta.estado().name(),
                cuenta.saldo()
        );
    }
}
