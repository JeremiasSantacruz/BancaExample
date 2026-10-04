package santacruz.jeremias.bancaExample.domain.exception;

public class ClienteDuplicadoException extends RuntimeException {
    public ClienteDuplicadoException(String identificacion) {
        super("Ya existe un cliente con identificación " + identificacion + ".");
    }
}
