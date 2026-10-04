package santacruz.jeremias.bancaExample.domain.exception;

public class ClienteNoEncontradoException extends RuntimeException {
    public ClienteNoEncontradoException(String clienteId) {
        super("No existe un cliente con id " + clienteId + ".");
    }
}
