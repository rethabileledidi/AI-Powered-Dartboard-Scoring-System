import time
import unittest

import jwt

from app.auth import decode_token, hash_password, issue_token, verify_password
from app.errors import AuthError


class AuthTests(unittest.TestCase):
    def test_password_hashing(self):
        h = hash_password("s3cret-pass", 1000)
        self.assertTrue(verify_password("s3cret-pass", h))
        self.assertFalse(verify_password("S3cret-pass", h))
        self.assertNotEqual(h, hash_password("s3cret-pass", 1000))     # unique salts
        self.assertFalse(verify_password("x", "malformed"))

    def test_token_round_trip_and_tampering(self):
        tok = issue_token(7, "alice", "k", 5)
        self.assertEqual(decode_token(tok, "k")["sub"], "7")
        with self.assertRaises(AuthError):
            decode_token(tok, "other-key")

    def test_expired_and_alg_none_rejected(self):
        expired = jwt.encode({"sub": "1", "exp": int(time.time()) - 10}, "k", algorithm="HS256")
        with self.assertRaises(AuthError):
            decode_token(expired, "k")
        none_tok = jwt.encode({"sub": "1"}, None, algorithm="none")
        with self.assertRaises(AuthError):
            decode_token(none_tok, "k")


if __name__ == "__main__":
    unittest.main()
