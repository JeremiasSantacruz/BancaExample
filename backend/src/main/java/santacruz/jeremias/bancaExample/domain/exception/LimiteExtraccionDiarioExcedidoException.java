package santacruz.jeremias.bancaExample.domain.exception;

public class LimiteExtraccionDiarioExcedidoException extends RuntimeException {
    public LimiteExtraccionDiarioExcedidoException(String cuentaId) {
        super("La extracción supera el límite diario permitido para la cuenta " + cuentaId + ".");
    }
}
