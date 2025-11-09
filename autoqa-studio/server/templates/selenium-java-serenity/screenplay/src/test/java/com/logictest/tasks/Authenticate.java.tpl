package com.logictest.tasks;

import com.logictest.model.Credentials;
import com.logictest.ui.LoginPage;
import net.serenitybdd.screenplay.Performable;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Click;
import net.serenitybdd.screenplay.actions.Enter;

public class Authenticate {

    public static Performable with(Credentials credentials) {
        return Task.where("{0} autentica al usuario",
            Enter.theValue(credentials.email()).into(LoginPage.EMAIL_FIELD),
            Enter.theValue(credentials.password()).into(LoginPage.PASSWORD_FIELD),
            Click.on(LoginPage.SIGN_IN_BUTTON)
        );
    }
}
