"use client";

import ThemeToggle from "./ThemeToggle";
import VolumeSlider from "./VolumeSlider";

export default function AltServerNavbar() {
  return (
    <nav className="navbar">
      <div className="logo">Alt Schedule</div>
      <ThemeToggle />
    </nav>
  );
}