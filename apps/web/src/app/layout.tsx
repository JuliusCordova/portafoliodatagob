import "./globals.css";

export const metadata = {
  title: "ATLAS DataGob · Intake",
  description: "Policy RAG and architecture validation intake cockpit"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
