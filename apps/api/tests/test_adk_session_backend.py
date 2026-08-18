from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from atlas_datagob.services.adk_session_backend import resolve_adk_session_backend_config


SESSION_ENV_KEYS = {
    "ATLAS_ADK_SESSION_BACKEND",
    "ATLAS_ADK_REQUIRE_DURABLE_SESSIONS",
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_LOCATION",
    "GOOGLE_CLOUD_AGENT_ENGINE_ID",
    "ATLAS_GCP_PROJECT",
    "ATLAS_GCP_LOCATION",
    "ATLAS_ADK_AGENT_ENGINE_ID",
}


def clean_session_env(**values: str):
    env = {key: value for key, value in os.environ.items() if key not in SESSION_ENV_KEYS}
    env.update(values)
    return patch.dict(os.environ, env, clear=True)


class AdkSessionBackendTest(unittest.TestCase):
    def test_local_default_is_in_memory_and_not_durable(self):
        with clean_session_env():
            config = resolve_adk_session_backend_config()

        self.assertEqual(config.backend, "in_memory")
        self.assertFalse(config.durable)
        self.assertFalse(config.durable_required)

    def test_production_fail_closed_rejects_in_memory_when_durable_required(self):
        with clean_session_env(
            ATLAS_ADK_SESSION_BACKEND="in_memory",
            ATLAS_ADK_REQUIRE_DURABLE_SESSIONS="true",
        ):
            with self.assertRaisesRegex(RuntimeError, "Durable ADK sessions are required"):
                resolve_adk_session_backend_config()

    def test_vertex_ai_backend_requires_project_location_and_agent_engine_id(self):
        with clean_session_env(
            ATLAS_ADK_SESSION_BACKEND="vertex_ai",
            ATLAS_ADK_REQUIRE_DURABLE_SESSIONS="true",
        ):
            with self.assertRaisesRegex(RuntimeError, "Vertex AI ADK sessions require"):
                resolve_adk_session_backend_config()

    def test_vertex_ai_backend_resolves_durable_agent_platform_sessions(self):
        with clean_session_env(
            ATLAS_ADK_SESSION_BACKEND="vertex_ai",
            ATLAS_ADK_REQUIRE_DURABLE_SESSIONS="true",
            GOOGLE_CLOUD_PROJECT="proyectopersonal-480420",
            GOOGLE_CLOUD_LOCATION="us-central1",
            GOOGLE_CLOUD_AGENT_ENGINE_ID="123456789",
        ):
            config = resolve_adk_session_backend_config()

        self.assertEqual(config.backend, "vertex_ai")
        self.assertTrue(config.durable)
        self.assertTrue(config.durable_required)
        self.assertEqual(config.project, "proyectopersonal-480420")
        self.assertEqual(config.location, "us-central1")
        self.assertEqual(config.agent_engine_id, "123456789")


if __name__ == "__main__":
    unittest.main()
