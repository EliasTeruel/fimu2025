import type { Metadata } from "next";
import { Black_Ops_One, Inter, Pacifico } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";

// Títulos: Black Ops One (similar a Kitck Text Black - bold, impactante)
const blackOps = Black_Ops_One({
  weight: '400',
  subsets: ['latin'],
  variable: "--font-title",
  display: "swap",
});

// Texto: Inter (similar a Clean Sans - limpia, moderna, minimalista)
const inter = Inter({
  subsets: ['latin'],
  variable: "--font-body",
  display: "swap",
});

// Resaltar/Detalle: Pacifico (similar a Day Dream - script, decorativa)
const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fimu Vintage",
  description: "Tienda de ropa vintage, retro y segunda mano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${blackOps.variable} ${inter.variable} ${pacifico.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
