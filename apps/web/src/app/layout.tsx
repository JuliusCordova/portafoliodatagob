import "./globals.css";
import DemoControls from "./components/DemoControls";

export const metadata = {
  title: "ATLAS DataGob · Intake",
  description: "Policy RAG and architecture validation intake cockpit"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <DemoControls />
      </body>
    </html>
  );
}
