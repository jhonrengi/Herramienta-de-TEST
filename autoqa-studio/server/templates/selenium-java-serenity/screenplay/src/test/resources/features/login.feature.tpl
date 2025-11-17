# language: es
Característica: Inicio de sesión
  Como usuario quiero iniciar sesión para acceder a mis aplicaciones internas

  Escenario: Autenticación exitosa
    Dado que el usuario abre la página de login
    Cuando ingresa credenciales válidas
    Entonces debería visualizar el formulario de login
