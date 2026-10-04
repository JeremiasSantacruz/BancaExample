package santacruz.jeremias.bancaExample.domain.exception;

public class MovimientoNoEncontradoException extends RuntimeException {
    public MovimientoNoEncontradoException(String movimientoId) {
        super("No existe un movimiento con id " + movimientoId + ".");
    }
}
