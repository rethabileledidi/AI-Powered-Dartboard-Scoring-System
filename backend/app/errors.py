"""Domain errors carry the HTTP status they should map to."""


class DomainError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class AuthError(DomainError):
    status_code, code = 401, "unauthorized"


class Forbidden(DomainError):
    status_code, code = 403, "forbidden"


class NotFound(DomainError):
    status_code, code = 404, "not_found"


class Conflict(DomainError):
    status_code, code = 409, "conflict"


class PayloadTooLarge(DomainError):
    status_code, code = 413, "payload_too_large"
