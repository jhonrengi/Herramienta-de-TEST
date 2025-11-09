/// Actor minimalista para el patrón Screenplay
export class Actor {
  constructor(name, abilities) {
    this.name = name;
    this.abilities = abilities;
  }

  ability(name) {
    return this.abilities[name];
  }

  async attemptsTo(...tasks) {
    for (const task of tasks) {
      await task(this);
    }
  }
}
