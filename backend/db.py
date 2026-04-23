"""
SQLite helpers for auth and prediction/report storage.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "cloudburst_app.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT,
                location TEXT,
                latitude REAL,
                longitude REAL,
                input_payload TEXT NOT NULL,
                output_payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS email_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                send_status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS community_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                report_type TEXT NOT NULL,
                intensity TEXT NOT NULL,
                description TEXT NOT NULL,
                location TEXT,
                latitude REAL,
                longitude REAL,
                contact_email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alert_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT,
                threshold TEXT NOT NULL,
                radius_km REAL NOT NULL,
                email_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )


def create_user(name: str, email: str, password_hash: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email.lower().strip(), password_hash),
        )
        return int(cursor.lastrowid)


def get_user_by_email(email: str):
    with get_connection() as conn:
        return conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()


def save_prediction(
    user_id: int | None,
    email: str | None,
    location: str | None,
    latitude: float | None,
    longitude: float | None,
    input_payload: dict,
    output_payload: dict,
) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO predictions (
                user_id, email, location, latitude, longitude, input_payload, output_payload
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                location,
                latitude,
                longitude,
                json.dumps(input_payload),
                json.dumps(output_payload),
            ),
        )
        return int(cursor.lastrowid)


def save_email_report(
    user_id: int | None, email: str, subject: str, body: str, send_status: str
) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO email_reports (user_id, email, subject, body, send_status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, email.lower().strip(), subject, body, send_status),
        )
        return int(cursor.lastrowid)


def save_community_report(
    user_id: int | None,
    report_type: str,
    intensity: str,
    description: str,
    location: str | None,
    latitude: float | None,
    longitude: float | None,
    contact_email: str | None,
) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO community_reports (
                user_id, report_type, intensity, description, location, latitude, longitude, contact_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                report_type,
                intensity,
                description,
                location,
                latitude,
                longitude,
                contact_email,
            ),
        )
        return int(cursor.lastrowid)


def get_community_reports(limit: int = 25):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, report_type, intensity, description, location, latitude, longitude, contact_email, created_at
            FROM community_reports
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def save_alert_preference(
    user_id: int | None,
    email: str | None,
    threshold: str,
    radius_km: float,
    email_enabled: bool,
) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO alert_preferences (user_id, email, threshold, radius_km, email_enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (user_id, email, threshold, radius_km, int(email_enabled)),
        )
        return int(cursor.lastrowid)
