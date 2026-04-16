package com.cantinhodoauau.model;

public enum PetGender {
    MACHO("Macho"),
    FEMEA("Fêmea");

    private final String label;

    PetGender(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
