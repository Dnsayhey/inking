from src.auth.password import hash_password, verify_password


def test_hash_password_and_verify_success() -> None:
    plain = "a_secure_password123"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True


def test_verify_password_with_wrong_password() -> None:
    hashed = hash_password("correct_password")

    assert verify_password("wrong_password", hashed) is False
