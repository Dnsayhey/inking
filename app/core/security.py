from passlib.context import CryptContext


pwd_content = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_content.hash(password)


def verify_password_hash(password, hashed_password):
    return pwd_content.verify(password, hashed_password)

# def create_access_token(data: dict)