package santacruz.jeremias.bancaExample.domain.model;

import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCuenta;

import java.math.BigDecimal;

public record EstadoCuentaMovimiento(
        String clienteId,
        BigDecimal saldoActual,
        BigDecimal extraccionesDiarias,
        EstadoCuenta estadoCuenta,
        EstadoCliente estadoCliente
) {
}
