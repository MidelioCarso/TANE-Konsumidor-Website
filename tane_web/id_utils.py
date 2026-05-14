import hashlib
import secrets


def generate_hashed_id() -> str:
	seed = secrets.token_hex(32)
	return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:24]
