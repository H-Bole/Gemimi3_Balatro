
class BGMSequencer {
    private ctx: AudioContext;
    private isPlaying: boolean = false;
    private nextNoteTime: number = 0;
    private tempo: number = 120; // Funky Tempo
    private current16thNote: number = 0;
    private volume: number = 0.5;
    private masterGain: GainNode | null = null;
    private scheduleAheadTime: number = 0.1;
    private lookahead: number = 25;
    private timerID: number | null = null;

    // Funky Bass Line (Dm9 Loop style)
    private bassLine = [
        { note: 73.42, len: 0.25 }, null, null, { note: 73.42, len: 0.25 }, // D
        { note: 87.31, len: 0.25 }, null, { note: 98.00, len: 0.25 }, null, // F, G
        { note: 110.00, len: 0.25 }, null, null, { note: 110.00, len: 0.25 }, // A
        { note: 65.41, len: 0.25 }, null, { note: 73.42, len: 0.5 }, null // C, D
    ];

    // Synth Chords (Vaporwave style pads)
    private chords = [
        [261.63, 311.13, 392.00, 493.88], // Cmaj7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [196.00, 246.94, 293.66, 349.23], // G7
    ];

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
    }

    public setMasterGain(node: GainNode) {
        this.masterGain = node;
    }

    public setVolume(vol: number) {
        this.volume = vol;
    }

    public start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.current16thNote = 0;
        this.scheduler();
    }

    public stop() {
        this.isPlaying = false;
        if (this.timerID !== null) {
            window.clearTimeout(this.timerID);
        }
    }

    private scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
        if (this.isPlaying) {
            this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
        }
    }

    private nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
        }
    }

    private scheduleNote(beatNumber: number, time: number) {
        if (!this.masterGain) return;

        // Bass
        const bassNote = this.bassLine[beatNumber];
        if (bassNote) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = bassNote.note;

            // Lowpass filter for that funky bass sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 600;
            filter.Q.value = 1;

            gain.gain.setValueAtTime(0.15 * this.volume, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + bassNote.len);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + bassNote.len);
        }

        // Chords (Every 8 beats, 2 bars)
        if (beatNumber % 4 === 0) {
            const chordIdx = Math.floor(beatNumber / 4) % this.chords.length;
            const chord = this.chords[chordIdx];
            
            chord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0.02 * this.volume, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 1.0); // Long decay
                
                osc.connect(gain);
                gain.connect(this.masterGain!);
                osc.start(time);
                osc.stop(time + 1.0);
            });
        }

        // Hi-hats (Closed 16th)
        if (beatNumber % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 8000; // High noise-like
            
            // Bandpass to shape it like a hat
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 10000;
            
            gain.gain.setValueAtTime(0.01 * this.volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    }
}

class AudioService {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null; 
  private volume: number = 0.5;
  private musicVolume: number = 0.5;
  private sequencer: BGMSequencer | null = null;
  private pitchMod: number = 1.0; // Current pitch modifier for ramping

  constructor() {
  }

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // SFX Bus
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = this.volume;

      // Music Bus
      this.musicGainNode = this.ctx.createGain();
      this.musicGainNode.connect(this.ctx.destination);
      this.musicGainNode.gain.value = this.musicVolume * 0.5;

      this.sequencer = new BGMSequencer(this.ctx);
      this.sequencer.setMasterGain(this.musicGainNode);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
      this.musicVolume = Math.max(0, Math.min(1, vol));
      if (this.sequencer) this.sequencer.setVolume(this.musicVolume);
      if (this.musicGainNode && this.ctx) {
          this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.5, this.ctx.currentTime);
      }
  }

  public startBGM() {
      this.getContext();
      if (this.sequencer) {
          this.sequencer.start();
      }
  }

  public stopBGM() {
      if (this.sequencer) this.sequencer.stop();
  }

  public resetPitch() {
      this.pitchMod = 1.0;
  }

  public incrementPitch() {
      this.pitchMod = Math.min(2.5, this.pitchMod + 0.1);
  }

  public playCoin() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  public playClick() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playScoreTick() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
    gain.gain.setValueAtTime(0.05 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playCardSelect() {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.05; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode!);
    noise.start();
  }

  // New generic blip sound with pitch control
  public playBlip(type: 'chips' | 'mult' | 'fire') {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const pitch = this.pitchMod;

      if (type === 'chips') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440 * pitch, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880 * pitch, ctx.currentTime + 0.1);
      } else if (type === 'mult') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(330 * pitch, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(660 * pitch, ctx.currentTime + 0.15);
      } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110 * pitch, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(220 * pitch, ctx.currentTime + 0.2);
      }

      gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.gainNode!);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
  }

  // Backward compatibility wrappers
  public playChipAdd() {
    this.playBlip('chips');
  }

  public playMultAdd() {
    this.playBlip('mult');
  }

  public playScoreTotal() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); 
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); 
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); 
    gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2 * this.volume, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  public playError() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
  
  public playShuffle() {
     const count = 5;
     for(let i=0; i<count; i++) {
         setTimeout(() => this.playCardSelect(), i * 60);
     }
  }
}

export const audio = new AudioService();
