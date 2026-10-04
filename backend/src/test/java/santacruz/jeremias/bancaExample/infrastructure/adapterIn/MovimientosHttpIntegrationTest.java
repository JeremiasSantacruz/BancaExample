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

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
    void shouldCreateReadReverseAndRejectDeletingMovimientoOverHttp() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta();
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> creado = createMovimiento(httpClient, cuentaEntity.getId(), "RETIRO", "125.50");
        assertThat(creado.statusCode()).isEqualTo(201);
        assertThat(creado.body()).contains("\"estado\":\"APPROVED\"");
        String location = creado.headers().firstValue("Location").orElseThrow();
        String id = extractId(creado.body());
        HttpResponse<String> reversado = send(httpClient, HttpRequest.newBuilder(URI.create(location))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString("{\"estado\":\"REVERSED\"}")).build());
        assertThat(reversado.statusCode()).isEqualTo(200);
        assertThat(extractId(reversado.body())).isEqualTo(id);
        assertThat(reversado.body()).contains("\"estado\":\"REVERSED\"", "\"tipoMovimiento\":\"RETIRO\"", "\"valor\":125.50");
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("1000.00");
        HttpResponse<String> segundaReversa = send(httpClient, HttpRequest.newBuilder(URI.create(location))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString("{\"estado\":\"REVERSED\"}")).build());
        assertThat(segundaReversa.statusCode()).isEqualTo(422);
        assertThat(send(httpClient, HttpRequest.newBuilder(URI.create(location)).DELETE().build()).statusCode()).isEqualTo(400);
        assertThat(send(httpClient, HttpRequest.newBuilder(URI.create(location)).GET().build()).statusCode()).isEqualTo(200);
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("1000.00");
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

        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(response.body()).contains("\"estado\":\"REJECTED\"");
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("100.00");
    }

    @Test
    void shouldRejectWithdrawalThatExceedsDailyLimit() throws Exception {
        CuentaEntity cuentaEntity = crearCuenta(new BigDecimal("5000.00"));
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> firstResponse = createMovimiento(httpClient, cuentaEntity.getId(), "RETIRO", "600.00");
        HttpResponse<String> secondResponse = createMovimiento(httpClient, cuentaEntity.getId(), "RETIRO", "500.00");

        assertThat(firstResponse.statusCode()).isEqualTo(201);
        assertThat(secondResponse.statusCode()).isEqualTo(201);
        assertThat(secondResponse.body()).contains("\"estado\":\"REJECTED\"");
        assertThat(cuentaJpaRepository.findById(cuentaEntity.getId()).orElseThrow().getSaldoActual())
                .isEqualByComparingTo("4400.00");
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
                    .containsExactly(201, 201);
            assertThat(List.of(firstResponse.body(), secondResponse.body()))
                    .filteredOn(body -> body.contains("\"estado\":\"APPROVED\"")).hasSize(1);
            assertThat(List.of(firstResponse.body(), secondResponse.body()))
                    .filteredOn(body -> body.contains("\"estado\":\"REJECTED\"")).hasSize(1);
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
                  "estado": "APPROVED"
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
