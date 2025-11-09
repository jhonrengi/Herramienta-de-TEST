from __future__ import annotations

from typing import Any, Dict, Iterable

from .task import Task


class Actor:
    def __init__(self, name: str, abilities: Dict[str, Any] | None = None) -> None:
        self.name = name
        self.abilities: Dict[str, Any] = abilities or {}

    @classmethod
    def named(cls, name: str) -> "Actor":
        return cls(name)

    def who_can(self, **abilities: Any) -> "Actor":
        self.abilities.update(abilities)
        return self

    def ability(self, name: str) -> Any:
        if name not in self.abilities:
            raise KeyError(f"El actor {self.name} no tiene la habilidad '{name}'")
        return self.abilities[name]

    def attempts_to(self, *tasks: Iterable[Task]) -> None:
        for task in tasks:
            task.perform_as(self)
