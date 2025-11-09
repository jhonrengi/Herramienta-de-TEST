package com.logictest.model;

public record Credentials(String email, String password) {
    public static Credentials demoUser() {
        return new Credentials("user@example.com", "secret");
    }
}
