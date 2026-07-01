from enum import Enum


class InputMode(Enum):
    # Single image to a single ControlNet unit.
    SIMPLE = "simple"
    # Input is a directory. N generations. Each generation takes 1 input image from the directory.
    BATCH = "batch"
    # Upload multiple images via gallery. N generations.
    MERGE = "merge"


class HiResFixOption(Enum):
    BOTH = "Both"
    LOW_RES_ONLY = "Low res only"
    HIGH_RES_ONLY = "High res only"

    @staticmethod
    def from_value(value) -> "HiResFixOption":
        if isinstance(value, str) and value.startswith("HiResFixOption."):
            _, field = value.split(".")
            return getattr(HiResFixOption, field)
        if isinstance(value, str):
            return HiResFixOption(value)
        elif isinstance(value, int):
            return [x for x in HiResFixOption][value]
        else:
            assert isinstance(value, HiResFixOption)
            return value

    @property
    def low_res_enabled(self) -> bool:
        return self in (HiResFixOption.BOTH, HiResFixOption.LOW_RES_ONLY)

    @property
    def high_res_enabled(self) -> bool:
        return self in (HiResFixOption.BOTH, HiResFixOption.HIGH_RES_ONLY)
