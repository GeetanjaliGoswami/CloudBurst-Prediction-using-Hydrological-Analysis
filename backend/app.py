"""
Flask backend for Cloudburst Prediction via Hydrological Analysis.
"""

import hashlib
import hmac
import os
import smtplib
from email.message import EmailMessage

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import (
    create_user,
    get_community_reports,
    get_user_by_email,
    init_db,
    save_alert_preference,
    save_community_report,
    save_email_report,
    save_prediction,
)
from model.hydrology import calculate_discharge, calculate_hii, classify_risk
from model.rainfall_model import predict_rainfall, train_and_evaluate

app = Flask(__name__)
CORS(app)
init_db()

# Train once at server startup for quick inference.
ml_model, model_metrics = train_and_evaluate()


def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with per-user salt."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plaintext password against stored hash."""
    try:
        salt_hex, digest_hex = password_hash.split("$", maxsplit=1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected_digest = bytes.fromhex(digest_hex)
    actual_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual_digest, expected_digest)


def send_email_with_optional_smtp(receiver: str, subject: str, body: str) -> tuple[str, str]:
    """
    Send email if SMTP env vars are configured.
    Falls back to dry-run mode (no external send) for local development.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_SENDER", smtp_user or "noreply@kloudcast.local")

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[EMAIL DRY RUN] To: {receiver}\nSubject: {subject}\n{body}")
        return "dry-run", (
            "Email saved successfully. SMTP not configured, so this run is stored as dry-run."
        )

    message = EmailMessage()
    message["From"] = sender_email
    message["To"] = receiver
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(message)

    return "sent", "Email report sent successfully."


@app.get("/health")
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    """
    Accept input JSON and return prediction response.

    Required fields:
    - rainfall
    - area
    - slope

    Optional fields for ML weather features:
    - temperature (default 25)
    - humidity (default 70)
    - wind_speed (default 12)
    - pressure (default 1005)
    """

@app.get("/")
def home():
    return "Cloudburst Backend Running 🚀"

    data = request.get_json(silent=True) or {}
    try:
        observed_rainfall = float(data.get("rainfall", 0))
        area = float(data["area"])
        slope = float(data["slope"])

        weather_features = {
            "temperature": float(data.get("temperature", 25)),
            "humidity": float(data.get("humidity", 70)),
            "wind_speed": float(data.get("wind_speed", 12)),
            "pressure": float(data.get("pressure", 1005)),
        }

        predicted_rainfall = predict_rainfall(ml_model, weather_features)

        # Blend observed and predicted rainfall to use both user input and model insight.
        effective_rainfall = (observed_rainfall + predicted_rainfall) / 2.0
        runoff_coefficient = min(0.95, 0.35 + (slope / 100.0))

        discharge = calculate_discharge(runoff_coefficient, effective_rainfall, area)
        hii = calculate_hii(discharge, slope, area)
        risk_level = classify_risk(hii)
        result_payload = {
            "predicted_rainfall": round(predicted_rainfall, 2),
            "discharge": round(discharge, 2),
            "hii": round(hii, 2),
            "risk_level": risk_level,
            "model_metrics": model_metrics,
        }

        save_prediction(
            user_id=data.get("user_id"),
            email=data.get("email"),
            location=data.get("location"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            input_payload=data,
            output_payload=result_payload,
        )

        return jsonify(result_payload)
    except KeyError as exc:
        return jsonify({"error": f"Missing required field: {exc}"}), 400
    except ValueError:
        return jsonify({"error": "Invalid numeric input provided."}), 400


@app.post("/auth/signup")
def signup():
    """Create user account."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400
    if get_user_by_email(email):
        return jsonify({"error": "Email already registered. Please login."}), 409

    user_id = create_user(name, email, hash_password(password))
    return jsonify({"message": "Signup successful.", "user": {"id": user_id, "name": name, "email": email}})


@app.post("/auth/login")
def login():
    """Authenticate existing user."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid credentials."}), 401

    return jsonify(
        {
            "message": "Login successful.",
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    )


@app.post("/send-report")
def send_report():
    """Send weather/prediction report to user email and store send record."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    prediction = data.get("prediction") or {}
    location = data.get("location") or "Selected location"
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    subject = "K-Loudcast Weather and Cloudburst Report"
    body = (
        "Hello,\n\n"
        "Here is your requested K-Loudcast weather report.\n\n"
        f"Location: {location}\n"
        f"Latitude: {latitude}\n"
        f"Longitude: {longitude}\n"
        f"Predicted Rainfall: {prediction.get('predicted_rainfall', '-')}\n"
        f"River Discharge: {prediction.get('discharge', '-')}\n"
        f"Hydrological Impact Index: {prediction.get('hii', '-')}\n"
        f"Risk Level: {prediction.get('risk_level', '-')}\n\n"
        "Stay safe,\n"
        "K-Loudcast"
    )

    try:
        send_status, message = send_email_with_optional_smtp(email, subject, body)
        report_id = save_email_report(
            user_id=data.get("user_id"),
            email=email,
            subject=subject,
            body=body,
            send_status=send_status,
        )
        return jsonify({"message": message, "status": send_status, "report_id": report_id})
    except Exception as exc:
        save_email_report(
            user_id=data.get("user_id"),
            email=email,
            subject=subject,
            body=body,
            send_status=f"failed: {exc}",
        )
        return jsonify({"error": f"Failed to send email: {exc}"}), 500


@app.get("/community/reports")
def community_reports():
    """Return latest community weather reports."""
    try:
        limit = int(request.args.get("limit", 25))
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400
    reports = get_community_reports(limit=max(1, min(limit, 100)))
    return jsonify({"reports": reports})


@app.post("/community/reports")
def create_community_report():
    """Store community observation report."""
    data = request.get_json(silent=True) or {}
    report_type = (data.get("report_type") or "").strip()
    intensity = (data.get("intensity") or "").strip()
    description = (data.get("description") or "").strip()
    if not report_type or not intensity or not description:
        return jsonify({"error": "report_type, intensity and description are required."}), 400

    report_id = save_community_report(
        user_id=data.get("user_id"),
        report_type=report_type,
        intensity=intensity,
        description=description,
        location=data.get("location"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        contact_email=data.get("contact_email"),
    )
    report = {
        "id": report_id,
        "report_type": report_type,
        "intensity": intensity,
        "description": description,
        "location": data.get("location"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "contact_email": data.get("contact_email"),
        "created_at": "just now",
    }
    return jsonify({"message": "Report submitted.", "report": report}), 201


@app.post("/alerts/preferences")
def alerts_preferences():
    """Save user alert preferences for threshold/radius/email."""
    data = request.get_json(silent=True) or {}
    threshold = (data.get("threshold") or "").strip()
    radius_km = data.get("radius_km")
    if threshold not in {"Moderate", "High", "Severe"}:
        return jsonify({"error": "threshold must be Moderate, High, or Severe."}), 400
    try:
        radius_km = float(radius_km)
    except (ValueError, TypeError):
        return jsonify({"error": "radius_km must be numeric."}), 400
    if radius_km <= 0:
        return jsonify({"error": "radius_km must be positive."}), 400

    pref_id = save_alert_preference(
        user_id=data.get("user_id"),
        email=data.get("email"),
        threshold=threshold,
        radius_km=radius_km,
        email_enabled=bool(data.get("email_enabled", True)),
    )
    return jsonify({"message": "Alert preferences saved.", "preference_id": pref_id})


if __name__ == "__main__":
    app.run(debug=True)
