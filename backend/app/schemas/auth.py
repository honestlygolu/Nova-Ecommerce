from typing import Annotated
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints


Password = Annotated[str, StringConstraints(min_length=10, max_length=128)]


class RegisterRequest(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    email: EmailStr
    password: Password


class LoginRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, Field(min_length=1, max_length=128)]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    password: Password


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    user: UserRead
