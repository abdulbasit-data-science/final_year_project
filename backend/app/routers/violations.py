from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import List, Optional
from supabase import create_client, Client
from app.config import settings
from app.schemas.violation import (
    ViolationCreate,
    ViolationResponse,
)

router = APIRouter(prefix="/violations", tags=["Violations"])

supabase: Optional[Client] = None


def get_supabase() -> Client:
    global supabase
    if supabase is None:
        from supabase import ClientOptions
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
            options=ClientOptions(
                auto_refresh_token=False,
                persist_session=False
            )
        )
    return supabase

@router.get("/all", response_model=dict)
async def get_all_violations(authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    violations = supabase.table("violations").select("*").order("detected_at", desc=True).execute()

    return {
        "success": True,
        "data": violations.data
    }


def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    supabase = get_supabase()
    try:
        return supabase.auth.get_user(token)
    except:
        return None


@router.post("", response_model=dict)
async def create_violation(violation_data: ViolationCreate, authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    violation = supabase.table("violations").insert({
        "attempt_id": str(violation_data.attempt_id),
        "violation_type": violation_data.violation_type.value,
        "severity": violation_data.severity.value,
        "description": violation_data.description,
        "frame_snapshot_url": violation_data.frame_snapshot_url
    }).execute()

    attempt = supabase.table("exam_attempts").update({
        "status": "flagged" if violation_data.severity.value == "high" else "in_progress"
    }).eq("id", str(violation_data.attempt_id)).execute()

    return {
        "success": True,
        "data": violation.data[0] if violation.data else None
    }


@router.get("/attempt/{attempt_id}", response_model=dict)
async def get_attempt_violations(attempt_id: str, authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    violations = supabase.table("violations").select("*").eq(
        "attempt_id", attempt_id
    ).order("detected_at", desc=False).execute()

    return {
        "success": True,
        "data": violations.data
    }


@router.get("/student/{student_id}", response_model=dict)
async def get_student_violations(student_id: str, authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    profile = supabase.table("profiles").select("*").eq("id", student_id).single().execute()

    if not profile.data or profile.data["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    attempts = supabase.table("exam_attempts").select("id").eq(
        "student_id", student_id
    ).execute()

    attempt_ids = [a["id"] for a in attempts.data]

    if not attempt_ids:
        return {
            "success": True,
            "data": []
        }

    violations = supabase.table("violations").select("*").in_(
        "attempt_id", attempt_ids
    ).order("detected_at", desc=False).execute()

    return {
        "success": True,
        "data": violations.data
    }


@router.get("/report/{attempt_id}", response_model=dict)
async def get_violation_report(attempt_id: str, authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    attempt = supabase.table("exam_attempts").select("*").eq("id", attempt_id).single().execute()

    if not attempt.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )

    exam = supabase.table("exams").select("*").eq(
        "id", str(attempt.data["exam_id"])
    ).single().execute()

    violations = supabase.table("violations").select("*").eq(
        "attempt_id", attempt_id
    ).order("detected_at", desc=False).execute()

    violation_summary = {}
    for v in violations.data:
        vtype = v["violation_type"]
        if vtype not in violation_summary:
            violation_summary[vtype] = {
                "type": vtype,
                "count": 0,
                "severity": v["severity"]
            }
        violation_summary[vtype]["count"] += 1

    return {
        "success": True,
        "data": {
            "attempt": attempt.data,
            "exam": exam.data if exam.data else None,
            "violations": violations.data,
            "summary": list(violation_summary.values()),
            "total_violations": len(violations.data)
        }
    }


@router.patch("/{violation_id}", response_model=dict)
async def update_violation(
    violation_id: str,
    severity: Optional[str] = None,
    notes: Optional[str] = None,
    authorization: str = Header(None)
):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    update_data = {}
    if severity:
        update_data["severity"] = severity

    if update_data:
        supabase.table("violations").update(update_data).eq("id", violation_id).execute()

    return {
        "success": True,
        "message": "Violation updated successfully"
    }
