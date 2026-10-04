package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.jpa.hibernate.ddl-auto=create"
)
@Testcontainers
class ClienteEntityHttpIntegrationTest {

    private static final Pattern CLIENTE_ID_PATTERN = Pattern.compile("\"clienteId\"\\s*:\\s*\"([^\"]+)\"");

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("clientes_http_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort
    private int port;

    @Test
    void shouldCreateAndRetrieveClienteOverHttp() throws Exception {
        String createRequest = """
                {
                  "contrasena": "clave",
                  "estado": "activo",
                  "nombre": "Ana",
                  "genero": "Femenino",
                  "edad": 28,
                  "identificacion": "123456",
                  "direccion": "Calle 1",
                  "telefono": "555-0100"
                }
                """;
        HttpClient httpClient = HttpClient.newHttpClient();

        HttpRequest createHttpRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/clientes"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(createRequest))
                .build();
        HttpResponse<String> createResponse = httpClient.send(
                createHttpRequest,
                HttpResponse.BodyHandlers.ofString()
        );

        assertThat(createResponse.statusCode()).isEqualTo(200);
        String id = extractClienteId(createResponse.body());
        assertThat(id).isNotBlank();
        assertThat(createResponse.body()).contains("\"nombre\":\"Ana\"");

        HttpRequest getHttpRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/clientes/" + id))
                .GET()
                .build();
        HttpResponse<String> getResponse = httpClient.send(
                getHttpRequest,
                HttpResponse.BodyHandlers.ofString()
        );

        assertThat(getResponse.statusCode()).isEqualTo(200);
        assertThat(getResponse.body()).contains("\"identificacion\":\"123456\"");
        assertThat(extractClienteId(getResponse.body())).isEqualTo(id);
    }

    private String extractClienteId(String responseBody) {
        Matcher matcher = CLIENTE_ID_PATTERN.matcher(responseBody);
        assertThat(matcher.find()).as("response should contain clienteId").isTrue();
        return matcher.group(1);
    }
}
