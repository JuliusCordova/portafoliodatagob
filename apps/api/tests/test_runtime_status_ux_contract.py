from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "apps/web/src/app/page.tsx"


class RuntimeStatusUxContractTest(unittest.TestCase):
    def test_runtime_does_not_start_as_false_demo(self):
        text = PAGE.read_text()

        self.assertIn(
            'const [mode, setMode] = useState<RuntimeMode>("loading");',
            text,
        )

    def test_backlog_sync_updates_runtime_connection_state(self):
        text = PAGE.read_text()

        start = text.index("  async function loadBacklog")
        end = text.index("\n  useEffect(", start)
        load_backlog = text[start:end]

        self.assertIn('setMode("api");', load_backlog)
        self.assertIn('setMode("error");', load_backlog)

    def test_executive_view_displays_portfolio_sync_status(self):
        text = PAGE.read_text()

        self.assertIn(
            '{activeView === "executive" ? backlogMessage : connectionMessage}',
            text,
        )


if __name__ == "__main__":
    unittest.main()
