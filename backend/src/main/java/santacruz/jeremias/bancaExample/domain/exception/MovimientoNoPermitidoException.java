package santacruz.jeremias.bancaExample.domain.exception;

public class MovimientoNoPermitidoException extends RuntimeException {
    public MovimientoNoPermitidoException() {
        super("No se permite el movimiento para este tipo de cuentas.");
    }
}
