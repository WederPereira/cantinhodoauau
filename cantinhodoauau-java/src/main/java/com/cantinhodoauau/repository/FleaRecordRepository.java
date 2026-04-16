package com.cantinhodoauau.repository;

import com.cantinhodoauau.model.FleaRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface FleaRecordRepository extends JpaRepository<FleaRecord, Long> {
    List<FleaRecord> findByClientIdOrderByDateDesc(UUID clientId);
}
