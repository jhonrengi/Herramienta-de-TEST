from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

if False:  # pragma: no cover
    from .actor import Actor


@dataclass
class Task:
    description: str
    performer: Callable[["Actor"], None]

    def perform_as(self, actor: "Actor") -> None:
        self.performer(actor)


def define_task(description: str, performer: Callable[["Actor"], None]) -> Task:
    return Task(description=description, performer=performer)
