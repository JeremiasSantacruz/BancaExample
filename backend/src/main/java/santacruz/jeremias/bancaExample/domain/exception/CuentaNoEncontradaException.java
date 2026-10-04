package santacruz.jeremias.bancaExample.domain.exception;

public class CuentaNoEncontradaException extends RuntimeException {
    public CuentaNoEncontradaException(String cuentaId) {
        super("No existe una cuenta con id " + cuentaId + ".");
    }
}
