package com.cantinhodoauau.repository;

import com.cantinhodoauau.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findAllByOrderByNameAsc();
    List<Client> findByNameContainingIgnoreCaseOrTutorNameContainingIgnoreCase(String petName, String tutorName);
}
