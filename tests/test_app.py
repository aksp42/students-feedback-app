import sqlite3
import pytest

from app import create_app


@pytest.fixture
def client(tmp_path):
    db_file = str(tmp_path / "test.db")
    app = create_app(db_file)
    app.config["TESTING"] = True
    app.config["DB_PATH"] = db_file
    return app.test_client()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_index_get(client):
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.get_data(as_text=True)
    assert "Student Feedback System" in body
    assert "Roll Number" in body
    assert "ERP / ERP ID" in body
    assert "Gmail / Email" in body
    assert "Class" in body
    assert "Section" in body


def test_submit_and_display(client):
    payload = {
        "name": "Ananya Shukla",
        "email": "ananya.shukla@gmail.com",
        "roll_no": "2401331540049",
        "student_class": "B.Tech CSE 4th Year",
        "section": "A",
        "erp": "ERP-140",
        "course": "DevOps & Cloud Computing",
        "feedback": "The CI/CD pipeline and containerization modules are excellent!",
    }
    resp = client.post("/", data=payload, follow_redirects=True)
    assert resp.status_code == 200
    body = resp.get_data(as_text=True)

    assert "Thank you! Your feedback was submitted." in body
    assert "Ananya Shukla" in body
    assert "ananya.shukla@gmail.com" in body
    assert "2401331540049" in body
    assert "B.Tech CSE 4th Year" in body
    assert "Sec A" in body
    assert "ERP-140" in body
    assert "The CI/CD pipeline and containerization modules are excellent!" in body


def test_field_aliases_support(client):
    # Support forms using gmail, rollnumber, and class aliases
    payload = {
        "name": "Priya Patel",
        "gmail": "priya.p@gmail.com",
        "rollnumber": "21IT205",
        "class": "B.Tech IT 3rd Year",
        "section": "B",
        "erp": "ERP-12345",
        "course": "Kubernetes Orchestration",
        "feedback": "Hands-on labs are very practical.",
    }
    resp = client.post("/", data=payload, follow_redirects=True)
    assert resp.status_code == 200
    body = resp.get_data(as_text=True)

    assert "Priya Patel" in body
    assert "priya.p@gmail.com" in body
    assert "21IT205" in body
    assert "ERP-12345" in body


@pytest.mark.parametrize(
    "missing_key",
    [
        "name",
        "email",
        "roll_no",
        "student_class",
        "section",
        "erp",
        "course",
        "feedback",
    ],
)
def test_missing_field_rejected(client, missing_key):
    payload = {
        "name": "Rohan",
        "email": "rohan@gmail.com",
        "roll_no": "21CS301",
        "student_class": "B.Tech",
        "section": "C",
        "erp": "ERP-55555",
        "course": "Cloud Security",
        "feedback": "Great content.",
    }
    payload[missing_key] = ""  # set empty
    resp = client.post("/", data=payload, follow_redirects=True)
    assert resp.status_code == 200
    body = resp.get_data(as_text=True)
    assert "All fields are required." in body


def test_html_is_escaped(client):
    xss_payload = {
        "name": "<script>alert('xss')</script>",
        "email": "xss@gmail.com",
        "roll_no": "21CS999",
        "student_class": "<b>TestClass</b>",
        "section": "A",
        "erp": "ERP-00000",
        "course": "Cyber Security",
        "feedback": "<img src=x onerror=alert(1)>",
    }
    resp = client.post("/", data=xss_payload, follow_redirects=True)
    assert resp.status_code == 200
    body = resp.get_data(as_text=True)
    assert "<script>alert('xss')</script>" not in body
    assert "<img src=x onerror=alert(1)>" not in body


def test_multiple_submissions_order(client):
    client.post(
        "/",
        data={
            "name": "Student One",
            "email": "one@gmail.com",
            "roll_no": "ROLL-1",
            "student_class": "Class 1",
            "section": "A",
            "erp": "ERP-1",
            "course": "Math",
            "feedback": "First feedback",
        },
        follow_redirects=True,
    )
    client.post(
        "/",
        data={
            "name": "Student Two",
            "email": "two@gmail.com",
            "roll_no": "ROLL-2",
            "student_class": "Class 2",
            "section": "B",
            "erp": "ERP-2",
            "course": "Physics",
            "feedback": "Second feedback",
        },
        follow_redirects=True,
    )

    resp = client.get("/")
    body = resp.get_data(as_text=True)
    pos_first = body.find("First feedback")
    pos_second = body.find("Second feedback")
    # Latest feedback should appear before the older feedback
    assert pos_second != -1 and pos_first != -1
    assert pos_second < pos_first


def test_db_persistence_direct(tmp_path):
    db_file = str(tmp_path / "persist.db")
    app = create_app(db_file)
    client = app.test_client()

    client.post(
        "/",
        data={
            "name": "Database Verification",
            "email": "db@gmail.com",
            "roll_no": "21DB001",
            "student_class": "M.Tech",
            "section": "Z",
            "erp": "ERP-99999",
            "course": "Advanced DB",
            "feedback": "Verifying column storage directly",
        },
        follow_redirects=True,
    )

    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM feedback WHERE erp = 'ERP-99999'").fetchone()
    assert row is not None
    assert row["name"] == "Database Verification"
    assert row["email"] == "db@gmail.com"
    assert row["roll_no"] == "21DB001"
    assert row["student_class"] == "M.Tech"
    assert row["section"] == "Z"
    assert row["erp"] == "ERP-99999"
    assert row["course"] == "Advanced DB"
    assert row["feedback"] == "Verifying column storage directly"
    conn.close()