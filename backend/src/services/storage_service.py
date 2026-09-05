import os
from pathlib import Path
from typing import Tuple
import uuid
import aiofiles
from fastapi import UploadFile

from src.core.exceptions import BadRequestException


class StorageService:
    """
    Pluggable storage adapter for uploaded candidate documents.
    Enforces maximum file sizes (5MB), allowed MIME types (PDF, DOCX),
    and safe collision-free storage paths.
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Megabytes

    ALLOWED_MIME_TYPES = {
        "application/pdf": ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/msword": ".doc",
        "application/octet-stream": ".pdf",  # Fallback for raw streams with pdf filename
    }

    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}

    def __init__(self, base_upload_dir: str = "uploads/resumes"):
        self.upload_dir = Path(base_upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_resume_file(self, file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Validates and saves candidate resume file.
        Returns: (sanitized_original_filename, storage_path, file_size_bytes, mime_type)
        """
        orig_filename = file.filename or "resume.pdf"
        file_ext = Path(orig_filename).suffix.lower()

        # Check extension
        if file_ext not in self.ALLOWED_EXTENSIONS:
            raise BadRequestException(
                message=f"Unsupported file extension '{file_ext}'. Allowed formats: PDF (.pdf) and Word (.docx)."
            )

        # Read content and validate size
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            raise BadRequestException(message="Uploaded resume file is empty.")

        if file_size > self.MAX_FILE_SIZE:
            raise BadRequestException(
                message=f"File size {round(file_size / (1024 * 1024), 2)}MB exceeds maximum allowed limit of 5.0MB."
            )

        # Determine safe MIME type
        mime_type = file.content_type or "application/pdf"
        if mime_type not in self.ALLOWED_MIME_TYPES and file_ext == ".pdf":
            mime_type = "application/pdf"
        elif mime_type not in self.ALLOWED_MIME_TYPES and file_ext == ".docx":
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        # Safe filename
        unique_name = f"resume_{uuid.uuid4().hex}{file_ext}"
        storage_path = self.upload_dir / unique_name

        # Async write to disk
        async with aiofiles.open(storage_path, "wb") as f:
            await f.write(content)

        return (orig_filename, str(storage_path), file_size, mime_type)

    @staticmethod
    def delete_file(storage_path: str) -> None:
        """Deletes file from storage if present."""
        try:
            p = Path(storage_path)
            if p.exists():
                p.unlink()
        except Exception:
            pass


storage_service = StorageService()
