package com.logictest.tasks;

import com.logictest.model.Credentials;
import com.logictest.support.LocatorRepository;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Enter;
import net.serenitybdd.screenplay.actions.Open;
import net.serenitybdd.screenplay.actions.Click;

public class Authenticate {

    public static Task with(Credentials credentials) {
        return Task.where("el usuario inicia sesión",
            Open.url("/login"),
            Enter.theValue(credentials.email()).into(LocatorRepository.by("input_email")),
            Enter.theValue(credentials.password()).into(LocatorRepository.by("input_password")),
            Click.on(LocatorRepository.by("btn_login"))
        );
    }
}
