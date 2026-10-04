package santacruz.jeremias.bancaExample.domain.exception;

public class ClienteNoOperativoException extends RuntimeException {
    public ClienteNoOperativoException(String clienteId) {
        super("El cliente " + clienteId + " no está activo.");
    }
}
