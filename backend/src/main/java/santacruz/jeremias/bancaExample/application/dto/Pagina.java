package santacruz.jeremias.bancaExample.application.dto;

import java.util.List;
import java.util.function.Function;

/**
 * Una página de resultados de un listado.
 *
 * Es el equivalente propio de `Page` de Spring Data: los controladores la
 * devuelven tal cual para no filtrar la paginación de Spring por la API, y los
 * casos de uso la usan como tipo de retorno de las consultas.
 *
 * @param content       elementos de la página pedida
 * @param page          índice de la página, empezando en 0
 * @param size          cantidad de elementos por página
 * @param totalElements cantidad total de elementos que cumplen el filtro
 * @param totalPages    cantidad total de páginas
 * @param first         `true` si es la primera página
 * @param last          `true` si no hay páginas siguientes
 */
public record Pagina<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {

    public Pagina {
        content = List.copyOf(content);
    }

    /**
     * Calcula los metadatos a partir del contenido y del total informado.
     */
    public static <T> Pagina<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalElements / size);

        return new Pagina<>(
                content,
                page,
                size,
                totalElements,
                totalPages,
                page == 0,
                page >= totalPages - 1
        );
    }

    /**
     * Página sin resultados, con la paginación pedida.
     */
    public static <T> Pagina<T> vacia(int page, int size) {
        return of(List.of(), page, size, 0);
    }

    /**
     * Traduce el contenido sin perder la paginación, para que un caso de uso
     * pueda devolver entidades y el adaptador exponga DTOs.
     */
    public <R> Pagina<R> map(Function<T, R> mapper) {
        return new Pagina<>(
                content.stream().map(mapper).toList(),
                page,
                size,
                totalElements,
                totalPages,
                first,
                last
        );
    }
}
