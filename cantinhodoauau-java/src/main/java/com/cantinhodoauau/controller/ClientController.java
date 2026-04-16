package com.cantinhodoauau.controller;

import com.cantinhodoauau.model.Client;
import com.cantinhodoauau.model.FleaRecord;
import com.cantinhodoauau.model.VaccineRecord;
import com.cantinhodoauau.model.VaccineType;
import com.cantinhodoauau.service.ClientService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*") 
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public List<Client> getAllClients() {
        return clientService.getAllClients();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> getClient(@PathVariable UUID id) {
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @PostMapping
    public Client createClient(@RequestBody Client client) {
        return clientService.saveClient(client);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> updateClient(@PathVariable UUID id, @RequestBody Client clientUpdates) {
        Client existing = clientService.getClientById(id);
        
        if (clientUpdates.getName() != null) existing.setName(clientUpdates.getName());
        if (clientUpdates.getTutorName() != null) existing.setTutorName(clientUpdates.getTutorName());
        
        return ResponseEntity.ok(clientService.saveClient(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClient(@PathVariable UUID id) {
        clientService.deleteClient(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vaccines")
    public ResponseEntity<VaccineRecord> addVaccine(
            @PathVariable UUID id,
            @RequestParam VaccineType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(clientService.addVaccineRecord(id, type, date, notes));
    }

    @PostMapping("/{id}/flea-treatments")
    public ResponseEntity<FleaRecord> addFleaTreatment(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String brand,
            @RequestParam Integer durationMonths,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(clientService.addFleaRecord(id, date, brand, durationMonths, notes));
    }
}
