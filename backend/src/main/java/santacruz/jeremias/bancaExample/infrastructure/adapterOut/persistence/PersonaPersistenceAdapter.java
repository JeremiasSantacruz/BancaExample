package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;


import org.springframework.stereotype.Service;
import santacruz.jeremias.bancaExample.application.dto.PersonaDto;
import santacruz.jeremias.bancaExample.application.port.out.PersonaPersistencePort;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

import java.util.Optional;

@Service
public class PersonaPersistenceAdapter implements PersonaPersistencePort {
    private final PersonaJpaRepository repository;

    public PersonaPersistenceAdapter(PersonaJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Boolean existsByIdentificacion(String identificacion) {
        return repository.existsByIdentificacion(identificacion);
    }

    @Override
    public PersonaDto crearPersona(PersonaDto personaDto) {
        PersonaEntity repositoryEntity = repository.save(new PersonaEntity(
                personaDto.getNombre(),
                personaDto.getGenero(),
                personaDto.getEdad(),
                personaDto.getIdentificacion(),
                personaDto.getDireccion(),
                personaDto.getTelefono()
        ));
        return null;
    }

    @Override
    public Optional<PersonaDto> getPersonaById(String personaId) {
        return null;
    }

    @Override
    public PersonaDto actualizarPersona(String personaId, PersonaDto personaDto) {
        return null;
    }

    @Override
    public void eliminarPersona(String personaId) {

    }
}
