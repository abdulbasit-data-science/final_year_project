from fastapi import APIRouter, HTTPException, status, Header
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone
from supabase import create_client, Client
from app.config import settings
from app.schemas.attempt import (
    ExamAttemptCreate,
    ExamAttemptUpdate,
    ExamAttemptResponse,
    StudentAnswerCreate,
    StudentAnswerResponse,
)

router = APIRouter(prefix="/attempts", tags=["Attempts"])

supabase = None


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


def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return user_response
        return None
    except Exception as e:
        print(f"Error getting user from token: {e}")
        return None


@router.post("", response_model=dict)
async def start_attempt(attempt_data: ExamAttemptCreate, authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    existing = supabase.table("exam_attempts").select("*").eq(
        "exam_id", str(attempt_data.exam_id)
    ).eq("student_id", user.user.id).execute()

    if existing.data:
        existing_attempt = existing.data[0]
        if existing_attempt.get("status") == "in_progress":
            return {
                "success": True,
                "data": existing_attempt
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already attempted this exam. Multiple attempts are not allowed."
        )

    # Fetch exam to check time window
    exam = supabase.table("exams").select("*").eq("id", str(attempt_data.exam_id)).single().execute()
    if not exam.data:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    exam_data = exam.data
    now = datetime.now(timezone.utc)
    
    if exam_data.get("start_time"):
        start_time = datetime.fromisoformat(exam_data["start_time"])
        if now < start_time:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "This exam has not started yet",
                    "start_time": exam_data["start_time"]
                }
            )
            
    if exam_data.get("end_time"):
        end_time = datetime.fromisoformat(exam_data["end_time"])
        if now > end_time:
            raise HTTPException(status_code=400, detail="This exam has already ended")

    attempt = supabase.table("exam_attempts").insert({
        "exam_id": str(attempt_data.exam_id),
        "student_id": user.user.id,
        "status": "in_progress"
    }).execute()

    return {
        "success": True,
        "data": attempt.data[0] if attempt.data else None
    }


@router.get("/list", response_model=dict)
async def list_attempts(authorization: Optional[str] = Header(None)):
    try:
        supabase = get_supabase()
        user = get_user_from_token(authorization)
        if not user or not user.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        attempts = supabase.table("exam_attempts").select("*").order("started_at", desc=True).execute()

        student_ids = list(set(a.get("student_id") for a in attempts.data if a.get("student_id")))
        profiles_map = {}
        if student_ids:
            profiles = supabase.table("profiles").select("id, full_name, email").in_("id", student_ids).execute()
            for p in profiles.data or []:
                profiles_map[p["id"]] = p

        result_data = []
        for a in attempts.data:
            student_info = profiles_map.get(a.get("student_id"), {})
            a["student_name"] = student_info.get("full_name") or a.get("student_id")
            a["student_email"] = student_info.get("email") or ""
            result_data.append(a)

        return {"success": True, "data": result_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in list_attempts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{attempt_id}", response_model=dict)
async def get_attempt(attempt_id: UUID, authorization: Optional[str] = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)
    if not user or not user.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    attempt = supabase.table("exam_attempts").select("*").eq("id", str(attempt_id)).single().execute()
    if not attempt.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    answers = supabase.table("student_answers").select("*").eq("attempt_id", str(attempt_id)).execute()
    attempt_data = attempt.data
    attempt_data["answers"] = answers.data
    return {"success": True, "data": attempt_data}


@router.put("/{attempt_id}", response_model=dict)
async def update_attempt(
    attempt_id: str,
    attempt_data: ExamAttemptUpdate,
    authorization: str = Header(None)
):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    update_data = attempt_data.model_dump(exclude_unset=True)
    if update_data:
        supabase.table("exam_attempts").update(update_data).eq("id", attempt_id).execute()

    return {
        "success": True,
        "message": "Attempt updated successfully"
    }


@router.delete("/{attempt_id}", response_model=dict)
async def delete_attempt(attempt_id: str, authorization: Optional[str] = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    supabase.table("violations").delete().eq("attempt_id", attempt_id).execute()
    supabase.table("exam_sessions").delete().eq("attempt_id", attempt_id).execute()
    supabase.table("student_answers").delete().eq("attempt_id", attempt_id).execute()
    supabase.table("exam_attempts").delete().eq("id", attempt_id).execute()

    return {
        "success": True,
        "message": "Attempt deleted successfully"
    }


@router.post("/{attempt_id}/submit", response_model=dict)
async def submit_attempt(attempt_id: str, authorization: str = Header(None)):
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

    exam = supabase.table("exams").select("*").eq("id", str(attempt.data["exam_id"])).single().execute()
    questions = supabase.table("questions").select("*").eq(
        "exam_id", str(attempt.data["exam_id"])
    ).execute()
    answers = supabase.table("student_answers").select("*").eq(
        "attempt_id", attempt_id
    ).execute()

    score = 0
    for question in questions.data:
        answer = next(
            (a for a in answers.data if a["question_id"] == str(question["id"])),
            None
        )
        if answer and answer["selected_option"] == question["correct_option"]:
            score += question["marks"]

    supabase.table("exam_attempts").update({
        "status": "completed",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "score": score
    }).eq("id", attempt_id).execute()

    return {
        "success": True,
        "data": {"score": score}
    }




@router.get("/student/me", response_model=dict)
async def get_my_attempts(authorization: str = Header(None)):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    attempts = supabase.table("exam_attempts").select("*").eq(
        "student_id", user.user.id
    ).order("started_at", desc=True).execute()

    return {
        "success": True,
        "data": attempts.data
    }


@router.post("/{attempt_id}/answers", response_model=dict)
async def save_answers(
    attempt_id: str,
    answers_data: List[StudentAnswerCreate],
    authorization: str = Header(None)
):
    supabase = get_supabase()
    user = get_user_from_token(authorization)

    if not user or not user.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    for answer in answers_data:
        existing = supabase.table("student_answers").select("*").eq(
            "attempt_id", str(answer.attempt_id)
        ).eq("question_id", str(answer.question_id)).execute()

        if existing.data:
            supabase.table("student_answers").update({
                "selected_option": answer.selected_option,
                "answered_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("student_answers").insert({
                "attempt_id": str(answer.attempt_id),
                "question_id": str(answer.question_id),
                "selected_option": answer.selected_option,
                "answered_at": datetime.now(timezone.utc).isoformat()
            }).execute()

    return {
        "success": True,
        "message": "Answers saved successfully"
    }
