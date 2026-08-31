import "./globals.css";
import AgentGovernanceEnhancer from "./components/AgentGovernanceEnhancer";
import AgentGovernanceEvidenceSections from "./components/AgentGovernanceEvidenceSections";
import AgentGovernanceNavigationSync from "./components/AgentGovernanceNavigationSync";
import DemoControls from "./components/DemoControls";
import ExecutiveDemoRibbon from "./components/ExecutiveDemoRibbon";
import ProductNavigation from "./components/ProductNavigation";
import SessionBanner from "./components/SessionBanner";

export const metadata = {
  title: "ATLAS DataGob · Executive Pilot",
  description: "Executive-ready demand governance cockpit for ATLAS DataGob"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ExecutiveDemoRibbon />
        <SessionBanner />
        <ProductNavigation />
        {children}
        <AgentGovernanceNavigationSync />
        <AgentGovernanceEnhancer />
        <AgentGovernanceEvidenceSections />
        <DemoControls />
      </body>
    </html>
  );
}
