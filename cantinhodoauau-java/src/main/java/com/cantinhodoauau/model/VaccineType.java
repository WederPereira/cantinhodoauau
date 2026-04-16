package com.cantinhodoauau.model;

public enum VaccineType {
    GRIPE("gripe"),
    V10("v10"),
    RAIVA("raiva"),
    GIARDIA("giardia");

    private final String key;

    VaccineType(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
