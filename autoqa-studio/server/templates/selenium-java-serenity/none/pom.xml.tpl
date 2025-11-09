<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.logictest</groupId>
  <artifactId>{{projectName}}</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <serenity.version>4.1.17</serenity.version>
    <serenity.maven.version>4.1.17</serenity.maven.version>
    <webdriver.driver>chrome</webdriver.driver>
    <encoding>UTF-8</encoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>net.serenity-bdd</groupId>
      <artifactId>serenity-core</artifactId>
      <version>${serenity.version}</version>
    </dependency>
    <dependency>
      <groupId>net.serenity-bdd</groupId>
      <artifactId>serenity-junit5</artifactId>
      <version>${serenity.version}</version>
    </dependency>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>4.23.1</version>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.2</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>net.serenity-bdd.maven.plugins</groupId>
        <artifactId>serenity-maven-plugin</artifactId>
        <version>${serenity.maven.version}</version>
      </plugin>
    </plugins>
  </build>
</project>
