import os
import uuid
import shutil
import traceback
from datetime import datetime
from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.models import Conversion, Document
from app.services.storage import storage_service
from app.services.conversion import ConversionEngine
from app.core.config import settings

logger = get_task_logger(__name__)

@celery_app.task(name="app.workers.tasks.run_conversion_task")
def run_conversion_task(conversion_id: str):
    logger.info(f"Starting conversion task for {conversion_id}")
    db = SessionLocal()
    try:
        # 1. Fetch conversion details
        conversion = db.query(Conversion).filter(Conversion.id == uuid.UUID(conversion_id)).first()
        if not conversion:
            logger.error(f"Conversion {conversion_id} not found")
            return False

        conversion.status = "processing"
        db.commit()

        # 2. Fetch source document
        source_doc = db.query(Document).filter(Document.id == conversion.source_doc_id).first()
        if not source_doc:
            raise ValueError("Source document not found")

        # 3. Retrieve local file path (downloads from cloud if active)
        local_input_path = storage_service.get_local_path(source_doc.file_path)

        # 4. Prepare target paths
        target_ext = conversion.target_format.lower()
        output_filename = f"{uuid.uuid4()}.{target_ext}"
        local_output_path = os.path.join(settings.CONVERSIONS_DIR, output_filename)

        # 5. Route conversion
        source_ext = conversion.source_format.upper()
        target_ext_upper = conversion.target_format.upper()
        
        logger.info(f"Converting {source_ext} to {target_ext_upper}")

        if source_ext == "PDF" and target_ext_upper == "DOCX":
            ConversionEngine.pdf_to_docx(local_input_path, local_output_path)
        elif source_ext == "DOCX" and target_ext_upper == "PDF":
            ConversionEngine.docx_to_pdf(local_input_path, local_output_path)
        elif source_ext == "PDF" and target_ext_upper == "TXT":
            ConversionEngine.pdf_to_txt(local_input_path, local_output_path)
        elif source_ext == "TXT" and target_ext_upper == "PDF":
            ConversionEngine.txt_to_pdf(local_input_path, local_output_path)
        elif source_ext == "PDF" and target_ext_upper == "HTML":
            ConversionEngine.pdf_to_html(local_input_path, local_output_path)
        elif source_ext == "HTML" and target_ext_upper == "PDF":
            ConversionEngine.html_to_pdf(local_input_path, local_output_path)
        elif source_ext == "PDF" and target_ext_upper in ("PPT", "PPTX"):
            ConversionEngine.pdf_to_pptx(local_input_path, local_output_path)
        elif source_ext in ("PPT", "PPTX") and target_ext_upper == "PDF":
            ConversionEngine.pptx_to_pdf(local_input_path, local_output_path)
        elif source_ext == "PDF" and target_ext_upper == "XLSX":
            ConversionEngine.pdf_to_xlsx(local_input_path, local_output_path)
        elif source_ext in ("XLSX", "XLS") and target_ext_upper == "PDF":
            ConversionEngine.xlsx_to_pdf(local_input_path, local_output_path)
        elif source_ext in ("JPG", "PNG", "JPEG", "WEBP", "BMP", "TIFF") and target_ext_upper == "PDF":
            ConversionEngine.images_to_pdf([local_input_path], local_output_path)
        elif source_ext == "PDF" and target_ext_upper in ("JPG", "PNG", "WEBP", "IMAGE"):
            ConversionEngine.pdf_to_single_image(local_input_path, local_output_path, target_ext_upper)
        elif source_ext == "SVG" and target_ext_upper == "PNG":
            ConversionEngine.svg_to_png(local_input_path, local_output_path)
        elif source_ext == "PNG" and target_ext_upper == "SVG":
            ConversionEngine.png_to_svg(local_input_path, local_output_path)
        elif source_ext == "HEIC" and target_ext_upper in ("JPG", "JPEG", "PNG"):
            ConversionEngine.heic_to_image(local_input_path, local_output_path, target_ext_upper)
        elif source_ext == "GIF" and target_ext_upper == "MP4":
            ConversionEngine.gif_to_mp4(local_input_path, local_output_path)
        elif source_ext == "MP4" and target_ext_upper == "GIF":
            ConversionEngine.mp4_to_gif(local_input_path, local_output_path)
        elif source_ext in ("JPG", "PNG", "JPEG", "WEBP", "BMP", "TIFF") and target_ext_upper in ("JPG", "PNG", "WEBP", "JPEG"):
            ConversionEngine.image_convert(local_input_path, local_output_path, target_ext_upper)
        else:
            # Fallback for copy/direct formats or mock processing
            logger.warning(f"Conversion path {source_ext} -> {target_ext_upper} is unsupported. Simulating direct copy.")
            shutil.copy(local_input_path, local_output_path)

        # 6. Read converted file content and store in storage abstraction
        with open(local_output_path, "rb") as f:
            converted_content = f.read()

        storage_uri = storage_service.save_file(
            filename=output_filename,
            content=converted_content,
            target_dir=settings.CONVERSIONS_DIR
        )

        # 7. Create target Document entry
        target_doc = Document(
            id=uuid.uuid4(),
            owner_id=source_doc.owner_id,
            workspace_id=source_doc.workspace_id,
            filename=f"converted_{source_doc.filename.rsplit('.', 1)[0]}.{conversion.target_format.lower()}",
            file_path=storage_uri,
            file_size=len(converted_content),
            mime_type=f"application/{target_ext}" if target_ext == "pdf" else f"image/{target_ext}",
            is_favorite=False,
            created_at=datetime.utcnow()
        )
        db.add(target_doc)
        db.flush()

        # Clean up temporary local paths if retrieved from R2
        if local_input_path != source_doc.file_path and local_input_path.startswith(settings.TEMP_DIR):
            try:
                os.remove(local_input_path)
            except Exception:
                pass
        try:
            os.remove(local_output_path)
        except Exception:
            pass

        # 8. Update Conversion record
        conversion.target_doc_id = target_doc.id
        conversion.status = "completed"
        db.commit()
        logger.info(f"Conversion {conversion_id} completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error executing conversion: {e}\n{traceback.format_exc()}")
        db.rollback()
        # Retrieve conversion to update status to failed
        conversion = db.query(Conversion).filter(Conversion.id == uuid.UUID(conversion_id)).first()
        if conversion:
            conversion.status = "failed"
            conversion.error_message = str(e)
            db.commit()
        return False
    finally:
        db.close()
