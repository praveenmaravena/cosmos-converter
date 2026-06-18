from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    two_factor_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code_url: str

class TwoFactorVerify(BaseModel):
    code: str

# Document Schemas
class DocumentResponse(BaseModel):
    id: UUID
    owner_id: UUID
    workspace_id: Optional[UUID] = None
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    is_favorite: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Conversion Schemas
class ConversionCreate(BaseModel):
    source_format: str
    target_format: str

class ConversionResponse(BaseModel):
    id: UUID
    user_id: UUID
    source_doc_id: Optional[UUID] = None
    target_doc_id: Optional[UUID] = None
    status: str
    source_format: str
    target_format: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Workspace Schemas
class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class WorkspaceMemberAdd(BaseModel):
    email: EmailStr
    role: str = "viewer" # admin, editor, viewer

class WorkspaceMemberResponse(BaseModel):
    workspace_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

# Subscription Schemas
class SubscriptionResponse(BaseModel):
    id: UUID
    plan_type: str
    status: str
    current_period_end: Optional[datetime] = None

    class Config:
        from_attributes = True

# Mock Billing Trigger
class MockBillingSession(BaseModel):
    plan_type: str
    payment_method: str  # stripe, paypal, razorpay

# Auth Schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

# PDF Toolkit Schemas
class PdfSplitRequest(BaseModel):
    file_id: str
    output_name: Optional[str] = "split_pages.zip"

class PdfRearrangeRequest(BaseModel):
    file_id: str
    page_order: List[int]
    output_name: Optional[str] = "rearranged.pdf"

class PdfRotateRequest(BaseModel):
    file_id: str
    rotation_angle: int
    pages: Optional[List[int]] = None
    output_name: Optional[str] = "rotated.pdf"

class PdfDeleteRequest(BaseModel):
    file_id: str
    pages_to_delete: List[int]
    output_name: Optional[str] = "deleted_pages.pdf"

class PdfCompressRequest(BaseModel):
    file_id: str
    output_name: Optional[str] = "compressed.pdf"

class PdfProtectRequest(BaseModel):
    file_id: str
    password: str
    output_name: Optional[str] = "protected.pdf"

class PdfUnlockRequest(BaseModel):
    file_id: str
    password: str
    output_name: Optional[str] = "unlocked.pdf"

class PdfSignatureRequest(BaseModel):
    file_id: str
    signature_file_id: str
    page_num: Optional[int] = 0
    x: Optional[float] = 50
    y: Optional[float] = 50
    w: Optional[float] = 150
    h: Optional[float] = 50
    output_name: Optional[str] = "signed.pdf"

# Image Toolkit Schemas
class ImageResizeRequest(BaseModel):
    file_id: str
    width: int
    height: int
    output_name: Optional[str] = "resized.png"

class ImageCropRequest(BaseModel):
    file_id: str
    x: int
    y: int
    width: int
    height: int
    output_name: Optional[str] = "cropped.png"

class ImageRotateRequest(BaseModel):
    file_id: str
    angle: float
    output_name: Optional[str] = "rotated.png"

class ImageCompressRequest(BaseModel):
    file_id: str
    quality: Optional[int] = 70
    output_name: Optional[str] = "compressed.png"

class ImageBackgroundRemoveRequest(BaseModel):
    file_id: str
    output_name: Optional[str] = "bg_removed.png"

class ImageEnhanceRequest(BaseModel):
    file_id: str
    output_name: Optional[str] = "enhanced.png"

class ImageAdjustRequest(BaseModel):
    file_id: str
    brightness: Optional[float] = 1.0
    contrast: Optional[float] = 1.0
    filter_name: Optional[str] = "none"
    output_name: Optional[str] = "adjusted.png"

# Editor Schemas
class EditorSaveRequest(BaseModel):
    file_id: Optional[str] = None
    title: str
    content: str

class EditorExportRequest(BaseModel):
    title: str
    content: str
    export_format: str # PDF, DOCX, TXT, HTML

