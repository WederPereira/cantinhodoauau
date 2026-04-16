package com.cantinhodoauau.repository;

import com.cantinhodoauau.model.VaccineRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface VaccineRecordRepository extends JpaRepository<VaccineRecord, Long> {
    List<VaccineRecord> findByClientIdOrderByDateDesc(UUID clientId);
}
