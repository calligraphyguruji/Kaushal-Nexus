import asyncio
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import html
import smtplib
from typing import Any, Dict, List, Optional, Protocol

from src.core.config import settings
from src.core.logging import logger


@dataclass
class EmailSendResult:
    """Outcome payload for email dispatch attempts."""
    success: bool
    recipient: str
    subject: str
    error: Optional[str] = None
    provider: str = "mock"


class IEmailProvider(Protocol):
    """Protocol contract for interchangeable email delivery providers."""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailSendResult:
        ...


class MockEmailProvider:
    """
    In-memory mock email provider for unit tests and local development.
    Stores dispatched messages for inspection without contacting external networks.
    """

    def __init__(self) -> None:
        self.sent_emails: List[Dict[str, Any]] = []

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailSendResult:
        record = {
            "to": to_email,
            "subject": subject,
            "html": html_body,
            "text": text_body,
            "from_email": from_email or settings.SMTP_FROM_EMAIL,
            "from_name": from_name or settings.SMTP_FROM_NAME,
        }
        self.sent_emails.append(record)
        logger.info(
            f"[MockEmailProvider] Verification email dispatched to {to_email} with subject: '{subject}'"
        )
        return EmailSendResult(
            success=True,
            recipient=to_email,
            subject=subject,
            provider="mock",
        )

    def get_last_email(self) -> Optional[Dict[str, Any]]:
        """Returns the most recent email recorded."""
        return self.sent_emails[-1] if self.sent_emails else None

    def clear(self) -> None:
        """Clears all recorded emails."""
        self.sent_emails.clear()


class SMTPEmailProvider:
    """
    Production-grade SMTP email delivery provider.
    Executes standard library smtplib in a worker thread to keep the async event loop non-blocking.
    """

    def __init__(
        self,
        host: str,
        port: int = 587,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: bool = True,
        timeout: float = 10.0,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.timeout = timeout

    def _sync_send(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        from_email: str,
        from_name: str,
    ) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        msg["To"] = to_email

        # Attach plain text and HTML alternatives
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        server: Optional[smtplib.SMTP] = None
        try:
            if self.port == 465:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=self.timeout)
                if self.use_tls:
                    server.starttls()

            if self.username and self.password:
                server.login(self.username, self.password)

            server.sendmail(from_email, [to_email], msg.as_string())
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailSendResult:
        sender_email = from_email or settings.SMTP_FROM_EMAIL
        sender_name = from_name or settings.SMTP_FROM_NAME

        try:
            await asyncio.to_thread(
                self._sync_send,
                to_email,
                subject,
                html_body,
                text_body,
                sender_email,
                sender_name,
            )
            logger.info(f"[SMTPEmailProvider] Email sent successfully to {to_email}")
            return EmailSendResult(
                success=True,
                recipient=to_email,
                subject=subject,
                provider="smtp",
            )
        except Exception as exc:
            err_msg = f"SMTP dispatch failed: {str(exc)}"
            logger.error(err_msg)
            return EmailSendResult(
                success=False,
                recipient=to_email,
                subject=subject,
                error=err_msg,
                provider="smtp",
            )


class EmailService:
    """
    High-level email service orchestration layer with dynamic provider selection,
    professional HTML templating, and graceful fallback guarantees.
    """

    def __init__(self, provider: Optional[IEmailProvider] = None) -> None:
        self._provider = provider

    @property
    def provider(self) -> IEmailProvider:
        if self._provider is not None:
            return self._provider

        # Auto-configure provider based on environment & SMTP configuration
        if settings.SMTP_HOST and settings.SMTP_HOST.strip():
            return SMTPEmailProvider(
                host=settings.SMTP_HOST.strip(),
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                use_tls=settings.SMTP_USE_TLS,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
        return default_mock_provider

    def set_provider(self, provider: IEmailProvider) -> None:
        """Override provider dynamically (useful for test isolation)."""
        self._provider = provider

    def build_verification_email_html(
        self,
        recipient_name: str,
        verification_url: str,
        expires_in_hours: int = 24,
    ) -> str:
        """Constructs an authoritative, clean HTML email with KaushalNexus branding."""
        safe_name = html.escape(recipient_name.strip() or "Candidate")
        safe_url = html.escape(verification_url)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your KaushalNexus Account</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }}
    .wrapper {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .header p {{
      margin: 0;
      font-size: 13px;
      color: #e0f2fe;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
    }}
    .message {{
      font-size: 15px;
      color: #334155;
      margin-bottom: 28px;
    }}
    .button-container {{
      text-align: center;
      margin: 32px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
    }}
    .expiry-note {{
      background-color: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 14px 16px;
      font-size: 13px;
      color: #475569;
      margin: 24px 0;
      border-radius: 0 6px 6px 0;
    }}
    .alt-link {{
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }}
    .alt-link a {{
      color: #0284c7;
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>KaushalNexus</h1>
      <p>National Skill Intelligence & Placement Platform</p>
    </div>
    <div class="content">
      <div class="greeting">Hello {safe_name},</div>
      <p class="message">
        Thank you for registering on <strong>KaushalNexus</strong>. To activate your account and access verified career pathways, skill diagnostics, and national mandates, please confirm your email address.
      </p>

      <div class="button-container">
        <a href="{safe_url}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
      </div>

      <div class="expiry-note">
        <strong>Expiration:</strong> This verification link will expire in <strong>{expires_in_hours} hours</strong>. If you do not verify within this timeframe, you will need to request a new link.
      </div>

      <div class="alt-link">
        If the button above does not work, copy and paste this URL into your browser:<br>
        <a href="{safe_url}" target="_blank" rel="noopener noreferrer">{safe_url}</a>
      </div>
    </div>
    <div class="footer">
      <p>Security Note: If you did not create an account on KaushalNexus, please ignore this email or contact support if you suspect unauthorized activity.</p>
      <p>&copy; 2026 Ministry of Skill Development and Entrepreneurship (MSDE) &middot; Government of India</p>
    </div>
  </div>
</body>
</html>"""

    def build_verification_email_text(
        self,
        recipient_name: str,
        verification_url: str,
        expires_in_hours: int = 24,
    ) -> str:
        """Constructs an authoritative plain-text alternative."""
        name = recipient_name.strip() or "Candidate"
        return f"""KaushalNexus - National Skill Intelligence & Placement Platform

Hello {name},

Thank you for registering on KaushalNexus. Please confirm your email address by visiting the following link:

{verification_url}

This verification link will expire in {expires_in_hours} hours.

Security Note: If you did not create an account on KaushalNexus, you can safely ignore this email.

Ministry of Skill Development and Entrepreneurship (MSDE)
Government of India
"""

    async def send_verification_email(
        self,
        to_email: str,
        recipient_name: str,
        verification_url: str,
        expires_in_hours: int = 24,
    ) -> EmailSendResult:
        """
        Sends the standard email verification message to the recipient.
        Catches and logs all errors, returning a structured result.
        """
        subject = "Verify your email address - KaushalNexus"
        html_body = self.build_verification_email_html(
            recipient_name=recipient_name,
            verification_url=verification_url,
            expires_in_hours=expires_in_hours,
        )
        text_body = self.build_verification_email_text(
            recipient_name=recipient_name,
            verification_url=verification_url,
            expires_in_hours=expires_in_hours,
        )

        try:
            return await self.provider.send_email(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
        except Exception as exc:
            err_msg = f"Unexpected failure in send_verification_email: {str(exc)}"
            logger.error(err_msg)
            return EmailSendResult(
                success=False,
                recipient=to_email,
                subject=subject,
                error=err_msg,
            )


# Singleton instances
default_mock_provider = MockEmailProvider()
email_service = EmailService()
