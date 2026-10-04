package santacruz.jeremias.bancaExample.application.command;

public record ClienteCommand(
        String contrasena,
        String estado,
        String nombre,
        String genero,
        Long edad,
        String identificacion,
        String direccion,
        String telefono
) {
}
