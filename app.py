import os
import sqlite3

from flask import Flask, g, render_template, request, redirect, url_for

DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    student_class TEXT NOT NULL,
    section TEXT NOT NULL,
    erp TEXT NOT NULL,
    course TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

REQUIRED_FIELDS = ("name", "email", "roll_no", "student_class", "section", "erp", "course", "feedback")

FIELD_ALIASES = {
    "email": ("email", "gmail"),
    "roll_no": ("roll_no", "rollnumber"),
    "student_class": ("student_class", "class"),
}


def connect(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(DB_SCHEMA)
    conn.commit()
    return conn


def create_app(db_file=None):
    app = Flask(__name__)
    app.config["DB_PATH"] = db_file or os.environ.get("DB_PATH", "feedback.db")

    def get_conn():
        if "_db" not in g:
            g._db = connect(app.config["DB_PATH"])
        return g._db

    @app.teardown_appcontext
    def close_db(exc):
        db = g.pop("_db", None)
        if db is not None:
            db.close()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.route("/", methods=["GET", "POST"])
    def index():
        error = ""
        success = ""
        submitted = {}
        entries = []

        if request.method == "POST":
            data = {}
            for field in REQUIRED_FIELDS:
                value = ""
                for key in FIELD_ALIASES.get(field, (field,)):
                    if request.form.get(key):
                        value = request.form.get(key)
                        break
                data[field] = value.strip()
                submitted[field] = value

            missing = [f for f in REQUIRED_FIELDS if not data[f]]
            if missing:
                error = "All fields are required."
            else:
                conn = get_conn()
                conn.execute(
                    "INSERT INTO feedback (name, email, roll_no, student_class, section, erp, course, feedback)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        data["name"],
                        data["email"],
                        data["roll_no"],
                        data["student_class"],
                        data["section"],
                        data["erp"],
                        data["course"],
                        data["feedback"],
                    ),
                )
                conn.commit()
                success = "Thank you! Your feedback was submitted."
                submitted = {}
                return redirect(url_for("index", success="1"))

        conn = get_conn()
        entries = conn.execute("SELECT * FROM feedback ORDER BY created_at DESC, id DESC").fetchall()

        if request.args.get("success"):
            success = "Thank you! Your feedback was submitted."

        return render_template(
            "index.html",
            entries=entries,
            error=error,
            success=success,
            submitted=submitted,
        )

    return app


if __name__ == "__main__":
    create_app().run(debug=True)