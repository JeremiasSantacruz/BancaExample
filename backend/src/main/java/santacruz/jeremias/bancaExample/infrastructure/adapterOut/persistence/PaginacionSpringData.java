package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;

import java.util.List;
import java.util.function.Function;

/**
 * Traduce entre la paginación de la aplicación y la de Spring Data.
 *
 * Vive en la capa de salida porque es lo único que conoce `Pageable`: los
 * puertos siguen hablando en `Paginacion` y `Pagina`.
 */
final class PaginacionSpringData {

    private PaginacionSpringData() {
    }

    /**
     * `Pageable` con el orden por defecto del listado, que los repositorios
     * declaran para que la paginación sea estable entre páginas.
     */
    static Pageable toPageable(Paginacion paginacion, Sort ordenPorDefecto) {
        return paginacion.todos()
                ? PageRequest.of(0, Integer.MAX_VALUE, ordenPorDefecto)
                : PageRequest.of(paginacion.page(), paginacion.size(), ordenPorDefecto);
    }

    /**
     * Convierte una `Page` de Spring Data en la `Pagina` de la aplicación.
     *
     * Cuando la consulta vino sin límite (`size=all`) la respuesta se presenta
     * como una única página que lo contiene todo, en vez de exponer un tamaño
     * artificial enorme.
     */
    static <E, D> Pagina<D> toPagina(Page<E> page, Paginacion paginacion, Function<E, D> mapper) {
        List<D> content = page.getContent().stream().map(mapper).toList();

        if (paginacion.todos()) {
            long total = content.size();
            return Pagina.of(content, 0, (int) total, total);
        }

        return Pagina.of(content, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    /**
     * Interpreta el texto de búsqueda como id, para que escribir un número
     * encuentre la entidad exacta. Un texto que no es un número simplemente no
     * agrega el criterio por id.
     */
    static Long toIdOpcional(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        try {
            return Long.valueOf(texto.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
