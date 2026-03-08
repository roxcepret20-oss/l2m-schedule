import Link from "next/link";

export default function Navbar() {
  return (
    <nav class="navbar">
      <Link href="/" class="navbar-menu">All Bosses</Link>
      <Link href="/ffa-bosses" class="navbar-menu">FFA Bosses</Link>
      <Link href="/inputs" class="navbar-menu">Inputs</Link>
    </nav>
  );
}