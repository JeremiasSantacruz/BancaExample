package santacruz.jeremias.bancaExample.domain.exception;

public class MovimientoNoCorregibleException extends RuntimeException {
    public MovimientoNoCorregibleException(String movimientoId) {
        super("El movimiento " + movimientoId + " no está aplicado o ya fue corregido.");
    }
}
