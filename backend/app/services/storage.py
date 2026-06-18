import os
import shutil
from typing import Optional
from app.core.config import settings

class StorageService:
    def __init__(self):
        # In production, boto3 can be initialized here if credentials exist
        self.use_r2 = bool(settings.CLOUDFLARE_R2_ACCESS_KEY and settings.CLOUDFLARE_R2_SECRET_KEY)
        if self.use_r2:
            try:
                import boto3
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.CLOUDFLARE_R2_ENDPOINT,
                    aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY,
                    aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_KEY
                )
            except ImportError:
                print("Warning: boto3 not installed, falling back to Local Storage")
                self.use_r2 = False

        # Ensure local directories exist regardless
        for folder in [settings.UPLOADS_DIR, settings.CONVERSIONS_DIR, settings.TEMP_DIR, settings.USER_FILES_DIR, settings.THUMBNAILS_DIR]:
            os.makedirs(folder, exist_ok=True)

    def save_file(self, filename: str, content: bytes, target_dir: str = settings.UPLOADS_DIR) -> str:
        """Saves file to local filesystem or R2 bucket depending on settings."""
        if self.use_r2:
            try:
                # Target path in bucket
                key = f"{os.path.basename(target_dir)}/{filename}"
                self.s3_client.put_object(
                    Bucket=settings.CLOUDFLARE_R2_BUCKET,
                    Key=key,
                    Body=content
                )
                return f"r2://{settings.CLOUDFLARE_R2_BUCKET}/{key}"
            except Exception as e:
                print(f"R2 save failed: {e}. Falling back to Local Storage.")

        # Local fallback
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        return file_path

    def get_file(self, file_path: str) -> bytes:
        """Retrieves file content."""
        if file_path.startswith("r2://"):
            try:
                parts = file_path.replace("r2://", "").split("/", 1)
                bucket = parts[0]
                key = parts[1]
                response = self.s3_client.get_object(Bucket=bucket, Key=key)
                return response['Body'].read()
            except Exception as e:
                raise RuntimeError(f"R2 retrieval failed: {e}")

        # Local
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, "rb") as f:
            return f.read()

    def get_local_path(self, file_path: str) -> str:
        """Ensures file is available locally (downloads from R2 if necessary) and returns local path."""
        if file_path.startswith("r2://"):
            parts = file_path.replace("r2://", "").split("/", 1)
            bucket = parts[0]
            key = parts[1]
            local_name = os.path.basename(key)
            temp_local_path = os.path.join(settings.TEMP_DIR, local_name)
            
            # Download file from R2
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            with open(temp_local_path, "wb") as f:
                f.write(response['Body'].read())
            return temp_local_path
        
        return file_path

    def delete_file(self, file_path: str):
        """Deletes file."""
        if file_path.startswith("r2://"):
            try:
                parts = file_path.replace("r2://", "").split("/", 1)
                bucket = parts[0]
                key = parts[1]
                self.s3_client.delete_object(Bucket=bucket, Key=key)
                return
            except Exception as e:
                print(f"R2 deletion failed: {e}")
                return

        # Local
        if os.path.exists(file_path):
            os.remove(file_path)

storage_service = StorageService()
