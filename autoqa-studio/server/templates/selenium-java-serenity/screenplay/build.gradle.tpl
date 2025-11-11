plugins {
    id 'java'
    id 'net.serenity-bdd.serenity-gradle-plugin' version '4.1.17'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'net.serenity-bdd:serenity-core:4.1.17'
    implementation 'net.serenity-bdd:serenity-screenplay:4.1.17'
    implementation 'net.serenity-bdd:serenity-screenplay-webdriver:4.1.17'
    implementation 'net.serenity-bdd:serenity-cucumber:4.1.17'
    implementation 'io.cucumber:cucumber-java:7.18.0'
    implementation 'io.cucumber:cucumber-junit-platform-engine:7.18.0'
    testImplementation 'org.junit.jupiter:junit-jupiter-api:5.10.2'
    testRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine:5.10.2'
}

serenity {
    requirementsDir = "src/test/resources/features"
}

test {
    useJUnitPlatform()
    systemProperty 'cucumber.junit-platform.naming-strategy', 'long'
}
