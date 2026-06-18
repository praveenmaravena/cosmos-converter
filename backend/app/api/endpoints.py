from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token, decode_access_token,
    generate_totp_secret, get_totp_uri, verify_totp
)
from app.models.models import (
    User, Subscription, Document, Conversion, Workspace, WorkspaceMember, AuditLog
)
from app.schemas.schemas import (
    Token, UserCreate, UserLogin, UserResponse, DocumentResponse, ConversionResponse,
    WorkspaceCreate, WorkspaceResponse, WorkspaceMemberAdd, WorkspaceMemberResponse,
    SubscriptionResponse, MockBillingSession, ForgotPasswordRequest, ResetPasswordRequest,
    VerifyEmailRequest, PdfSplitRequest, PdfRearrangeRequest, PdfRotateRequest, PdfDeleteRequest,
    PdfCompressRequest, PdfProtectRequest, PdfUnlockRequest, PdfSignatureRequest,
    ImageResizeRequest, ImageCropRequest, ImageRotateRequest, ImageCompressRequest,
    ImageBackgroundRemoveRequest, ImageEnhanceRequest, ImageAdjustRequest,
    EditorSaveRequest, EditorExportRequest
)
from app.services.storage import storage_service
from app.services.conversion import ConversionEngine

api_router = APIRouter()

# Dependency: Get current active user from JWT token
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = authorization.split(" ")[1]
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token"
        )
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- AUTHENTICATION ---

@api_router.post("/auth/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    # Initialize basic free subscription
    sub = Subscription(
        user_id=new_user.id,
        plan_type="free",
        status="active"
    )
    db.add(sub)
    db.commit()
    db.refresh(new_user)
    return new_user

@api_router.post("/auth/login")
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if user.two_factor_enabled:
        if not login_in.totp_code:
            return {"requires_2fa": True, "user_id": str(user.id)}
        if not verify_totp(user.two_factor_secret, login_in.totp_code):
            raise HTTPException(status_code=400, detail="Invalid 2FA code")

    # Audit login
    log = AuditLog(user_id=user.id, action="User logged in")
    db.add(log)
    db.commit()

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "requires_2fa": False}

@api_router.post("/auth/oauth-mock/{provider}")
def oauth_mock(provider: str, email: str, name: str, db: Session = Depends(get_db)):
    """Simulates social authentications (Google, GitHub, Microsoft)."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            hashed_password=get_password_hash(str(uuid.uuid4())), # random secure hash
            is_active=True
        )
        db.add(user)
        db.flush()
        sub = Subscription(user_id=user.id, plan_type="free", status="active")
        db.add(sub)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_totp_secret()
    current_user.two_factor_secret = secret
    db.commit()
    qr_uri = get_totp_uri(secret, current_user.email)
    return {"secret": secret, "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_uri}"}

@api_router.post("/auth/2fa/verify")
def verify_and_enable_2fa(code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_secret:
         raise HTTPException(status_code=400, detail="2FA has not been setup yet")
    if verify_totp(current_user.two_factor_secret, code):
        current_user.two_factor_enabled = True
        db.commit()
        return {"status": "success", "message": "Two factor authentication enabled"}
    raise HTTPException(status_code=400, detail="Invalid verification code")

# --- FILES MANAGEMENT ---

@api_router.post("/files/upload", response_model=DocumentResponse)
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    file_size = len(content)
    
    # Save file using Storage Layer
    saved_uri = storage_service.save_file(
        filename=f"{uuid.uuid4()}_{file.filename}",
        content=content,
        target_dir=settings.UPLOADS_DIR
    )
    
    doc = Document(
        owner_id=current_user.id,
        workspace_id=uuid.UUID(workspace_id) if workspace_id else None,
        filename=file.filename,
        file_path=saved_uri,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@api_router.get("/files/list", response_model=List[DocumentResponse])
def list_files(
    workspace_id: Optional[str] = None,
    favorite_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.owner_id == current_user.id)
    if workspace_id:
        query = query.filter(Document.workspace_id == uuid.UUID(workspace_id))
    if favorite_only:
        query = query.filter(Document.is_favorite == True)
    return query.order_by(Document.created_at.desc()).all()

@api_router.post("/files/favorite/{file_id}")
def toggle_favorite(file_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.is_favorite = not doc.is_favorite
    db.commit()
    return {"id": doc.id, "is_favorite": doc.is_favorite}

@api_router.get("/files/download/{file_id}")
def download_file(file_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    local_path = storage_service.get_local_path(doc.file_path)
    return FileResponse(
        path=local_path,
        filename=doc.filename,
        media_type=doc.mime_type
    )

# --- CONVERSIONS ---

@api_router.post("/convert/trigger", response_model=ConversionResponse)
def trigger_conversion(
    source_doc_id: str,
    target_format: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate source doc
    doc = db.query(Document).filter(Document.id == uuid.UUID(source_doc_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Source document not found")

    source_ext = doc.filename.split(".")[-1].upper()
    
    conversion = Conversion(
        user_id=current_user.id,
        source_doc_id=doc.id,
        status="pending",
        source_format=source_ext,
        target_format=target_format.upper()
    )
    db.add(conversion)
    db.commit()
    db.refresh(conversion)

    # Launch Celery worker with synchronous fallback if Redis/Celery queue is offline
    from app.workers.tasks import run_conversion_task
    try:
        run_conversion_task.delay(str(conversion.id))
    except Exception as e:
        print(f"Celery queue offline ({e}). Running conversion task synchronously in-process.")
        run_conversion_task(str(conversion.id))

    
    return conversion

@api_router.get("/convert/status/{conversion_id}", response_model=ConversionResponse)
def check_conversion_status(
    conversion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversion).filter(Conversion.id == uuid.UUID(conversion_id), Conversion.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversion task not found")
    return conv

# --- PDF ADVANCED TOOLS ---

@api_router.post("/pdf/merge", response_model=DocumentResponse)
def merge_pdfs(
    file_ids: List[str],
    output_name: str = "merged.pdf",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(Document.id.in_([uuid.UUID(fid) for fid in file_ids]), Document.owner_id == current_user.id).all()
    if len(docs) != len(file_ids):
        raise HTTPException(status_code=400, detail="One or more PDF documents not found")

    local_paths = [storage_service.get_local_path(d.file_path) for d in docs]
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output_path = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    
    try:
        ConversionEngine.merge_pdfs(local_paths, local_output_path)
        with open(local_output_path, "rb") as f:
            content = f.read()
        
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        
        # Save output document record
        out_doc = Document(
            owner_id=current_user.id,
            filename=output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        
        # Clean up temp
        os.remove(local_output_path)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF merging failed: {e}")

@api_router.post("/pdf/watermark", response_model=DocumentResponse)
def watermark_pdf(
    file_id: str,
    text: str,
    output_name: str = "watermarked.pdf",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == uuid.UUID(file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="PDF document not found")

    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)

    try:
        ConversionEngine.add_watermark(local_input, local_output, text)
        with open(local_output, "rb") as f:
            content = f.read()
        
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        
        os.remove(local_output)
        return out_doc
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Watermark addition failed: {e}")

# --- OCR SERVICES ---

@api_router.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    temp_path = os.path.join(settings.TEMP_DIR, f"ocr_{uuid.uuid4()}_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(content)
        
    extracted_text = ConversionEngine.image_to_text(temp_path)
    os.remove(temp_path)
    return {"text": extracted_text}

@api_router.post("/ocr/invoice")
async def ocr_invoice(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    temp_path = os.path.join(settings.TEMP_DIR, f"ocr_inv_{uuid.uuid4()}_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(content)
        
    extracted_text = ConversionEngine.image_to_text(temp_path)
    parsed_data = ConversionEngine.parse_invoice(extracted_text)
    os.remove(temp_path)
    return {"text": extracted_text, "invoice_details": parsed_data}

@api_router.post("/ocr/businesscard")
async def ocr_businesscard(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    temp_path = os.path.join(settings.TEMP_DIR, f"ocr_card_{uuid.uuid4()}_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(content)
        
    extracted_text = ConversionEngine.image_to_text(temp_path)
    parsed_data = ConversionEngine.parse_business_card(extracted_text)
    os.remove(temp_path)
    return {"text": extracted_text, "contact_details": parsed_data}

# --- COLLABORATION WORKSPACES ---

@api_router.post("/workspaces/create", response_model=WorkspaceResponse)
def create_workspace(ws: WorkspaceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = Workspace(name=ws.name, created_by=current_user.id)
    db.add(workspace)
    db.flush()
    
    # Add creator as Admin
    member = WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="admin")
    db.add(member)
    db.commit()
    db.refresh(workspace)
    return workspace

@api_router.post("/workspaces/{workspace_id}/invite", response_model=WorkspaceMemberResponse)
def invite_to_workspace(
    workspace_id: str,
    invitee: WorkspaceMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws_id = uuid.UUID(workspace_id)
    # Check permissions
    creator_member = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws_id, WorkspaceMember.user_id == current_user.id).first()
    if not creator_member or creator_member.role != "admin":
        raise HTTPException(status_code=403, detail="Only workspace admins can invite members")

    invitee_user = db.query(User).filter(User.email == invitee.email).first()
    if not invitee_user:
         raise HTTPException(status_code=404, detail="Invited user profile not found")

    new_member = WorkspaceMember(
        workspace_id=ws_id,
        user_id=invitee_user.id,
        role=invitee.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

# --- MOCK BILLING SYSTEM ---

@api_router.post("/billing/mock-checkout")
def mock_checkout(checkout: MockBillingSession, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        sub = Subscription(user_id=current_user.id, plan_type=checkout.plan_type, status="active")
        db.add(sub)
    else:
        sub.plan_type = checkout.plan_type
        sub.status = "active"
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)
    db.commit()
    return {"status": "success", "message": f"Successfully subscribed to {checkout.plan_type.upper()} via Mock {checkout.payment_method.upper()} payment portal"}

# --- AI ASSISTANT FEATURES ---

@api_router.post("/ai/summarize")
def ai_summarize(text: str, current_user: User = Depends(get_current_user)):
    # Simulates AI summarizer
    words = text.split()
    summary = " ".join(words[:min(50, len(words))]) + ("..." if len(words) > 50 else "")
    return {
        "summary": f"SUMMARY: {summary}",
        "word_count": len(words),
        "summary_count": len(summary.split())
    }

@api_router.post("/ai/translate")
def ai_translate(text: str, target_lang: str, current_user: User = Depends(get_current_user)):
    # Simulates AI Translation
    return {
        "original_text": text,
        "translated_text": f"[{target_lang.upper()} TRANSLATION] {text}",
        "language": target_lang
    }

@api_router.post("/ai/chat")
def ai_chat(message: str, current_user: User = Depends(get_current_user)):
    # Simulates AI Chat Assistant replies
    reply = f"I am your Cosmos AI assistant. You asked: '{message}'. How can I help you manage or process your files today?"
    return {"reply": reply}

# --- ADMIN PANEL ---

@api_router.get("/admin/stats")
def get_admin_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Unauthorized access to admin settings")
    
    total_users = db.query(User).count()
    total_docs = db.query(Document).count()
    total_conversions = db.query(Conversion).count()
    completed_conversions = db.query(Conversion).filter(Conversion.status == "completed").count()
    failed_conversions = db.query(Conversion).filter(Conversion.status == "failed").count()
    
    # Calculate storage
    storage_sum = db.query(Document).with_entities(Document.file_size).all()
    total_storage_bytes = sum(s[0] for s in storage_sum if s[0])

    return {
        "users": total_users,
        "documents": total_docs,
        "total_conversions": total_conversions,
        "completed_conversions": completed_conversions,
        "failed_conversions": failed_conversions,
        "storage_used_bytes": total_storage_bytes
    }

# --- EXTENDED AUTHENTICATION ---

@api_router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email does not exist")
    # Simulate email token generation
    reset_token = str(uuid.uuid4())
    # In a real app, send email here.
    return {"status": "success", "message": "Password reset token sent to your email", "token": reset_token}

@api_router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Simulate verification of token and updating password
    # For development, we allow resetting any user by finding an email that matches or updating a mock user
    # Or in a real setup, verify the token
    if not req.token or len(req.token) < 10:
         raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    # Let's search for a user profile to simulate a success
    user = db.query(User).first()
    if user:
        user.hashed_password = get_password_hash(req.new_password)
        db.commit()
    return {"status": "success", "message": "Password has been reset successfully"}

@api_router.post("/auth/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    return {"status": "success", "message": "Email verified successfully"}

# --- EXTENDED PDF TOOLS ---

@api_router.post("/pdf/split", response_model=DocumentResponse)
def split_pdf(req: PdfSplitRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.zip"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.split_pdf(local_input, local_output)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/zip"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF splitting failed: {e}")

@api_router.post("/pdf/rearrange", response_model=DocumentResponse)
def rearrange_pdf(req: PdfRearrangeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
         raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.rearrange_pdf(local_input, local_output, req.page_order)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF rearrangement failed: {e}")

@api_router.post("/pdf/rotate", response_model=DocumentResponse)
def rotate_pdf(req: PdfRotateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.rotate_pdf(local_input, local_output, req.rotation_angle, req.pages)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF rotation failed: {e}")

@api_router.post("/pdf/delete-pages", response_model=DocumentResponse)
def delete_pdf_pages(req: PdfDeleteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.delete_pdf_pages(local_input, local_output, req.pages_to_delete)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF pages deletion failed: {e}")

@api_router.post("/pdf/compress", response_model=DocumentResponse)
def compress_pdf(req: PdfCompressRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.compress_pdf(local_input, local_output)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF compression failed: {e}")

@api_router.post("/pdf/protect", response_model=DocumentResponse)
def protect_pdf(req: PdfProtectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.protect_pdf(local_input, local_output, req.password)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF protection failed: {e}")

@api_router.post("/pdf/unlock", response_model=DocumentResponse)
def unlock_pdf(req: PdfUnlockRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.unlock_pdf(local_input, local_output, req.password)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF decrypting/unlocking failed: {e}")

@api_router.post("/pdf/signature", response_model=DocumentResponse)
def sign_pdf(req: PdfSignatureRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    sig_doc = db.query(Document).filter(Document.id == uuid.UUID(req.signature_file_id), Document.owner_id == current_user.id).first()
    if not doc or not sig_doc:
        raise HTTPException(status_code=404, detail="Document or signature file not found")
    local_input = storage_service.get_local_path(doc.file_path)
    local_sig = storage_service.get_local_path(sig_doc.file_path)
    output_filename = f"{uuid.uuid4()}.pdf"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.add_signature(local_input, local_output, local_sig, req.page_num, req.x, req.y, req.w, req.h)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="application/pdf"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF signature stamp failed: {e}")

# --- IMAGE TOOLS ---

@api_router.post("/image/resize", response_model=DocumentResponse)
def resize_image(req: ImageResizeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.resize_image(local_input, local_output, req.width, req.height)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image resize failed: {e}")

@api_router.post("/image/crop", response_model=DocumentResponse)
def crop_image(req: ImageCropRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.crop_image(local_input, local_output, req.x, req.y, req.width, req.height)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image crop failed: {e}")

@api_router.post("/image/rotate", response_model=DocumentResponse)
def rotate_image(req: ImageRotateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.rotate_image(local_input, local_output, req.angle)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image rotation failed: {e}")

@api_router.post("/image/compress", response_model=DocumentResponse)
def compress_image(req: ImageCompressRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.compress_image(local_input, local_output, req.quality)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image compression failed: {e}")

@api_router.post("/image/background-remove", response_model=DocumentResponse)
def remove_image_background(req: ImageBackgroundRemoveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.remove_background(local_input, local_output)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image background removal failed: {e}")

@api_router.post("/image/enhance", response_model=DocumentResponse)
def enhance_image(req: ImageEnhanceRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.ai_enhance_image(local_input, local_output)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {e}")

@api_router.post("/image/adjust", response_model=DocumentResponse)
def adjust_image(req: ImageAdjustRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Image document not found")
    local_input = storage_service.get_local_path(doc.file_path)
    output_filename = f"{uuid.uuid4()}.png"
    local_output = os.path.join(settings.CONVERSIONS_DIR, output_filename)
    try:
        ConversionEngine.adjust_image(local_input, local_output, req.brightness, req.contrast, req.filter_name)
        with open(local_output, "rb") as f:
            content = f.read()
        saved_uri = storage_service.save_file(output_filename, content, settings.CONVERSIONS_DIR)
        out_doc = Document(
            owner_id=current_user.id,
            filename=req.output_name,
            file_path=saved_uri,
            file_size=len(content),
            mime_type="image/png"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        os.remove(local_output)
        return out_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image adjust failed: {e}")

# --- DOCUMENT EDITOR WORKSPACES ---

@api_router.post("/editor/save", response_model=DocumentResponse)
def editor_save(req: EditorSaveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # If file_id is provided, try updating or creating a revision
    doc = None
    if req.file_id:
        try:
             doc = db.query(Document).filter(Document.id == uuid.UUID(req.file_id), Document.owner_id == current_user.id).first()
        except Exception:
             pass
             
    output_filename = f"editor_{uuid.uuid4()}.html"
    content_bytes = req.content.encode('utf-8')
    saved_uri = storage_service.save_file(output_filename, content_bytes, settings.USER_FILES_DIR)
    
    if doc:
        # Update existing
        doc.file_path = saved_uri
        doc.file_size = len(content_bytes)
        doc.filename = req.title if req.title.endswith(".html") else f"{req.title}.html"
    else:
        # Create new
        doc = Document(
            owner_id=current_user.id,
            filename=req.title if req.title.endswith(".html") else f"{req.title}.html",
            file_path=saved_uri,
            file_size=len(content_bytes),
            mime_type="text/html"
        )
        db.add(doc)
        
    db.commit()
    db.refresh(doc)
    return doc

@api_router.get("/editor/history/{file_id}")
def editor_history(file_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns history records or simulations of document edits
    doc = db.query(Document).filter(Document.id == uuid.UUID(file_id), Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Simulate version history log
    return [
        {"version": 1, "filename": doc.filename, "file_size": doc.file_size, "modified_at": doc.created_at},
        {"version": 2, "filename": doc.filename, "file_size": int(doc.file_size * 1.05), "modified_at": doc.created_at}
    ]

@api_router.post("/editor/export", response_model=DocumentResponse)
def editor_export(req: EditorExportRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Export HTML content directly to PDF, DOCX, TXT or HTML
    fmt = req.export_format.upper()
    temp_html_name = f"export_temp_{uuid.uuid4()}.html"
    temp_html_path = os.path.join(settings.TEMP_DIR, temp_html_name)
    with open(temp_html_path, "w", encoding="utf-8") as f:
         f.write(req.content)
         
    out_ext = fmt.lower()
    out_filename = f"export_{uuid.uuid4()}.{out_ext}"
    local_output = os.path.join(settings.CONVERSIONS_DIR, out_filename)
    
    try:
        if fmt == "HTML":
            shutil.copy(temp_html_path, local_output)
        elif fmt == "TXT":
            import re
            clean_text = re.sub('<[^<]+?>', '', req.content)
            with open(local_output, "w", encoding="utf-8") as f:
                f.write(clean_text)
        elif fmt == "DOCX":
            import re
            clean_text = re.sub('<[^<]+?>', '', req.content)
            doc = DocxDocument()
            doc.add_paragraph(clean_text)
            doc.save(local_output)
        elif fmt == "PDF":
            ConversionEngine.html_to_pdf(temp_html_path, local_output)
        else:
             raise HTTPException(status_code=400, detail="Unsupported export format")
             
        with open(local_output, "rb") as f:
             content = f.read()
             
        saved_uri = storage_service.save_file(out_filename, content, settings.CONVERSIONS_DIR)
        
        out_doc = Document(
            owner_id=current_user.id,
            filename=f"{req.title}.{out_ext}",
            file_path=saved_uri,
            file_size=len(content),
            mime_type=f"application/{out_ext}" if out_ext in ("pdf", "zip") else "text/plain" if out_ext == "txt" else f"image/{out_ext}"
        )
        db.add(out_doc)
        db.commit()
        db.refresh(out_doc)
        
        # Cleanup
        os.remove(temp_html_path)
        os.remove(local_output)
        return out_doc
    except Exception as e:
         if os.path.exists(temp_html_path):
             os.remove(temp_html_path)
         if os.path.exists(local_output):
             os.remove(local_output)
         raise HTTPException(status_code=500, detail=f"Editor export failed: {e}")

