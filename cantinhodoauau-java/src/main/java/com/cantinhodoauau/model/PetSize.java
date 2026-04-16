package com.cantinhodoauau.model;

public enum PetSize {
    PEQUENO("Pequeno"),
    MEDIO("Médio"),
    GRANDE("Grande"),
    GIGANTE("Gigante");

    private final String label;

    PetSize(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
