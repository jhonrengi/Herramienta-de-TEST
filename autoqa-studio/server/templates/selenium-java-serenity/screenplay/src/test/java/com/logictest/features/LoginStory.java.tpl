package com.logictest.features;

import com.logictest.model.Credentials;
import com.logictest.tasks.Authenticate;
import net.serenitybdd.junit5.SerenityTest;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.abilities.BrowseTheWeb;
import net.serenitybdd.annotations.Managed;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;

@SerenityTest
class LoginStory {

    @Managed
    WebDriver hisBrowser;

    Actor qa;

    @BeforeEach
    void prepareActor() {
        qa = Actor.named("QA Analyst").whoCan(BrowseTheWeb.with(hisBrowser));
    }

    @Test
    void user_can_authenticate() {
        qa.attemptsTo(Authenticate.with(Credentials.demoUser()));
    }
}
