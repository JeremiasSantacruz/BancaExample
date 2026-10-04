package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.port.in.ClienteUseCase;
import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;
import santacruz.jeremias.bancaExample.domain.exception.ClienteNoEncontradoException;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.domain.model.Persona;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClienteController.class)
class ClienteEntityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClienteUseCase clienteUseCase;

    @Test
    void shouldCreateCliente() throws Exception {
        when(clienteUseCase.crear(any(ClienteCommand.class))).thenReturn(cliente());

        mockMvc.perform(post("/clientes")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "contrasena": "secret",
                                  "estado": "activo",
                                  "nombre": "John Doe",
                                  "genero": "Masculino",
                                  "edad": 30,
                                  "identificacion": "123456",
                                  "direccion": "Calle 1",
                                  "telefono": "555-0100"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contrasena").value("secret"))
                .andExpect(jsonPath("$.estado").value("activo"))
                .andExpect(jsonPath("$.nombre").value("John Doe"))
                .andExpect(jsonPath("$.edad").value(30));

        var clienteCaptor = org.mockito.ArgumentCaptor.forClass(ClienteCommand.class);
        verify(clienteUseCase).crear(clienteCaptor.capture());
        assertThat(clienteCaptor.getValue().nombre()).isEqualTo("John Doe");
        assertThat(clienteCaptor.getValue().identificacion()).isEqualTo("123456");
    }

    @Test
    void shouldGetClienteById() throws Exception {
        when(clienteUseCase.obtenerPorId("1")).thenReturn(cliente());

        mockMvc.perform(get("/clientes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clienteId").value("1"))
                .andExpect(jsonPath("$.nombre").value("John Doe"))
                .andExpect(jsonPath("$.telefono").value("555-0100"));

        verify(clienteUseCase).obtenerPorId("1");
    }

    @Test
    void shouldListClientes() throws Exception {
        when(clienteUseCase.buscar(null, null, null, null, Paginacion.porDefecto()))
                .thenReturn(Pagina.of(java.util.List.of(cliente()), 0, 10, 1));

        mockMvc.perform(get("/clientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].clienteId").value("1"))
                .andExpect(jsonPath("$.content[0].nombre").value("John Doe"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true));

        verify(clienteUseCase).buscar(null, null, null, null, Paginacion.porDefecto());
    }

    @Test
    void shouldUpdateCliente() throws Exception {
        when(clienteUseCase.actualizar(org.mockito.ArgumentMatchers.eq("1"), any(ClienteCommand.class)))
                .thenReturn(cliente());

        mockMvc.perform(put("/clientes/1")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "clienteId": "1",
                                  "contrasena": "secret",
                                  "estado": "activo",
                                  "nombre": "John Doe",
                                  "genero": "Masculino",
                                  "edad": 30,
                                  "identificacion": "123456",
                                  "direccion": "Calle 1",
                                  "telefono": "555-0100"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clienteId").value("1"))
                .andExpect(jsonPath("$.nombre").value("John Doe"));

        verify(clienteUseCase).actualizar(org.mockito.ArgumentMatchers.eq("1"), any(ClienteCommand.class));
    }

    @Test
    void shouldDeleteCliente() throws Exception {
        mockMvc.perform(delete("/clientes/1"))
                .andExpect(status().isOk());

        verify(clienteUseCase).eliminar("1");
    }

    @Test
    void shouldReturnNotFoundWhenClienteDoesNotExist() throws Exception {
        when(clienteUseCase.obtenerPorId("404")).thenThrow(new ClienteNoEncontradoException("404"));

        mockMvc.perform(get("/clientes/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("No existe un cliente con id 404."));
    }

    @Test
    void shouldReturnReadableBadRequestForValidationErrors() throws Exception {
        mockMvc.perform(post("/clientes")
                        .contentType(APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Errores de validación:")))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("nombre: es obligatorio.")));

        verifyNoInteractions(clienteUseCase);
    }

    private Cliente cliente() {
        return new Cliente(
                "1",
                new Persona("John Doe", "Masculino", 30L, "123456", "Calle 1", "555-0100"),
                "secret",
                EstadoCliente.ACTIVO
        );
    }
}
