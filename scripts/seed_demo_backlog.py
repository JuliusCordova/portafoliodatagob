"""Materialize synthetic demo demand data into the runtime backlog model."""
from __future__ import annotations

from atlas_datagob.services.demand_backlog import DEFAULT_BACKLOG_PATH, reset_demo_backlog


if __name__ == "__main__":
    records = reset_demo_backlog(path=DEFAULT_BACKLOG_PATH, actor="Demo Seed Script")
    print(f"Seeded {len(records)} synthetic demand records into {DEFAULT_BACKLOG_PATH}")
