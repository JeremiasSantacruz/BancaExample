package santacruz.jeremias.bancaExample.domain.exception;

public class SaldoInsuficienteException extends RuntimeException {
    public SaldoInsuficienteException(String cuentaId) {
        super("Saldo insuficiente en la cuenta " + cuentaId + ".");
    }
}
