import Link from "next/link";

export const metadata = {
  title: "Not accessible - Shatter Schedule",
};

export default function ForbiddenPage() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: 32,
        textAlign: "center",
        background: "var(--card-bg)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">🚫</div>
      <h1 style={{ fontSize: 22, margin: "16px 0 8px" }}>This page is not accessible anymore</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>
        The page you tried to open is currently closed.
      </p>
      <Link href="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
        ← Back to schedule
      </Link>
    </div>
  );
}
