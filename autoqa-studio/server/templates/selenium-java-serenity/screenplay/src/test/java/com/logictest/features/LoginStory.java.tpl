package com.logictest.features;

import com.logictest.model.Credentials;
import com.logictest.tasks.Authenticate;
import com.logictest.tasks.NavigateToLogin;
import net.serenitybdd.annotations.Managed;
import net.serenitybdd.junit5.SerenityTest;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.abilities.BrowseTheWeb;
import net.serenitybdd.screenplay.ensure.Ensure;
import net.serenitybdd.screenplay.questions.page.TheWebPage;
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
        qa.attemptsTo(
            NavigateToLogin.page(),
            Authenticate.with(Credentials.demoUser()),
            Ensure.that(TheWebPage.currentUrl()).containsIgnoringCase("/dashboard")
        );
    }
}
