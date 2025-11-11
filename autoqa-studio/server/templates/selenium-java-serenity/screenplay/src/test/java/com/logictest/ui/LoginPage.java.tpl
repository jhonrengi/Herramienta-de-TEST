package com.logictest.ui;

import com.logictest.utils.LocatorRepository;
import net.serenitybdd.screenplay.targets.Target;

public final class LoginPage {

    private LoginPage() {}

    public static final String LOGIN_URL = "/login";

    public static final Target EMAIL_FIELD = LocatorRepository.target("input_email", "el campo de correo electrónico");
    public static final Target PASSWORD_FIELD = LocatorRepository.target("input_password", "el campo de contraseña");
    public static final Target SIGN_IN_BUTTON = LocatorRepository.target("btn_login", "el botón de iniciar sesión");
}
