from fastapi import APIRouter

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.analytics import EquipmentList
from app.services import library

router = APIRouter(prefix="/library", tags=["library"])


@router.get("/equipment", summary="Equipment names the generate form can offer")
async def equipment(_: ActiveUserDep, session: SessionDep) -> EquipmentList:
    """Canonical, de-duplicated names (``none`` and spelling variants are folded away).
    An empty selection in the form means no restriction; pick ``bodyweight`` to limit
    the plan to workouts that need no gear."""
    return EquipmentList(equipment=sorted(await library.equipment_vocabulary(session)))
