package santacruz.jeremias.bancaExample.domain.model;

public class Persona {
    private final String nombre;
    private final String genero;
    private final Long edad;
    private final String identificacion;
    private final String direccion;
    private final String telefono;

    public Persona(String nombre, String genero, Long edad, String identificacion, String direccion, String telefono) {
        this.nombre = nombre;
        this.genero = genero;
        this.edad = edad;
        this.identificacion = identificacion;
        this.direccion = direccion;
        this.telefono = telefono;
    }

    public String nombre() {
        return nombre;
    }

    public String genero() {
        return genero;
    }

    public Long edad() {
        return edad;
    }

    public String identificacion() {
        return identificacion;
    }

    public String direccion() {
        return direccion;
    }

    public String telefono() {
        return telefono;
    }
}
