package com.logictest.questions;

import com.logictest.ui.LoginPage;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.Question;

public class LoginFormVisible implements Question<Boolean> {

    public static Question<Boolean> displayed() {
        return new LoginFormVisible();
    }

    @Override
    public Boolean answeredBy(Actor actor) {
        return LoginPage.SIGN_IN_BUTTON.resolveFor(actor).isVisible();
    }
}
