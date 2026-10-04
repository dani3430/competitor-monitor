import "./globals.css";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Competitor Monitor",
  description:
    "Compare your website against your competitors and get pricing, promotion and strategy recommendations.",
};

// Runs before the page paints, so there is no white flash in dark mode
const themeScript = `
try {
  var t = localStorage.getItem("theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (t === "dark" || (!t && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
            <body>
        <div className="bg-decor" aria-hidden="true">
          <span className="blob blob-a" />
          <span className="blob blob-b" />
          <span className="blob blob-c" />
        </div>
        {children}
        <Footer />
      </body>
    </html>
  );
}