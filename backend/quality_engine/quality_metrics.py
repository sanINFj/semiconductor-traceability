"""Core quality metrics for semiconductor manufacturing lots."""


def calculate_final_test_yield(passing_dies: int, tested_dies: int) -> float:
    """Return final-test yield as a percentage.

    Args:
        passing_dies: Number of dies that passed final test.
        tested_dies: Total number of dies tested.

    Raises:
        ValueError: If the counts are invalid.
    """
    if isinstance(passing_dies, bool) or not isinstance(passing_dies, int):
        raise ValueError("passing_dies must be an integer")

    if isinstance(tested_dies, bool) or not isinstance(tested_dies, int):
        raise ValueError("tested_dies must be an integer")

    if tested_dies <= 0:
        raise ValueError("tested_dies must be greater than zero")

    if passing_dies < 0:
        raise ValueError("passing_dies cannot be negative")

    if passing_dies > tested_dies:
        raise ValueError("passing_dies cannot exceed tested_dies")

    return (passing_dies / tested_dies) * 100
