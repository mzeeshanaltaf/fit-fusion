"""Plan -> PDF (Jinja2 template, WeasyPrint).

Every value that came from the model or the user goes through Jinja's autoescape, and
video links are only emitted for https YouTube URLs, so a plan can never inject markup
or a ``javascript:`` link into the document. The template loads no external resources.
"""

import asyncio
from pathlib import Path
from urllib.parse import urlparse

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.schemas.plan import DayNutrition, Meal, PlanDetail

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

_YOUTUBE_HOSTS = frozenset({"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"})


def safe_video_url(value: str | None) -> str | None:
    """The library stores YouTube *URLs* in ``youtube_video_id``; link only real ones."""
    if not value:
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme == "https" and parsed.hostname in _YOUTUBE_HOSTS:
        return value.strip()
    return None


def _words(value: str) -> str:
    return value.replace("_", " ")


def _day_context(number: int, day: DayNutrition) -> dict:
    rows: list[tuple[str, Meal]] = [
        ("breakfast", day.breakfast),
        ("lunch", day.lunch),
        ("dinner", day.dinner),
        *[("snack", snack) for snack in day.snacks],
    ]
    meals = [
        {
            "slot": slot,
            "text": meal.meal,
            "calories": meal.calories,
            "protein_g": meal.protein_g,
            "carbs_g": meal.carbs_g,
            "fat_g": meal.fat_g,
        }
        for slot, meal in rows
    ]
    return {
        "number": number,
        "meals": meals,
        "total": {
            key: sum(m[key] for m in meals) for key in ("calories", "protein_g", "carbs_g", "fat_g")
        },
    }


def build_context(plan: PlanDetail) -> dict:
    targets = None
    if plan.target_calories is not None:
        targets = {
            "calories": plan.target_calories,
            "protein_g": plan.target_protein_g,
            "carbs_g": plan.target_carbs_g,
            "fat_g": plan.target_fat_g,
        }
    workouts = [
        {
            "name": w.workout_name,
            "category": _words(w.workout_category),
            "duration": w.workout_detail.duration_minutes,
            "equipment": ", ".join(w.workout_detail.equipment_needed),
            "exercises": [
                {
                    "name": e.exercise_name,
                    "sets": e.sets,
                    "reps": e.reps,
                    "rest": e.rest_seconds,
                    "video": safe_video_url(e.youtube_video_id),
                }
                for e in w.workout_detail.exercises
            ],
        }
        for w in plan.workout_plan.data
    ]
    nutrition = plan.nutrition_plan
    days = [_day_context(n, getattr(nutrition, f"day_{n}")) for n in range(1, 6)]
    weight = f"{plan.weight_kg:g}"
    height = f"{plan.height_cm:g}"
    return {
        "title": f"{_words(plan.fitness_goal)} plan",
        "subtitle": (f"{plan.training_level} level · {plan.days_per_week} training days a week"),
        "profile_line": (f"{plan.age} years · {plan.gender} · {weight} kg · {height} cm"),
        "diet_line": (
            "" if plan.diet_preference == "no_restriction" else _words(plan.diet_preference)
        ),
        "allergies": ", ".join(plan.allergies),
        "equipment": ", ".join(plan.equipment),
        "targets": targets,
        "workouts": workouts,
        "days": days,
        "created": plan.created_at.strftime("%d %b %Y"),
    }


def render_html(plan: PlanDetail) -> str:
    return _env.get_template("plan.html").render(**build_context(plan))


def render_pdf_sync(plan: PlanDetail) -> bytes:
    return HTML(string=render_html(plan)).write_pdf()


async def render_pdf(plan: PlanDetail) -> bytes:
    """WeasyPrint is CPU-bound and synchronous: keep it off the event loop."""
    return await asyncio.to_thread(render_pdf_sync, plan)
