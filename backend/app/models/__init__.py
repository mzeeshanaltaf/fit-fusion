"""SQLAlchemy models for the tables this backend owns.

Deliberately NOT modelled (protected, never modified): ``exercise_videos``,
``workout_details`` and their ``_backup`` copies. Better Auth's tables (``user``,
``session``, ``account``, ``verification``, ``jwks``) belong to the Next.js app.
"""

from app.models.base import Base
from app.models.credits import UserCreditAccount, UserCreditTransaction
from app.models.job import GenerationJob, WorkoutLog
from app.models.plan import FitnessPlan
from app.models.user_profile import UserProfile

__all__ = [
    "Base",
    "FitnessPlan",
    "GenerationJob",
    "UserCreditAccount",
    "UserCreditTransaction",
    "UserProfile",
    "WorkoutLog",
]
