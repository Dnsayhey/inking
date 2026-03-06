from fastapi.testclient import TestClient

from src.main import app


def test_index_and_health_routes():
    client = TestClient(app)

    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()

    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
