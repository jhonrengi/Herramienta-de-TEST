export class Actor {
  constructor(name, abilities = {}) {
    this.name = name;
    this.abilities = abilities;
  }

  static named(name) {
    return new Actor(name);
  }

  whoCan(abilities) {
    this.abilities = { ...this.abilities, ...abilities };
    return this;
  }

  ability(name) {
    if (!this.abilities[name]) {
      throw new Error(`El actor ${this.name} no tiene la habilidad ${name}`);
    }
    return this.abilities[name];
  }

  attemptsTo(...tasks) {
    tasks.forEach(task => {
      task.performAs(this);
    });
  }
}
