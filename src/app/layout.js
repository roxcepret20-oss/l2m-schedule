import Navbar from "./components/Navbar";
import Footer from "./components/footer";
import PinGate from "./components/PinGate";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Shatter Schedule",
  description: "Lineage 2M boss spawn schedule tracker",
};

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <head>
<       script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{const saved=localStorage.getItem("theme");const theme=saved||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",theme);}catch(e){}})();`,
        }}
      />
      </head>
      
      <body className="page-container">
        <PinGate>
          <Navbar />
          {children}
          <Footer />
        </PinGate>
      </body>
    </html>
  );
}
