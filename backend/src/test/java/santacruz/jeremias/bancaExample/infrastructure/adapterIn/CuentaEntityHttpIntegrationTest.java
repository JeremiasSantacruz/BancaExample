package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.ClienteJpaRepository;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.jpa.hibernate.ddl-auto=create"
)
@Testcontainers
class CuentaEntityHttpIntegrationTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("cuentas_http_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private ClienteJpaRepository clienteJpaRepository;

    @LocalServerPort
    private int port;

    @Test
    void shouldCreateReadUpdateAndDeleteCuentaOverHttp() throws Exception {
        ClienteEntity clienteEntity = crearCliente();
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> createResponse = send(
                httpClient,
                HttpRequest.newBuilder()
                        .uri(uri("/cuentas"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(cuentaRequest(clienteEntity.getId(), "AHORRO", "1250.75")))
                        .build()
        );

        assertThat(createResponse.statusCode()).isEqualTo(200);
        String cuentaId = tools.jackson.databind.json.JsonMapper.builder().build()
                .readTree(createResponse.body()).get("cuentaId").asText();
        String location = uri("/cuentas/" + clienteEntity.getId() + "/" + cuentaId).toString();
        assertThat(createResponse.body()).contains("\"tipoCuenta\":\"AHORRO\"");
        assertThat(createResponse.body()).contains("\"saldo\":0");

        HttpResponse<String> readResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).GET().build()
        );
        assertThat(readResponse.statusCode()).isEqualTo(200);
        assertThat(readResponse.body()).contains("\"clienteId\":\"" + clienteEntity.getId() + "\"");

        HttpResponse<String> updateResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location))
                        .header("Content-Type", "application/json")
                        .PUT(HttpRequest.BodyPublishers.ofString(
                                cuentaRequest(clienteEntity.getId(), "CORRIENTE", "2000.00")
                        ))
                        .build()
        );
        assertThat(updateResponse.statusCode()).isEqualTo(200);
        assertThat(updateResponse.body()).contains("\"tipoCuenta\":\"CORRIENTE\"");
        assertThat(updateResponse.body()).contains("\"saldo\":2000.00");

        HttpResponse<String> listResponse = send(
                httpClient,
                HttpRequest.newBuilder(uri("/cuentas/" + clienteEntity.getId())).GET().build()
        );
        assertThat(listResponse.statusCode()).isEqualTo(200);
        assertThat(listResponse.body()).contains("\"tipoCuenta\":\"CORRIENTE\"");

        HttpResponse<String> deleteResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).DELETE().build()
        );
        assertThat(deleteResponse.statusCode()).isEqualTo(204);

        HttpResponse<String> missingResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).GET().build()
        );
        assertThat(missingResponse.statusCode()).isEqualTo(200);
        assertThat(missingResponse.body()).contains("\"estado\":\"cerrada\"");
    }

    private ClienteEntity crearCliente() {
        return clienteJpaRepository.saveAndFlush(new ClienteEntity(
                new PersonaEntity(
                        "Ana",
                        "Femenino",
                        28L,
                        "cuenta-test-" + System.nanoTime(),
                        "Calle 1",
                        "555-0100"
                ),
                "clave",
                "activo"
        ));
    }

    private HttpResponse<String> send(HttpClient client, HttpRequest request) throws Exception {
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private String cuentaRequest(Long clienteId, String tipoCuenta, String saldoInicial) {
        return """
                {
                  "clienteId": "%d",
                  "tipoCuenta": "%s",
                  "estado": "activa",
                  "saldoInicial": %s
                }
                """.formatted(clienteId, tipoCuenta, saldoInicial);
    }
}
