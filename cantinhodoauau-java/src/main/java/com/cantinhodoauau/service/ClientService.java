package com.cantinhodoauau.service;

import com.cantinhodoauau.model.*;
import com.cantinhodoauau.repository.ClientRepository;
import com.cantinhodoauau.repository.FleaRecordRepository;
import com.cantinhodoauau.repository.VaccineRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final VaccineRecordRepository vaccineRecordRepository;
    private final FleaRecordRepository fleaRecordRepository;

    public ClientService(ClientRepository clientRepository, 
                         VaccineRecordRepository vaccineRecordRepository, 
                         FleaRecordRepository fleaRecordRepository) {
        this.clientRepository = clientRepository;
        this.vaccineRecordRepository = vaccineRecordRepository;
        this.fleaRecordRepository = fleaRecordRepository;
    }

    public List<Client> getAllClients() {
        return clientRepository.findAllByOrderByNameAsc();
    }

    public Client getClientById(UUID id) {
        return clientRepository.findById(id).orElseThrow(() -> new RuntimeException("Cliente não encontrado"));
    }

    @Transactional
    public Client saveClient(Client client) {
        return clientRepository.save(client);
    }

    @Transactional
    public void deleteClient(UUID id) {
        clientRepository.deleteById(id);
    }

    @Transactional
    public VaccineRecord addVaccineRecord(UUID clientId, VaccineType type, LocalDate date, String notes) {
        Client client = getClientById(clientId);
        
        VaccineRecord record = new VaccineRecord();
        record.setClient(client);
        record.setType(type);
        record.setDate(date);
        record.setNotes(notes);
        
        VaccineRecord saved = vaccineRecordRepository.save(record);
        
        // Update denormalized latest date on client
        switch (type) {
            case GRIPE -> client.setLastGripe(date);
            case V10 -> client.setLastV10(date);
            case RAIVA -> client.setLastRaiva(date);
            case GIARDIA -> client.setLastGiardia(date);
        }
        clientRepository.save(client);
        
        return saved;
    }

    @Transactional
    public FleaRecord addFleaRecord(UUID clientId, LocalDate date, String brand, Integer durationMonths, String notes) {
        Client client = getClientById(clientId);
        
        FleaRecord record = new FleaRecord();
        record.setClient(client);
        record.setDate(date);
        record.setBrand(brand);
        record.setDurationMonths(durationMonths);
        record.setNotes(notes);
        
        FleaRecord saved = fleaRecordRepository.save(record);
        
        // Update denormalized latest date
        client.setLastAntipulgas(date);
        clientRepository.save(client);
        
        return saved;
    }

    // Business Logic: Profile Completeness
    public int calculateProfileCompleteness(Client client) {
        int fields = 11;
        int filled = 0;
        if (client.getTutorName() != null && !client.getTutorName().isEmpty()) filled++;
        if (client.getTutorPhone() != null && !client.getTutorPhone().isEmpty()) filled++;
        if (client.getTutorEmail() != null && !client.getTutorEmail().isEmpty()) filled++;
        if (client.getTutorCpf() != null && !client.getTutorCpf().isEmpty()) filled++;
        if (client.getTutorAddress() != null && !client.getTutorAddress().isEmpty()) filled++;
        if (client.getBreed() != null && !client.getBreed().isEmpty()) filled++;
        if (client.getPetSize() != null) filled++;
        if (client.getWeight() != null) filled++;
        if (client.getGender() != null) filled++;
        if (client.getCastrated() != null) filled++;
        if (client.getBirthDate() != null) filled++;
        
        return (int) Math.round(((double) filled / fields) * 100);
    }
}
