// audio-processor.js
// Converts Float32 audio samples to 16-bit PCM and posts the buffer
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const float32 = input[0]  // mono channel
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      // Clamp to [-1, 1] then scale to Int16 range
      const clamped = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    }
    // Transfer the buffer (zero-copy) to the main thread
    this.port.postMessage(int16.buffer, [int16.buffer])
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
