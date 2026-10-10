"""Data model for a semiconductor manufacturing lot."""

from dataclasses import dataclass


@dataclass
class ManufacturingLot:
    lot_id: str
    product_id: str
    tested_dies: int
    passing_dies: int
    process_step: str
    equipment_id: str
    recipe_revision: str

    def __post_init__(self):
        # IDs and manufacturing context must not be empty.
        required_fields = {
            "lot_id": self.lot_id,
            "product_id": self.product_id,
            "process_step": self.process_step,
            "equipment_id": self.equipment_id,
            "recipe_revision": self.recipe_revision,
        }

        for field_name, value in required_fields.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field_name} must be a non-empty string")

        # Validate the test counts.
        if isinstance(self.tested_dies, bool) or not isinstance(
            self.tested_dies, int
        ):
            raise ValueError("tested_dies must be an integer")

        if isinstance(self.passing_dies, bool) or not isinstance(
            self.passing_dies, int
        ):
            raise ValueError("passing_dies must be an integer")

        if self.tested_dies <= 0:
            raise ValueError("tested_dies must be greater than zero")

        if not 0 <= self.passing_dies <= self.tested_dies:
            raise ValueError(
                "passing_dies must be between zero and tested_dies"
            )

    @property
    def failed_dies(self) -> int:
        return self.tested_dies - self.passing_dies

    @property
    def final_test_yield(self) -> float:
        return (self.passing_dies / self.tested_dies) * 100
