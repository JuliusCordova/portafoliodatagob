from __future__ import annotations

from tempfile import TemporaryDirectory
import unittest

from atlas_datagob.domain.enums import DemandStatus
from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.local_repository import JsonDemandRepository


class JsonDemandRepositoryTest(unittest.TestCase):
    def test_create_get_list_and_update_status(self) -> None:
        with TemporaryDirectory() as tmp:
            repository = JsonDemandRepository(tmp)
            created = repository.create(
                DemandRequest(
                    title="Nueva demanda de calidad de clientes",
                    description="Necesitamos validar reglas de calidad y contactabilidad.",
                    requester_area="Comercial",
                    requester_role="Domain Owner",
                )
            )

            self.assertTrue(created["demand_id"].startswith("DEM-"))
            self.assertEqual(created["status"], DemandStatus.DRAFT.value)
            self.assertEqual(repository.get(created["demand_id"]), created)
            self.assertEqual(len(repository.list()), 1)

            updated = repository.update_status(created["demand_id"], DemandStatus.INTAKE_COMPLETED)
            self.assertEqual(updated["status"], DemandStatus.INTAKE_COMPLETED.value)
            self.assertIsNotNone(updated["updated_at"])

    def test_update_status_raises_for_unknown_id(self) -> None:
        with TemporaryDirectory() as tmp:
            repository = JsonDemandRepository(tmp)
            with self.assertRaises(KeyError):
                repository.update_status("DEM-UNKNOWN", DemandStatus.BACKLOG)


if __name__ == "__main__":
    unittest.main()
