"use client"

import { v4 as uuidv4 } from "uuid"
import { saveNote } from "./db"
import { getTags } from "@/utils/autoTag"
import { correctTranscriptGrammar } from "@/utils/grammar-correction"

type RecordingState = "inactive" | "recording" | "paused"
type TranscriptionMode = "web-speech" | "transformers"

interface VoiceServiceOptions {
  onTranscriptUpdate?: (transcript: string) => void
  onStateChange?: (state: RecordingState) => void
  onError?: (error: Error) => void
  onModelLoading?: (isLoading: boolean) => void
  language?: string
  transcriptionMode?: TranscriptionMode
}

// Declare SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export class VoiceService {
  private recognition: any = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private transcript = ""
  private finalTranscript = ""
  private interimTranscript = ""
  private recordingState: RecordingState = "inactive"
  private options: VoiceServiceOptions
  private stream: MediaStream | null = null
  private wakeLock: any = null
  private resultIndex = 0
  private transcriptionMode: TranscriptionMode = "web-speech" // Always default to web-speech
  private lastSpeechTimestamp = 0
  private pauseThreshold = 1000 // 1 second pause threshold
  private sentenceDetectionEnabled = true
  private lastProcessedLength = 0
  private pendingPunctuation = false
  private grammarCorrectionEnabled = false

  constructor(options: VoiceServiceOptions = {}) {
    this.options = {
      language: "en-US",
      transcriptionMode: "web-speech", // Force web-speech mode
      ...options,
    }

    // Override any transcription mode to web-speech
    this.transcriptionMode = "web-speech"

    // Check if browser supports required APIs
    if (typeof window !== "undefined") {
      if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        this.handleError(new Error("Speech recognition not supported in this browser"))
      }

      if (!("MediaRecorder" in window)) {
        this.handleError(new Error("MediaRecorder not supported in this browser"))
      }
    }

    // Notify that Transformers.js is unavailable
    if (options.transcriptionMode === "transformers" && options.onError) {
      options.onError(new Error("Whisper AI transcription is currently unavailable in this environment"))
    }
  }

  private handleError(error: Error) {
    console.error("VoiceService error:", error)
    if (this.options.onError) {
      this.options.onError(error)
    }
  }

  private updateState(state: RecordingState) {
    this.recordingState = state
    if (this.options.onStateChange) {
      this.options.onStateChange(state)
    }
  }

  private updateTranscript(final: string, interim: string) {
    this.finalTranscript = final
    this.interimTranscript = interim

    // Process the transcript with automatic punctuation and line breaks
    if (this.sentenceDetectionEnabled) {
      this.transcript = this.processTranscriptWithPauses(final, interim)
    } else {
      this.transcript = final + interim
    }

    // Apply grammar correction if enabled
    if (this.grammarCorrectionEnabled) {
      this.transcript = correctTranscriptGrammar(this.transcript)
    }

    if (this.options.onTranscriptUpdate) {
      this.options.onTranscriptUpdate(this.transcript)
    }
  }

  private processTranscriptWithPauses(finalText: string, interimText: string): string {
    const now = Date.now()
    const combinedText = finalText + interimText

    // If there's a significant pause in speech, consider adding punctuation
    const timeSinceLastSpeech = now - this.lastSpeechTimestamp

    // Only process if we have new content
    if (combinedText.length > this.lastProcessedLength) {
      this.lastSpeechTimestamp = now
      this.pendingPunctuation = false
      this.lastProcessedLength = combinedText.length
    } else if (timeSinceLastSpeech > this.pauseThreshold && !this.pendingPunctuation && interimText.trim() === "") {
      // If we have a pause and there's no interim text being processed
      // and we haven't already added punctuation for this pause
      this.pendingPunctuation = true

      // Don't add punctuation if the final text already ends with punctuation
      if (finalText.length > 0 && !finalText.trim().match(/[.!?,;:]$/)) {
        // Add a period at the natural pause
        return finalText + "." + interimText
      }
    }

    // Apply smart formatting to the text
    return this.formatTranscript(finalText + interimText)
  }

  private formatTranscript(text: string): string {
    if (!text) return ""

    // Step 1: Ensure proper capitalization after periods, question marks, and exclamation points
    let formattedText = text.replace(/([.!?])\s*([a-z])/g, (match, punctuation, letter) => {
      return punctuation + " " + letter.toUpperCase()
    })

    // Step 2: Ensure the first letter of the transcript is capitalized
    if (formattedText.length > 0 && /[a-z]/.test(formattedText[0])) {
      formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1)
    }

    // Step 3: Add question marks to questions
    formattedText = this.detectQuestions(formattedText)

    // Step 4: Add line breaks after sentences for better readability
    formattedText = this.addLineBreaks(formattedText)

    return formattedText
  }

  private detectQuestions(text: string): string {
    // Detect questions that don't already have question marks
    const questionPatterns = [
      /\b(who|what|when|where|why|how|is|are|was|were|will|do|does|did|can|could|would|should|may|might)\b.*[^?]$/i,
    ]

    // Check if the last sentence looks like a question but doesn't end with a question mark
    const sentences = text.split(/(?<=[.!])\s+/)
    if (sentences.length > 0) {
      const lastSentence = sentences[sentences.length - 1]

      // If it doesn't already end with punctuation and matches a question pattern
      if (
        lastSentence &&
        !lastSentence.trim().match(/[.!?]$/) &&
        questionPatterns.some((pattern) => pattern.test(lastSentence))
      ) {
        // Replace the last sentence with one that ends with a question mark
        sentences[sentences.length - 1] = lastSentence.trim() + "?"
        return sentences.join(" ")
      }
    }

    return text
  }

  private addLineBreaks(text: string): string {
    // Add line breaks after sentences for better readability
    // But avoid adding too many line breaks
    return text.replace(/([.!?])\s+/g, "$1\n")
  }

  private async requestWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen")
      } catch (err) {
        console.warn("Wake Lock error:", err)
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null
      })
    }
  }

  private initializeSpeechRecognition() {
    // Clean up any existing recognition instance
    if (this.recognition) {
      try {
        this.recognition.onresult = null
        this.recognition.onerror = null
        this.recognition.onend = null
        this.recognition.abort()
      } catch (error) {
        console.warn("Error cleaning up previous recognition:", error)
      }
      this.recognition = null
    }

    // Initialize a new speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.options.language || "en-US"

    this.recognition.onresult = (event: any) => {
      let newInterimTranscript = ""
      let newFinalTranscript = this.finalTranscript

      for (let i = this.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript + " "
          this.resultIndex = i + 1
        } else {
          newInterimTranscript += transcript
        }
      }

      // Update the last speech timestamp
      this.lastSpeechTimestamp = Date.now()

      this.updateTranscript(newFinalTranscript, newInterimTranscript)
    }

    this.recognition.onerror = (event: any) => {
      this.handleError(new Error(`Speech recognition error: ${event.error}`))
    }

    this.recognition.onend = () => {
      // Only restart if we're still in recording state and not paused
      if (this.recordingState === "recording") {
        try {
          this.recognition?.start()
        } catch (error) {
          this.handleError(error as Error)
        }
      }
    }

    return this.recognition
  }

  public async startRecording() {
    if (this.recordingState === "recording") return

    try {
      // Reset transcript state when starting a new recording
      if (this.recordingState === "inactive") {
        this.finalTranscript = ""
        this.interimTranscript = ""
        this.transcript = ""
        this.resultIndex = 0
        this.lastProcessedLength = 0
        this.lastSpeechTimestamp = Date.now()
        this.pendingPunctuation = false
      }

      // Initialize speech recognition
      const recognition = this.initializeSpeechRecognition()
      if (recognition) recognition.start()

      // Initialize audio recording
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      this.mediaRecorder = new MediaRecorder(this.stream)

      if (this.recordingState === "inactive") {
        this.audioChunks = []
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      // Start recording
      this.mediaRecorder.start(1000)
      this.updateState("recording")
      this.requestWakeLock()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  public pauseRecording() {
    if (this.recordingState !== "recording") return

    try {
      if (this.recognition) {
        this.recognition.stop()
      }

      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        this.mediaRecorder.pause()
      }

      // When pausing, convert any interim results to final
      if (this.interimTranscript) {
        this.finalTranscript += this.interimTranscript + " "
        this.interimTranscript = ""

        // Process the transcript with automatic punctuation
        if (this.sentenceDetectionEnabled) {
          this.transcript = this.formatTranscript(this.finalTranscript)
        } else {
          this.transcript = this.finalTranscript
        }

        // Apply grammar correction if enabled
        if (this.grammarCorrectionEnabled) {
          this.transcript = correctTranscriptGrammar(this.transcript)
        }

        if (this.options.onTranscriptUpdate) {
          this.options.onTranscriptUpdate(this.transcript)
        }
      }

      this.updateState("paused")
      this.releaseWakeLock()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  public resumeRecording() {
    if (this.recordingState !== "paused") return

    try {
      // When resuming, we need to reinitialize the recognition
      // to avoid duplication issues
      const recognition = this.initializeSpeechRecognition()
      if (recognition) recognition.start()

      if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
        this.mediaRecorder.resume()
      }

      this.updateState("recording")
      this.requestWakeLock()
      this.lastSpeechTimestamp = Date.now()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  public async stopRecording(): Promise<{ id: string; audioUrl?: string }> {
    if (this.recordingState === "inactive") return { id: "" }

    return new Promise((resolve) => {
      try {
        if (this.recognition) {
          try {
            this.recognition.stop()
            this.recognition.abort()
          } catch (e) {
            console.warn("Error stopping recognition:", e)
          }
        }

        // When stopping, convert any interim results to final
        if (this.interimTranscript) {
          this.finalTranscript += this.interimTranscript
          this.interimTranscript = ""

          // Process the final transcript with automatic punctuation
          if (this.sentenceDetectionEnabled) {
            this.transcript = this.formatTranscript(this.finalTranscript)
          } else {
            this.transcript = this.finalTranscript
          }

          // Apply grammar correction if enabled
          if (this.grammarCorrectionEnabled) {
            this.transcript = correctTranscriptGrammar(this.transcript)
          }
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.onstop = async () => {
            let audioUrl: string | undefined = undefined

            if (this.audioChunks.length > 0) {
              const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })
              audioUrl = URL.createObjectURL(audioBlob)
            }

            // Generate a title from the transcript
            const title = this.generateTitle(this.transcript)

            // Generate tags from the transcript using our enhanced auto-tagging
            const tags = await getTags(this.transcript)

            // Create a new note
            const noteId = uuidv4()
            const note = {
              id: noteId,
              title,
              content: this.transcript,
              audioUrl,
              tags,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isSynced: false,
            }

            // Save the note to IndexedDB
            await saveNote(note)

            // Reset state
            this.finalTranscript = ""
            this.interimTranscript = ""
            this.transcript = ""
            this.resultIndex = 0
            this.lastProcessedLength = 0
            this.audioChunks = []
            this.updateState("inactive")
            this.releaseWakeLock()

            // Close media stream
            if (this.stream) {
              this.stream.getTracks().forEach((track) => track.stop())
              this.stream = null
            }

            resolve({ id: noteId, audioUrl })
          }

          this.mediaRecorder.stop()
        } else {
          this.updateState("inactive")
          this.releaseWakeLock()
          resolve({ id: "" })
        }
      } catch (error) {
        this.handleError(error as Error)
        this.updateState("inactive")
        this.releaseWakeLock()
        resolve({ id: "" })
      }
    })
  }

  public cancelRecording() {
    try {
      if (this.recognition) {
        try {
          this.recognition.stop()
          this.recognition.abort()
        } catch (e) {
          console.warn("Error stopping recognition:", e)
        }
        this.recognition = null
      }

      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop()
      }

      // Reset state
      this.finalTranscript = ""
      this.interimTranscript = ""
      this.transcript = ""
      this.resultIndex = 0
      this.lastProcessedLength = 0
      this.audioChunks = []
      this.updateState("inactive")
      this.releaseWakeLock()

      // Close media stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop())
        this.stream = null
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  public getState(): RecordingState {
    return this.recordingState
  }

  public getTranscript(): string {
    return this.transcript
  }

  public async switchTranscriptionMode(mode: TranscriptionMode): Promise<void> {
    // Always throw an error if trying to switch to transformers mode
    if (mode === "transformers") {
      throw new Error("Whisper AI transcription is currently unavailable in this environment")
    }

    // Only web-speech mode is supported
    this.transcriptionMode = "web-speech"
  }

  public getTranscriptionMode(): TranscriptionMode {
    return "web-speech" // Always return web-speech
  }

  public toggleSentenceDetection(enabled: boolean): void {
    this.sentenceDetectionEnabled = enabled

    // If we're toggling it on and we have existing transcript, reformat it
    if (enabled && this.transcript) {
      this.transcript = this.formatTranscript(this.transcript)
      if (this.options.onTranscriptUpdate) {
        this.options.onTranscriptUpdate(this.transcript)
      }
    }
  }

  public setSentenceDetectionEnabled(enabled: boolean): void {
    this.toggleSentenceDetection(enabled)
  }

  public isSentenceDetectionEnabled(): boolean {
    return this.sentenceDetectionEnabled
  }

  public setGrammarCorrectionEnabled(enabled: boolean): void {
    this.grammarCorrectionEnabled = enabled

    // If we're toggling it on and we have existing transcript, apply grammar correction
    if (enabled && this.transcript) {
      this.transcript = correctTranscriptGrammar(this.transcript)
      if (this.options.onTranscriptUpdate) {
        this.options.onTranscriptUpdate(this.transcript)
      }
    }
  }

  public isGrammarCorrectionEnabled(): boolean {
    return this.grammarCorrectionEnabled
  }

  private generateTitle(text: string): string {
    if (!text) return "New Note"

    // Get the first line or first 40 characters
    const firstLine = text.split("\n")[0].trim()
    if (firstLine.length <= 40) return firstLine

    return firstLine.substring(0, 40) + "..."
  }
}
