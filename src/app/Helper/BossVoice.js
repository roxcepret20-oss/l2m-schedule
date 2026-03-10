class BossVoice {
  constructor() {
    this.synth = null;
    this.voices = [];
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.synth = window.speechSynthesis;
    this.voices = this.synth.getVoices() || [];
    this.synth.addEventListener("voiceschanged", () => {
      this.voices = this.synth.getVoices() || [];
    });
    this._initialized = true;
  }

  getVoice() {
    this.init();
    if (!this.voices || !this.voices.length) return null;
    return (
      this.voices.find(v => /female|zira|susan|samantha/i.test(v.name)) ||
      this.voices[0] ||
      null
    );
  }

  speak(bossName, minutes) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.init();
    const text =
      minutes === 0
        ? `${bossName} is spawning now! Let's go!`
        : `${bossName} will spawn in ${minutes} minute${minutes === 1 ? "" : "s"}, let's go!`;
    const msg = new SpeechSynthesisUtterance(text);
    const voice = this.getVoice();
    if (voice) msg.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

export default new BossVoice();