"use client"

// This is a placeholder service that will always return an error
// until we can properly fix the Transformers.js integration
export class TranscriptionService {
  private isLoading = false

  constructor() {
    console.warn("Transformers.js integration is currently disabled due to browser compatibility issues")
  }

  public async isModelLoaded(): Promise<boolean> {
    return false
  }

  public async transcribe(audioBlob: Blob): Promise<string> {
    throw new Error("Whisper AI transcription is currently unavailable in this environment")
  }

  public getLoadingStatus(): boolean {
    return this.isLoading
  }
}

// Create a singleton instance
let transcriptionServiceInstance: TranscriptionService | null = null

export function getTranscriptionService(): TranscriptionService {
  if (!transcriptionServiceInstance && typeof window !== "undefined") {
    transcriptionServiceInstance = new TranscriptionService()
  }
  return transcriptionServiceInstance as TranscriptionService
}
