package com.logictest.tasks;

import com.logictest.ui.LoginPage;
import net.serenitybdd.screenplay.Performable;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Open;

public class NavigateToLogin {

    public static Performable page() {
        return Task.where("{0} navega a la pantalla de login",
            Open.url(LoginPage.LOGIN_URL)
        );
    }
}
