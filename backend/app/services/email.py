import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_password_reset_email(email: str, reset_url: str) -> None:
    if not settings.smtp_host:
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    message["Subject"] = "Reset your NOVA password"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(
        "Use this one-time link to reset your NOVA password. It expires in 30 minutes.\n\n"
        f"{reset_url}\n\nIf you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password or "")
        server.send_message(message)
