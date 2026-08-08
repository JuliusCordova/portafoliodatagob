from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from atlas_datagob.services.authz import (
    AUTH_MODE_DISABLED,
    AUTH_MODE_HEADER,
    ROLE_DATA_OWNER,
    ROLE_DATA_STEWARD,
    ROLE_PLATFORM_ADMIN,
    AuthConfigurationError,
    AuthenticationError,
    AuthorizationError,
    auth_snapshot,
    authorize_request,
    context_from_headers,
    has_permission,
    permission_for_request,
    require_permission,
    validate_auth_configuration,
)


class AuthzModelTest(unittest.TestCase):
    def test_default_auth_mode_is_disabled_and_admin_like(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            context = context_from_headers({})

        self.assertEqual(AUTH_MODE_DISABLED, context.mode)
        self.assertFalse(context.authenticated)
        self.assertIn(ROLE_PLATFORM_ADMIN, context.roles)
        self.assertTrue(has_permission(context, "demo:reset"))

    def test_header_mode_requires_user_and_roles(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            with self.assertRaises(AuthenticationError):
                context_from_headers({"x-atlas-roles": ROLE_DATA_OWNER})
            with self.assertRaises(AuthenticationError):
                context_from_headers({"x-atlas-user": "owner@example.com"})

    def test_header_mode_rejects_unknown_roles(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            with self.assertRaises(AuthenticationError):
                context_from_headers({"x-atlas-user": "user@example.com", "x-atlas-roles": "unknown_role"})

    def test_data_owner_can_create_but_cannot_update_status(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            context = context_from_headers(
                {"x-atlas-user": "owner@example.com", "x-atlas-roles": ROLE_DATA_OWNER}
            )

        self.assertTrue(has_permission(context, "demand:create"))
        self.assertTrue(has_permission(context, "ops:read"))
        self.assertFalse(has_permission(context, "demand:status:update"))
        with self.assertRaises(AuthorizationError):
            require_permission(context, "demand:status:update")

    def test_data_steward_can_reset_demo_and_score(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            context = context_from_headers(
                {"x-atlas-user": "steward@example.com", "x-atlas-roles": ROLE_DATA_STEWARD}
            )

        self.assertTrue(has_permission(context, "demo:reset"))
        self.assertTrue(has_permission(context, "demand:score"))

    def test_route_permission_mapping_covers_core_paths(self) -> None:
        self.assertIsNone(permission_for_request("GET", "/health"))
        self.assertIsNone(permission_for_request("OPTIONS", "/demands/backlog"))
        self.assertEqual("ops:read", permission_for_request("GET", "/ops/readiness"))
        self.assertEqual("demand:create", permission_for_request("POST", "/demands/validate-and-create"))
        self.assertEqual("demand:read", permission_for_request("GET", "/demands/DEM-001"))
        self.assertEqual("demand:update", permission_for_request("PATCH", "/demands/DEM-001"))
        self.assertEqual("demand:status:update", permission_for_request("PATCH", "/demands/DEM-001/status"))
        self.assertEqual("demand:score", permission_for_request("POST", "/demands/DEM-001/score"))
        self.assertEqual("demo:reset", permission_for_request("POST", "/demo/reset"))

    def test_authorize_request_keeps_public_routes_public_in_header_mode(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            context = authorize_request("GET", "/health", {})
            preflight_context = authorize_request("OPTIONS", "/demands/backlog", {})

        self.assertEqual("public", context.user)
        self.assertFalse(context.authenticated)
        self.assertEqual("public", preflight_context.user)

    def test_authorize_request_enforces_header_roles(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            context = authorize_request(
                "POST",
                "/demands/validate-and-create",
                {"x-atlas-user": "owner@example.com", "x-atlas-roles": ROLE_DATA_OWNER},
            )
            self.assertEqual("owner@example.com", context.user)

            ops_context = authorize_request(
                "GET",
                "/ops/readiness",
                {"x-atlas-user": "owner@example.com", "x-atlas-roles": ROLE_DATA_OWNER},
            )
            self.assertEqual("owner@example.com", ops_context.user)

            with self.assertRaises(AuthorizationError):
                authorize_request(
                    "PATCH",
                    "/demands/DEM-001/status",
                    {"x-atlas-user": "owner@example.com", "x-atlas-roles": ROLE_DATA_OWNER},
                )

    def test_invalid_auth_mode_fails_fast(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": "magic"}, clear=True):
            with self.assertRaises(AuthConfigurationError):
                validate_auth_configuration()

    def test_auth_snapshot_lists_supported_modes_roles_and_permissions(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            snapshot = auth_snapshot()

        self.assertIn(AUTH_MODE_DISABLED, snapshot["supported_modes"])
        self.assertIn(AUTH_MODE_HEADER, snapshot["supported_modes"])
        self.assertIn(ROLE_DATA_OWNER, snapshot["supported_roles"])
        self.assertIn("demand:create", snapshot["permissions_by_role"][ROLE_DATA_OWNER])
        self.assertIn("ops:read", snapshot["permissions_by_role"][ROLE_DATA_OWNER])


if __name__ == "__main__":
    unittest.main()
