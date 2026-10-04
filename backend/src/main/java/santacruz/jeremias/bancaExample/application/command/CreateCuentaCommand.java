package santacruz.jeremias.bancaExample.application.command;

public record CreateCuentaCommand(
        String clienteId,
        String tipoCuenta
) {
}
