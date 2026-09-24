export const metadata = {
  title: "Suivi compétences — STI2D SIN",
  description: "Application de suivi des compétences — Terminale STI2D SIN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Work Sans', system-ui, -apple-system, sans-serif",
          background: "#F7F5F0",
          color: "#1C1B1A",
        }}
      >
        {children}
      </body>
    </html>
  );
}
