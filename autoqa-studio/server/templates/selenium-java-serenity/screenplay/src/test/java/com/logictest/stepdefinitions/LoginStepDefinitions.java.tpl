package com.logictest.stepdefinitions;

import com.logictest.model.Credentials;
import com.logictest.questions.LoginFormVisible;
import com.logictest.tasks.Authenticate;
import com.logictest.tasks.NavigateToLogin;
import io.cucumber.java.Before;
import io.cucumber.java.es.Cuando;
import io.cucumber.java.es.Dado;
import io.cucumber.java.es.Entonces;
import net.serenitybdd.annotations.Managed;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.GivenWhenThen;
import net.serenitybdd.screenplay.abilities.BrowseTheWeb;
import org.openqa.selenium.WebDriver;

public class LoginStepDefinitions {

    @Managed
    WebDriver hisBrowser;

    private Actor qa;

    @Before
    public void prepareActor() {
        qa = Actor.named("QA Analyst");
        qa.can(BrowseTheWeb.with(hisBrowser));
    }

    @Dado("que el usuario abre la página de login")
    public void openLoginPage() {
        qa.attemptsTo(NavigateToLogin.page());
    }

    @Cuando("ingresa credenciales válidas")
    public void entersValidCredentials() {
        qa.attemptsTo(Authenticate.with(Credentials.demoUser()));
    }

    @Entonces("debería visualizar el formulario de login")
    public void shouldSeeLoginForm() {
        qa.should(GivenWhenThen.seeThat(LoginFormVisible.displayed()));
    }
}
