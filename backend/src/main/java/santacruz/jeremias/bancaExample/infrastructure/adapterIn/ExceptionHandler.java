package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteDuplicadoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoOperativoException;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoEncontradaException;
import santacruz.jeremias.bancaExample.domain.exception.CuentaNoOperativaException;
import santacruz.jeremias.bancaExample.domain.exception.LimiteExtraccionDiarioExcedidoException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.exception.MovimientoNoCorregibleException;
import santacruz.jeremias.bancaExample.domain.exception.SaldoInsuficienteException;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ApiError;

import java.util.Comparator;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ExceptionHandler {

    @org.springframework.web.bind.annotation.ExceptionHandler({
            ClienteNoEncontradoException.class,
            CuentaNoEncontradaException.class,
            MovimientoNoEncontradoException.class
    })
    public ResponseEntity<ApiError> handleNotFound(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(exception.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(ClienteDuplicadoException.class)
    public ResponseEntity<ApiError> handleDuplicate(ClienteDuplicadoException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(exception.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleInvalidArgument(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(new ApiError(exception.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .sorted(Comparator.comparing(FieldError::getField))
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return badRequest("Errores de validación: " + message);
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableRequest(HttpMessageNotReadableException exception) {
        return badRequest("El cuerpo de la solicitud no es válido o tiene un formato incorrecto.");
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingRequestParameter(MissingServletRequestParameterException exception) {
        return badRequest("El parámetro '" + exception.getParameterName() + "' es obligatorio.");
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return badRequest("El valor de '" + exception.getName() + "' no tiene un formato válido.");
    }

    @org.springframework.web.bind.annotation.ExceptionHandler({
            SaldoInsuficienteException.class,
            LimiteExtraccionDiarioExcedidoException.class,
            MovimientoNoCorregibleException.class,
            ClienteNoOperativoException.class,
            CuentaNoOperativaException.class
    })
    public ResponseEntity<ApiError> handleBusinessRule(RuntimeException exception) {
        return ResponseEntity.unprocessableEntity().body(new ApiError(exception.getMessage()));
    }

    private ResponseEntity<ApiError> badRequest(String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(message));
    }
}
