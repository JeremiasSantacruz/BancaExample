package santacruz.jeremias.bancaExample.infrastructure.adapterIn;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import santacruz.jeremias.bancaExample.application.command.ClienteCommand;
import santacruz.jeremias.bancaExample.application.dto.Pagina;
import santacruz.jeremias.bancaExample.application.dto.Paginacion;
import santacruz.jeremias.bancaExample.application.port.in.ClienteUseCase;
import santacruz.jeremias.bancaExample.domain.model.Cliente;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.contracts.ClienteContracts;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteResponse;
import santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto.ClienteRequest;

import java.util.Locale;

@RestController
@RequestMapping("/clientes")
public class ClienteController implements ClienteContracts {

    private final ClienteUseCase clienteUseCase;

    public ClienteController(ClienteUseCase clienteUseCase) {
        this.clienteUseCase = clienteUseCase;
    }

    @PostMapping
    public ClienteResponse crearCliente(@Valid @RequestBody ClienteRequest request) {
        return toResponse(clienteUseCase.crear(toCommand(request)));
    }

    @GetMapping()
    public Pagina<ClienteResponse> obtenerClientes(@RequestParam(required = false) String nombre,
                                        @RequestParam(required = false) String identificacion,
                                        @RequestParam(required = false) String estado,
                                        @RequestParam(required = false) String search,
                                        @RequestParam(required = false) Integer page,
                                        @RequestParam(required = false) String size) {
        return clienteUseCase.buscar(nombre, identificacion, estado, search, Paginacion.of(page, size))
                .map(this::toResponse);
    }

    @GetMapping("/{clienteId}")
    public ClienteResponse getClienteById(@PathVariable String clienteId) {
        return toResponse(clienteUseCase.obtenerPorId(clienteId));
    }

    @PutMapping("/{clienteId}")
    public ClienteResponse actualizarCliente(
            @PathVariable String clienteId,
            @RequestBody ClienteRequest request
    ) {
        return toResponse(clienteUseCase.actualizar(clienteId, toCommand(request)));
    }

    @DeleteMapping("/{clienteId}")
    public void eliminarCliente(@PathVariable String clienteId) {
        clienteUseCase.eliminar(clienteId);
    }

    private ClienteCommand toCommand(ClienteRequest request) {
        return new ClienteCommand(
                request.contrasena(),
                request.estado(),
                request.nombre(),
                request.genero(),
                request.edad(),
                request.identificacion(),
                request.direccion(),
                request.telefono()
        );
    }

    private ClienteResponse toResponse(Cliente cliente) {
        return new ClienteResponse(
                cliente.clienteId(),
                cliente.contrasena(),
                cliente.estado().name().toLowerCase(Locale.ROOT),
                cliente.nombre(),
                cliente.genero(),
                cliente.edad(),
                cliente.identificacion(),
                cliente.direccion(),
                cliente.telefono()
        );
    }
}
