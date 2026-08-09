"use client";

import { useEffect, useRef, useState } from "react";
import bossVoice from "../Helper/BossVoice";
import eventVoice from "../Helper/EventVoice";

const VOLUME_KEY = "bossVolume";

export default function VolumeSlider() {
  const [volume, setVolume] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);
  const previewTimer = useRef(null);

  // apply the persisted volume once voice singletons are available client-side
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem(VOLUME_KEY));
    const initial = isNaN(saved) ? 1 : Math.min(1, Math.max(0, saved));
    setVolume(initial);
    bossVoice.setVolume(initial);
    eventVoice.setVolume(initial);
  }, []);

  useEffect(() => {
    return () => clearTimeout(previewTimer.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // speak a short preview at the chosen volume, debounced so dragging doesn't spam it
  function previewVolume(level) {
    if (typeof window === "undefined" || !window.speechSynthesis || level === 0) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      const msg = new SpeechSynthesisUtterance("Volume set");
      msg.volume = level;
      const voice = bossVoice.getVoice();
      if (voice) msg.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    }, 300);
  }

  function handleChange(e) {
    const next = parseFloat(e.target.value);
    setVolume(next);
    bossVoice.setVolume(next);
    eventVoice.setVolume(next);
    localStorage.setItem(VOLUME_KEY, String(next));
    previewVolume(next);
  }

  return (
    <div className="volume-slider" ref={wrapRef}>
      <button
        type="button"
        className="volume-toggle"
        aria-label="Boss and event speech volume"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {volume === 0 ? "🔇" : "🔊"}
      </button>

      {isOpen && (
        <div className="volume-popover" role="menu">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleChange}
            aria-label="Boss and event speech volume"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
