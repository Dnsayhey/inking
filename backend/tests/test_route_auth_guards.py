from fastapi.routing import APIRoute

from src.main import app


PROTECTED_PATHS = {
    "/auth/me",
}
PUBLIC_AUTH_PATHS = {
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
}


def _route_dependencies(route: APIRoute) -> set[str]:
    return {dep.call.__name__ for dep in route.dependant.dependencies if dep.call}


def test_protected_routes_require_get_current_user_dependency():
    missing: list[tuple[str, str]] = []

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path.startswith("/notes") or route.path.startswith("/tags") or route.path in PROTECTED_PATHS:
            deps = _route_dependencies(route)
            if "get_current_user" not in deps:
                methods = ",".join(sorted(route.methods))
                missing.append((methods, route.path))

    assert missing == []


def test_public_auth_routes_do_not_require_get_current_user_dependency():
    wrong_guard: list[tuple[str, str]] = []

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path in PUBLIC_AUTH_PATHS:
            deps = _route_dependencies(route)
            if "get_current_user" in deps:
                methods = ",".join(sorted(route.methods))
                wrong_guard.append((methods, route.path))

    assert wrong_guard == []
