import "./globals.css";
import DemoControls from "./components/DemoControls";
import SessionBanner from "./components/SessionBanner";

export const metadata = {
  title: "ATLAS DataGob · Intake",
  description: "Policy RAG and architecture validation intake cockpit"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionBanner />
        {children}
        <DemoControls />
      </body>
    </html>
  );
}
