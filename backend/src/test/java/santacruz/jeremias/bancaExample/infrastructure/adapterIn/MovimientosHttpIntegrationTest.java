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
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.command.CuentaCommand;
import santacruz.jeremias.bancaExample.application.port.in.ClienteUseCase;
import santacruz.jeremias.bancaExample.application.port.in.CuentaUseCase;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.ClienteJpaRepository;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence.CuentaJpaRepository;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.jpa.hibernate.ddl-auto=create"
)
@Testcontainers
class MovimientosHttpIntegrationTest {

    @Container
    private static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("movimientos_http_test")
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

    @Autowired
    private CuentaJpaRepository cuentaJpaRepository;

    @Autowired
    private ClienteUseCase clienteUseCase;

    @Autowired
    private CuentaUseCase cuentaUseCase;

    @LocalServerPort
    private int port;

    @Test
    void shouldCreateReadUpdateAndDeleteMovimientoOverHttp() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta();
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> createResponse = send(
                httpClient,
                HttpRequest.newBuilder(uri("/movimientos"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                movimientoRequest(cuentaEntity.getId(), "RETIRO", "125.50")
                        ))
                        .build()
        );

        assertThat(createResponse.statusCode()).isEqualTo(201);
        String location = createResponse.headers().firstValue("Location").orElseThrow();
        String movimientoId = extractId(createResponse.body());
        assertThat(movimientoId).isNotBlank();
        assertThat(createResponse.body()).contains("\"tipoMovimiento\":\"RETIRO\"");
        assertThat(createResponse.body()).contains("\"cuentaId\":\"" + cuentaEntity.getId() + "\"");

        HttpResponse<String> readResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).GET().build()
        );
        assertThat(readResponse.statusCode()).isEqualTo(200);
        assertThat(extractId(readResponse.body())).isEqualTo(movimientoId);

        HttpResponse<String> updateResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location))
                        .header("Content-Type", "application/json")
                        .PUT(HttpRequest.BodyPublishers.ofString(
                                movimientoRequest(cuentaEntity.getId(), "DEPOSITO", "200.00")
                        ))
                        .build()
        );
        assertThat(updateResponse.statusCode()).isEqualTo(200);
        assertThat(updateResponse.body()).contains("\"tipoMovimiento\":\"DEPOSITO\"");
        assertThat(updateResponse.body()).contains("\"estado\":\"REVERSED_CORRECTION\"");
        String correctionId = extractId(updateResponse.body());
        assertThat(correctionId).isNotEqualTo(movimientoId);

        HttpResponse<String> originalAfterCorrection = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).GET().build()
        );
        assertThat(originalAfterCorrection.statusCode()).isEqualTo(200);
        assertThat(originalAfterCorrection.body()).contains("\"estado\":\"REVERSED\"");
        assertThat(extractId(originalAfterCorrection.body())).isEqualTo(movimientoId);
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("1200.00");

        HttpResponse<String> listResponse = send(
                httpClient,
                HttpRequest.newBuilder(uri("/movimientos")).GET().build()
        );
        assertThat(listResponse.statusCode()).isEqualTo(200);
        assertThat(listResponse.body()).contains("\"movimientoId\":\"" + movimientoId + "\"");
        assertThat(listResponse.body()).contains("\"movimientoId\":\"" + correctionId + "\"");

        HttpResponse<String> deleteResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).DELETE().build()
        );
        assertThat(deleteResponse.statusCode()).isEqualTo(204);

        HttpResponse<String> missingResponse = send(
                httpClient,
                HttpRequest.newBuilder(URI.create(location)).GET().build()
        );
        assertThat(missingResponse.statusCode()).isEqualTo(404);
    }

    @Test
    void shouldGetDailyWithdrawalBalanceOverHttp() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta();
        HttpClient httpClient = HttpClient.newHttpClient();
        send(httpClient, HttpRequest.newBuilder(uri("/movimientos"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        movimientoRequest(cuentaEntity.getId(), "DEBITO", "125.50")
                ))
                .build());
        send(httpClient, HttpRequest.newBuilder(uri("/movimientos"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        movimientoRequest(cuentaEntity.getId(), "DEPOSITO", "40.00")
                ))
                .build());

        HttpResponse<String> response = send(httpClient, HttpRequest.newBuilder(
                uri("/movimientos/cuentas/" + cuentaEntity.getId() + "/extracciones-diarias?fecha=2026-10-02")
        ).GET().build());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"cuentaId\":\"" + cuentaEntity.getId() + "\"");
        assertThat(response.body()).contains("\"fecha\":\"2026-10-02\"");
        assertThat(response.body()).contains("\"totalExtraido\":125.50");
    }

    @Test
    void shouldRejectWithdrawalWhenBalanceIsInsufficient() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta(new BigDecimal("100.00"));
        HttpResponse<String> response = send(
                HttpClient.newHttpClient(),
                HttpRequest.newBuilder(uri("/movimientos"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                movimientoRequest(cuentaEntity.getId(), "RETIRO", "100.01")
                        ))
                        .build()
        );

        assertThat(response.statusCode()).isEqualTo(422);
        assertThat(response.body()).contains("Saldo insuficiente");
    }

    @Test
    void shouldRejectWithdrawalThatExceedsDailyLimit() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta(new BigDecimal("5000.00"));
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> firstResponse = createMovimiento(httpClient, cuentaEntity.getId(), "RETIRO", "600.00");
        HttpResponse<String> secondResponse = createMovimiento(httpClient, cuentaEntity.getId(), "RETIRO", "500.00");

        assertThat(firstResponse.statusCode()).isEqualTo(201);
        assertThat(secondResponse.statusCode()).isEqualTo(422);
        assertThat(secondResponse.body()).contains("límite diario");
    }

    @Test
    void concurrentWithdrawalsMustNotOverdrawTheAccount() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta(new BigDecimal("1000.00"));
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(uri("/movimientos"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        movimientoRequest(cuentaEntity.getId(), "RETIRO", "700.00")
                ))
                .build();

        CyclicBarrier startTogether = new CyclicBarrier(3);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = CompletableFuture.supplyAsync(
                    () -> sendAfterBarrier(httpClient, request, startTogether), executor
            );
            var second = CompletableFuture.supplyAsync(
                    () -> sendAfterBarrier(httpClient, request, startTogether), executor
            );
            startTogether.await();
            HttpResponse<String> firstResponse = first.join();
            HttpResponse<String> secondResponse = second.join();

            assertThat(List.of(firstResponse.statusCode(), secondResponse.statusCode()))
                    .containsExactlyInAnyOrder(201, 422);
        }
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("300.00");
    }

    @Test
    void shouldUpdateStoredAccountBalanceForDebitAndCredit() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta(new BigDecimal("1000.00"));
        HttpClient httpClient = HttpClient.newHttpClient();

        HttpResponse<String> debitResponse = createMovimiento(
                httpClient, cuentaEntity.getId(), "RETIRO", "125.50"
        );
        HttpResponse<String> creditResponse = createMovimiento(
                httpClient, cuentaEntity.getId(), "DEPOSITO", "20.00"
        );

        assertThat(debitResponse.statusCode()).isEqualTo(201);
        assertThat(creditResponse.statusCode()).isEqualTo(201);
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("894.50");
    }

    @Test
    void blockedClientePreventsMovementsWithoutChangingAccountStatus() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta();
        ClienteEntity cliente = clienteJpaRepository.findById(cuentaEntity.getCliente().getId()).orElseThrow();
        var persona = cliente.getPersona();
        clienteUseCase.actualizar(cliente.getId().toString(), new ClienteCommand(
                cliente.getContrasena(),
                "BLOQUEADO",
                persona.getNombre(),
                persona.getGenero(),
                persona.getEdad(),
                persona.getIdentificacion(),
                persona.getDireccion(),
                persona.getTelefono()
        ));

        HttpResponse<String> response = createMovimiento(
                HttpClient.newHttpClient(), cuentaEntity.getId(), "RETIRO", "50.00"
        );

        assertThat(response.statusCode()).isEqualTo(422);
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getEstado())
                .isEqualTo("activa");
        assertThat(clienteJpaRepository.findById(cliente.getId()).orElseThrow().getEstado())
                .isEqualTo("bloqueado");
    }

    @Test
    void blockedCuentaPreventsMovementsWithoutChangingClienteStatus() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta();
        cuentaUseCase.actualizar(cuentaEntity.getId().toString(), new CuentaCommand(
                cuentaEntity.getCliente().getId().toString(),
                cuentaEntity.getTipoCuenta(),
                cuentaEntity.getSaldoActual(),
                "BLOQUEADA"
        ));

        HttpResponse<String> response = createMovimiento(
                HttpClient.newHttpClient(), cuentaEntity.getId(), "RETIRO", "50.00"
        );

        assertThat(response.statusCode()).isEqualTo(422);
        assertThat(clienteJpaRepository.findById(cuentaEntity.getCliente().getId()).orElseThrow().getEstado())
                .isEqualTo("activo");
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getEstado())
                .isEqualTo("bloqueada");
    }

    private HttpResponse<String> createMovimiento(
            HttpClient httpClient,
            Long cuentaId,
            String tipoMovimiento,
            String valor
    ) throws Exception {
        return send(
                httpClient,
                HttpRequest.newBuilder(uri("/movimientos"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(movimientoRequest(cuentaId, tipoMovimiento, valor)))
                        .build()
        );
    }

    private CuentaEntity crearCuenta() {
        return crearCuenta(new BigDecimal("1000.00"));
    }

    private CuentaEntity crearCuenta(BigDecimal saldoInicial) {
        ClienteEntity clienteEntity = clienteJpaRepository.saveAndFlush(new ClienteEntity(
                new PersonaEntity(
                        "Ana",
                        "Femenino",
                        28L,
                        "movimiento-http-" + System.nanoTime(),
                        "Calle 1",
                        "555-0100"
                ),
                "clave",
                "activo"
        ));
        return cuentaJpaRepository.saveAndFlush(
                new CuentaEntity(clienteEntity, "AHORRO", saldoInicial, "activa")
        );
    }

    private HttpResponse<String> sendUnchecked(HttpClient client, HttpRequest request) {
        try {
            return send(client, request);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private HttpResponse<String> sendAfterBarrier(
            HttpClient client,
            HttpRequest request,
            CyclicBarrier startTogether
    ) {
        try {
            startTogether.await();
            return send(client, request);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private HttpResponse<String> send(HttpClient client, HttpRequest request) throws Exception {
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private String movimientoRequest(Long cuentaId, String tipoMovimiento, String valor) {
        return """
                {
                  "cuentaId": "%d",
                  "fecha": "2026-10-02T12:30:00",
                  "tipoMovimiento": "%s",
                  "valor": %s,
                  "estado": "APLICADO"
                }
                """.formatted(cuentaId, tipoMovimiento, valor);
    }

    private String extractId(String responseBody) {
        var matcher = java.util.regex.Pattern.compile("\"movimientoId\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(responseBody);
        assertThat(matcher.find()).as("response should contain movimientoId").isTrue();
        return matcher.group(1);
    }
}
