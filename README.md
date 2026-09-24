# Student Feedback System

A student feedback web application built with **Flask + SQLite**. Students enter their name, roll number, ERP ID, email, class, section, course and feedback; submissions are stored in a SQLite database and displayed on the same page (newest first).

## Features

- Server-rendered form with validation (all fields required)
- XSS-safe output (Jinja2 autoescaping)
- SQLite persistence (table: `feedback`)
- Field aliases supported: `gmail`, `rollnumber`, `class`
- `/health` endpoint for uptime checks
- Pytest test suite (13 tests) covering health, rendering, submission, aliases, validation, escaping, ordering and direct DB persistence
- CI/CD with GitHub Actions: `pytest` + Docker image published to GHCR

## Run locally

```bash
pip install -r requirements.txt
python app.py            # http://localhost:5000
# or
flask --app app run --debug
```

## Run tests

```bash
pytest -v
```

## Project structure

```
studentvoice/
├── app.py                  # Flask application factory
├── templates/index.html    # form + feedback list
├── static/css/style.css    # styles (reused from the original project)
├── tests/test_app.py       # pytest suite
├── requirements.txt        # flask, gunicorn, pytest
├── Dockerfile              # python:3.12-slim image
└── .github/workflows/ci-cd.yml
```

## CI/CD pipeline (GitHub Actions)

1. **Test** - installs dependencies, runs `pytest -v`.
2. **Build** - builds the Docker image and pushes it to `ghcr.io/<owner>/students-feedback-app` (latest + commit SHA). Pushes happen on `main`; PRs only build.

## Deploying the app

This is a server-side Flask app (not static), so it cannot be hosted on GitHub Pages. Deploy the published container to any host:

```bash
docker run -p 5000:5000 ghcr.io/<owner>/students-feedback-app:latest
```

Or connect the repo to Render / Railway / Fly.io (auto-deploys on push to `main`).