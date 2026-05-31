class EventVoice {
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

  speakPrepare(eventName) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.init();
    const spokenEventName =
      eventName === "Clan Catacomb I"
        ? "Clan Catacomb First round"
        : eventName === "Clan Catacomb II"
          ? "Clan Catacomb Second Round"
          : eventName;
    const msg = new SpeechSynthesisUtterance(`Prepare for ${spokenEventName}`);
    const voice = this.getVoice();
    if (voice) msg.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

export default new EventVoice();