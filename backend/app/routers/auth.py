from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings
from pydantic import BaseModel, EmailStr
from typing import Optional
import httpx
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

supabase_admin: Optional[Client] = None
supabase_anon: Optional[Client] = None


def get_supabase_admin() -> Client:
    global supabase_admin
    if supabase_admin is None:
        try:
            print(f"DEBUG - SUPABASE_URL: {settings.SUPABASE_URL}")
            print(f"DEBUG - SUPABASE_SERVICE_KEY present: {bool(settings.SUPABASE_SERVICE_KEY)}")

            from supabase import ClientOptions
            supabase_admin = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
                options=ClientOptions(
                    auto_refresh_token=False,
                    persist_session=False
                )
            )
            print("Admin client created successfully")
        except Exception as e:
            print(f"Error creating admin client: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supabase client error: {str(e)}"
            )
    return supabase_admin


def get_supabase_anon() -> Client:
    global supabase_anon
    if supabase_anon is None:
        try:
            supabase_anon = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
        except Exception as e:
            print(f"Error creating anon client: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supabase client error: {str(e)}"
            )
    return supabase_anon


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(user_data: RegisterRequest):
    try:
        print(f"Registering user: {user_data.email}")

        # Use direct HTTP call to Supabase Auth Admin API
        async with httpx.AsyncClient() as client:
            # Create user via Supabase Auth Admin API
            # Use anon key for apikey header, service key for Authorization (bypasses RLS)
            auth_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": user_data.email,
                    "password": user_data.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": user_data.full_name,
                        "role": user_data.role
                    }
                }
            )

            print(f"Auth response status: {auth_response.status_code}")
            print(f"Auth response: {auth_response.text[:500]}")

            if auth_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Auth creation failed: {auth_response.text}"
                )

            auth_data = auth_response.json()
            user_id = auth_data.get("id")

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration failed - no user ID returned"
                )

        # Create profile using direct HTTP (PostgreSQL API)
        async with httpx.AsyncClient() as client:
            profile_response = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/profiles",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                json={
                    "id": user_id,
                    "email": user_data.email,
                    "full_name": user_data.full_name,
                    "role": user_data.role
                }
            )

            print(f"Profile response status: {profile_response.status_code}")
            print(f"Profile response: {profile_response.text[:200]}")

        return {
            "success": True,
            "message": "User registered successfully",
            "data": {
                "user_id": user_id,
                "email": user_data.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(login_data: LoginRequest):
    try:
        print(f"Login attempt for: {login_data.email}")

        # Sign in with password using direct HTTP
        async with httpx.AsyncClient() as client:
            auth_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": login_data.email,
                    "password": login_data.password
                }
            )

            print(f"Login response status: {auth_response.status_code}")
            print(f"Login response: {auth_response.text[:500]}")

            if auth_response.status_code != 200:
                error_detail = auth_response.text
                # Try to extract more specific error from Supabase response
                try:
                    error_json = auth_response.json()
                    error_detail = error_detail.get("error_description") or error_json.get("msg") or error_detail
                except:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Authentication failed: {error_detail[:200]}"
                )

            auth_data = auth_response.json()
            print(f"Auth data keys: {auth_data.keys()}")

            # Supabase Auth returns user info at different levels depending on version
            # Try nested "user" first, then check top-level
            user_id = auth_data.get("user", {}).get("id") if auth_data.get("user") else None
            if not user_id:
                # Check if user info is at top level
                user_id = auth_data.get("id")
            if not user_id:
                # Check user subobject
                user_obj = auth_data.get("user", {})
                if isinstance(user_obj, dict):
                    user_id = user_obj.get("id")

            access_token = auth_data.get("access_token")
            refresh_token = auth_data.get("refresh_token")

            print(f"Extracted user_id: {user_id}")

            if not user_id or not access_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials - no user ID in response"
                )

        # Get profile using Supabase admin client (bypasses RLS)
        profile = None
        try:
            supabase_admin = get_supabase_admin()
            profile_response = supabase_admin.table("profiles").select("*").eq("id", user_id).execute()
            print(f"Profile query result: {profile_response.data}")
            profile = profile_response.data[0] if profile_response.data else None
        except Exception as e:
            print(f"Warning: Could not fetch profile from DB: {e}")
            # Fallback to user metadata
            user_obj = auth_data.get("user", {})
            if isinstance(user_obj, dict):
                user_metadata = user_obj.get("user_metadata", {})
                profile = {
                    "full_name": user_metadata.get("full_name"),
                    "role": user_metadata.get("role", "student")
                }

        return {
            "success": True,
            "data": {
                "user": {
                    "id": user_id,
                    "email": login_data.email,
                    "full_name": profile.get("full_name") if profile and profile.get("full_name") else None,
                    "role": profile.get("role") if profile and profile.get("role") else "student"
                },
                "session": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "expires_in": auth_data.get("expires_in", 3600),
                    "expires_at": auth_data.get("expires_at")
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)[:200]}"
        )


@router.get("/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    supabase = get_supabase_anon()

    try:
        # Verify token
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # Get profile
        profile = None
        try:
            profile_response = supabase.table("profiles").select("*").eq(
                "id", user_response.user.id
            ).execute()
            profile = profile_response.data[0] if profile_response.data else None
        except Exception as e:
            print(f"Warning: Could not fetch profile from DB in get_me: {e}")
            user_metadata = getattr(user_response.user, 'user_metadata', {})
            profile = {
                "full_name": user_metadata.get("full_name"),
                "role": user_metadata.get("role", "student")
            }

        return {
            "success": True,
            "data": {
                "user": {
                    "id": user_response.user.id,
                    "email": user_response.user.email,
                    "full_name": profile.get("full_name") if profile and profile.get("full_name") else None,
                    "role": profile.get("role") if profile and profile.get("role") else "student"
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )