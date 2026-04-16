package com.cantinhodoauau.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String tutorName;
    private String tutorPhone;
    private String tutorEmail;
    private String tutorAddress;
    private String tutorNeighborhood;
    private String tutorCpf;

    private String name;
    private String breed;
    
    @Enumerated(EnumType.STRING)
    private PetSize petSize;
    
    private Double weight;
    private LocalDate birthDate;
    private String photo;
    
    @Enumerated(EnumType.STRING)
    private PetGender gender;
    
    private Boolean castrated;
    private LocalDateTime entryDate;

    private LocalDate lastGripe;
    private LocalDate lastV10;
    private LocalDate lastRaiva;
    private LocalDate lastGiardia;
    private LocalDate lastAntipulgas;

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VaccineRecord> vaccineHistory;

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FleaRecord> fleaHistory;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Client() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (entryDate == null) {
            entryDate = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTutorName() { return tutorName; }
    public void setTutorName(String tutorName) { this.tutorName = tutorName; }
    public String getTutorPhone() { return tutorPhone; }
    public void setTutorPhone(String tutorPhone) { this.tutorPhone = tutorPhone; }
    public String getTutorEmail() { return tutorEmail; }
    public void setTutorEmail(String tutorEmail) { this.tutorEmail = tutorEmail; }
    public String getTutorAddress() { return tutorAddress; }
    public void setTutorAddress(String tutorAddress) { this.tutorAddress = tutorAddress; }
    public String getTutorNeighborhood() { return tutorNeighborhood; }
    public void setTutorNeighborhood(String tutorNeighborhood) { this.tutorNeighborhood = tutorNeighborhood; }
    public String getTutorCpf() { return tutorCpf; }
    public void setTutorCpf(String tutorCpf) { this.tutorCpf = tutorCpf; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }
    public PetSize getPetSize() { return petSize; }
    public void setPetSize(PetSize petSize) { this.petSize = petSize; }
    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public PetGender getGender() { return gender; }
    public void setGender(PetGender gender) { this.gender = gender; }
    public Boolean getCastrated() { return castrated; }
    public void setCastrated(Boolean castrated) { this.castrated = castrated; }
    public LocalDateTime getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDateTime entryDate) { this.entryDate = entryDate; }
    public LocalDate getLastGripe() { return lastGripe; }
    public void setLastGripe(LocalDate lastGripe) { this.lastGripe = lastGripe; }
    public LocalDate getLastV10() { return lastV10; }
    public void setLastV10(LocalDate lastV10) { this.lastV10 = lastV10; }
    public LocalDate getLastRaiva() { return lastRaiva; }
    public void setLastRaiva(LocalDate lastRaiva) { this.lastRaiva = lastRaiva; }
    public LocalDate getLastGiardia() { return lastGiardia; }
    public void setLastGiardia(LocalDate lastGiardia) { this.lastGiardia = lastGiardia; }
    public LocalDate getLastAntipulgas() { return lastAntipulgas; }
    public void setLastAntipulgas(LocalDate lastAntipulgas) { this.lastAntipulgas = lastAntipulgas; }
    public List<VaccineRecord> getVaccineHistory() { return vaccineHistory; }
    public void setVaccineHistory(List<VaccineRecord> vaccineHistory) { this.vaccineHistory = vaccineHistory; }
    public List<FleaRecord> getFleaHistory() { return fleaHistory; }
    public void setFleaHistory(List<FleaRecord> fleaHistory) { this.fleaHistory = fleaHistory; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
