class Actor:
    def __init__(self, name: str, abilities: dict):
        self.name = name
        self.abilities = abilities

    def ability(self, name: str):
        return self.abilities[name]

    def perform(self, *tasks):
        for task in tasks:
            task(self)
