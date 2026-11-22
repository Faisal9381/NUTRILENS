from pydantic import BaseModel
from typing import Optional, List, Any


class UserRegisterRequest(BaseModel):
    email: str
    password: str
    age_group: Optional[str] = None
    dietary_preferences: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    activity_level: Optional[str] = None
    nutritional_preferences: Optional[Any] = None


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileResponse(BaseModel):
    id: int
    email: str
    age_group: Optional[str] = None
    dietary_preferences: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    activity_level: Optional[str] = None
    nutritional_preferences: Optional[Any] = None
