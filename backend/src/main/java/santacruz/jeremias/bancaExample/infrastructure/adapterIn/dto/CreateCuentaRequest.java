package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;


public record CreateCuentaRequest(
        String clienteId,
        String tipoCuenta
) {
}
