"""Equipment vocabulary clean-up (pure functions, no I/O).

The workout library was written by hand, so the same thing appears under several spellings
(``dumbbell``/``dumbbells``, ``mat``/``yoga mat``, ``stationary-bike``/``stationary bike``),
``none`` means "no equipment", and some entries are alternatives ("treadmill or outdoor
space", "assault bike or stationary bike"). Matching raw strings would wrongly exclude
those workouts, so both the library and the user's equipment go through ``canonical``.

Found by loading the real 250-row library (Phase 3): 19 workouts say ``none`` instead of
``bodyweight`` and about 30 use a variant spelling.
"""

import re

BODYWEIGHT = "bodyweight"

# Spelling variants -> the one canonical name. Keys are already normalised (see ``_key``).
_ALIASES = {
    "none": BODYWEIGHT,
    "no equipment": BODYWEIGHT,
    "mat": "yoga mat",
    "blocks": "yoga blocks",
    "dumbbell": "dumbbells",
    "resistance bands": "resistance band",
    "rowing machine": "rower",
    "elliptical machine": "elliptical",
    "stair climber machine": "stair climber",
    "bike": "stationary bike",
    "jump box": "plyo box",
    "pull up bar": "pull-up bar",
}

# Things everybody has or that cost nothing: a workout that needs only these is bodyweight.
_UBIQUITOUS = frozenset(
    {
        "outdoor space",
        "outdoors",
        "outdoor track",
        "track",
        "stairs",
        "chair",
        "sturdy chair",
        "comfortable shoes",
        "running shoes",
        "cycling shoes",
    }
)

_ALTERNATIVE_SPLIT = re.compile(r"\s+or\s+")


def _key(raw: str) -> str:
    return " ".join(raw.lower().replace("-", " ").replace("_", " ").split())


def canonical(raw: str) -> str:
    """One name for one thing. Alternatives ("a or b") are handled by ``alternatives``."""
    key = _key(raw)
    if key in _UBIQUITOUS:
        return BODYWEIGHT
    return _ALIASES.get(key, key)


def alternatives(raw: str) -> frozenset[str]:
    """The canonical options that satisfy one ``equipment_needed`` entry.

    "treadmill or outdoor space" -> {treadmill, bodyweight}: a person with no equipment can
    still do it, so a ``bodyweight`` option means the entry never excludes anyone.
    """
    options = {canonical(part) for part in _ALTERNATIVE_SPLIT.split(_key(raw)) if part}
    return frozenset(options)


def requirement_groups(equipment_needed: list[object]) -> list[frozenset[str]]:
    """One group of acceptable options per entry; the workout needs one from every group."""
    return [alternatives(str(item)) for item in equipment_needed if str(item).strip()]


def label(group: frozenset[str]) -> str:
    """Display form of one requirement group, e.g. ``assault bike or stationary bike``."""
    return " or ".join(sorted(group))


def vocabulary(raw_items: list[str]) -> set[str]:
    """Every canonical option users may pick, from the library's raw entries.

    Always contains ``bodyweight``.
    """
    names: set[str] = {BODYWEIGHT}
    for raw in raw_items:
        names |= alternatives(raw)
    return names
