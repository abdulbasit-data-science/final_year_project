from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional
from supabase import create_client, Client
from app.config import settings
from app.schemas.monitoring import FrameAnalysisRequest, FrameAnalysisResponse
from app.services.processor import FrameProcessor

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

supabase = None
processor = FrameProcessor()


def get_supabase() -> Client:
    global supabase
    if supabase is None:
        from supabase import ClientOptions
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
            options=ClientOptions(
                auto_refresh_token=False,
                persist_session=False,
            ),
        )
    return supabase


def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    supabase = get_supabase()
    try:
        return supabase.auth.get_user(token)
    except:
        return None


@router.post("/analyze", response_model=FrameAnalysisResponse)
async def analyze_frame(request: FrameAnalysisRequest, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        result = processor.process_frame(request.frame_data, request.attempt_id)
        return FrameAnalysisResponse(
            success=result["success"],
            violations=result["violations"],
            processed=result["processed"],
            stats=result.get("stats"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset", response_model=dict)
async def reset_processor():
    processor.reset()
    return {"success": True, "message": "Processor reset"}


@router.post("/heartbeat", response_model=dict)
async def heartbeat(attempt_id: str, event_type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    existing = supabase.table("exam_sessions").select("*").eq(
        "attempt_id", attempt_id
    ).eq("is_active", True).execute()

    if existing.data:
        supabase.table("exam_sessions").update({
            "session_end": "now()",
        }).eq("id", existing.data[0]["id"]).execute()

    session = supabase.table("exam_sessions").insert({
        "attempt_id": attempt_id,
        "is_active": True,
        "session_start": "now()",
    }).execute()

    return {
        "success": True,
        "data": session.data[0] if session.data else None,
    }


@router.get("/session/{attempt_id}", response_model=dict)
async def get_session(attempt_id: str, authorization: Optional[str] = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = supabase.table("exam_sessions").select("*").eq(
        "attempt_id", attempt_id
    ).eq("is_active", True).single().execute()

    return {
        "success": True,
        "data": session.data if session.data else None,
    }


@router.delete("/session/{attempt_id}", response_model=dict)
async def end_session(attempt_id: str, authorization: Optional[str] = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    supabase.table("exam_sessions").update({
        "is_active": False,
        "session_end": "now()",
    }).eq("attempt_id", attempt_id).execute()

    return {
        "success": True,
        "message": "Session ended successfully",
    }
