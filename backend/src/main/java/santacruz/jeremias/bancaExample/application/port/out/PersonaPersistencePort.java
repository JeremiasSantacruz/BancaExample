package santacruz.jeremias.bancaExample.application.port.out;

import santacruz.jeremias.bancaExample.application.dto.PersonaDto;

import java.util.Optional;

public interface PersonaPersistencePort {
    Boolean existsByIdentificacion(String identificacion);
    PersonaDto crearPersona(PersonaDto personaDto);
    Optional<PersonaDto> getPersonaById(String personaId);
    PersonaDto actualizarPersona(String personaId, PersonaDto personaDto);
    void eliminarPersona(String personaId);
}
