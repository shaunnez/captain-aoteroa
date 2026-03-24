// tts-playback-processor.js
// Plays raw PCM audio chunks (Int16, 24kHz mono) streamed from the server.
// The main thread posts Int16Array buffers; this processor writes them
// to the audio output in realtime with a ring buffer.

const RING_BUFFER_SIZE = 24000 * 5 // 5 seconds of audio at 24kHz

class TtsPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._ring = new Float32Array(RING_BUFFER_SIZE)
    this._writePos = 0
    this._readPos = 0
    this._available = 0

    this.port.onmessage = (e) => {
      const int16 = new Int16Array(e.data)
      for (let i = 0; i < int16.length; i++) {
        if (this._available >= RING_BUFFER_SIZE) break // drop if full
        this._ring[this._writePos] = int16[i] / 32768.0
        this._writePos = (this._writePos + 1) % RING_BUFFER_SIZE
        this._available++
      }
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0][0]
    if (!output) return true

    for (let i = 0; i < output.length; i++) {
      if (this._available > 0) {
        output[i] = this._ring[this._readPos]
        this._readPos = (this._readPos + 1) % RING_BUFFER_SIZE
        this._available--
      } else {
        output[i] = 0 // silence while buffer is empty
      }
    }

    return true
  }
}

registerProcessor('tts-playback-processor', TtsPlaybackProcessor)
