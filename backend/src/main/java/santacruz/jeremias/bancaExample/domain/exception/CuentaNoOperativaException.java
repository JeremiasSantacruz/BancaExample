package santacruz.jeremias.bancaExample.domain.exception;

public class CuentaNoOperativaException extends RuntimeException {
    public CuentaNoOperativaException(String cuentaId) {
        super("La cuenta " + cuentaId + " no está activa.");
    }
}
