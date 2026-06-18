import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import api_router

from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.models import User, Subscription

# Initialize database tables on startup for simplicity in development
Base.metadata.create_all(bind=engine)

def seed_db():
    db = Session(bind=engine)
    try:
        # Seed demo user
        demo_user = db.query(User).filter(User.email == "user@cosmos.com").first()
        if not demo_user:
            user = User(
                email="user@cosmos.com",
                full_name="Demo Space Explorer",
                hashed_password=get_password_hash("cosmos123"),
                is_active=True
            )
            db.add(user)
            db.flush()
            sub = Subscription(user_id=user.id, plan_type="pro", status="active")
            db.add(sub)
            print("Seeded demo user user@cosmos.com")

        # Seed admin user
        demo_admin = db.query(User).filter(User.email == "admin@cosmos.com").first()
        if not demo_admin:
            admin = User(
                email="admin@cosmos.com",
                full_name="Cosmic Administrator",
                hashed_password=get_password_hash("cosmos123"),
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            db.flush()
            sub = Subscription(user_id=admin.id, plan_type="enterprise", status="active")
            db.add(sub)
            print("Seeded admin user admin@cosmos.com")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Db seeding warning: {e}")
    finally:
        db.close()

seed_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Cosmos Convert backend REST API powering multi-format file conversion, advanced PDF processing, and collaboration.",
    version="1.0.0"
)

# Configure CORS for local development and Tauri web requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API Router
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "mode": "development" if not settings.CLOUDFLARE_R2_ACCESS_KEY else "production"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

