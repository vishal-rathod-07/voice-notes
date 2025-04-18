'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MicIcon,
  PauseIcon,
  MonitorStopIcon as StopIcon,
  XIcon,
  WifiOffIcon,
} from 'lucide-react';
import { VoiceService } from '@/lib/voice-service';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TagGenerator } from '@/components/notes/tag-generator';
import { toast } from '@/components/ui/use-toast';
import { getSettings } from '@/lib/db';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHuggingFace } from '@/hooks/use-huggingface';

export function RecordButton() {
  const [recordingState, setRecordingState] = useState<
    'inactive' | 'recording' | 'paused'
  >('inactive');
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [useWhisperAI, setUseWhisperAI] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [networkError, setNetworkError] = useState(false);
  const [preferredMicrophone, setPreferredMicrophone] = useState<string>('');
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [showMicHelp, setShowMicHelp] = useState(false);
  const router = useRouter();

  // Initialize Hugging Face
  const {
    infer,
    loading: hfLoading,
    error: hfError,
    isReady: hfReady,
  } = useHuggingFace({
    model: 'Xenova/whisper-tiny.en',
    task: 'automatic-speech-recognition',
  });

  // Function to scroll to the bottom of the transcript container
  const scrollToBottom = () => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop =
        transcriptContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Load settings and initialize voice service
    const initVoiceService = async () => {
      try {
        const settings = await getSettings();
        const autoPunctuation =
          settings?.autoPunctuation !== undefined
            ? settings.autoPunctuation
            : true;
        const grammarCorrection =
          settings?.grammarCorrection !== undefined
            ? settings.grammarCorrection
            : true;
        const whisperAiEnabled = settings?.whisperAiTranscription === true;
        const microphoneId = settings?.preferredMicrophone || '';

        setUseWhisperAI(whisperAiEnabled);
        setPreferredMicrophone(microphoneId);

        // Initialize voice service
        voiceServiceRef.current = new VoiceService({
          onTranscriptUpdate: (text) => {
            console.log('Transcript updated in UI:', text);
            setTranscript(text);
            // We need to use setTimeout to ensure the DOM has updated before scrolling
            setTimeout(scrollToBottom, 10);
          },
          onStateChange: (state) => {
            setRecordingState(state);
            if (state === 'inactive') {
              setNetworkError(false);
            }
          },
          onError: (error) => {
            console.error('Voice service error:', error);

            if (error.message.includes('No speech detected')) {
              setShowMicHelp(true);
              setTimeout(() => setShowMicHelp(false), 5000);
            }

            // Check if it's a network error
            if (error.message.includes('network')) {
              setNetworkError(true);
            }

            setError(error.message);
            toast({
              title: 'Transcription Error',
              description: error.message,
              variant: 'destructive',
            });
          },
          transcriptionMode: whisperAiEnabled ? 'transformers' : 'web-speech',
          language: settings?.language || 'en-US',
          preferredMicrophone: microphoneId,
        });

        // Set auto-punctuation and grammar correction based on settings
        if (voiceServiceRef.current) {
          voiceServiceRef.current.setSentenceDetectionEnabled(autoPunctuation);
          voiceServiceRef.current.setGrammarCorrectionEnabled(
            grammarCorrection,
          );
        }
      } catch (error) {
        console.error('Error initializing voice service:', error);
      }
    };

    initVoiceService();

    return () => {
      // Clean up
      if (voiceServiceRef.current) {
        voiceServiceRef.current.cancelRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Also scroll to bottom when transcript changes
  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  useEffect(() => {
    // Handle recording timer
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingState]);

  const handleRecordPress = async () => {
    if (!voiceServiceRef.current) return;

    try {
      setError(null);
      setNetworkError(false);
      setShowMicHelp(false);

      // First test microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        throw new Error(
          'Microphone access denied. Please allow microphone permissions.',
        );
      }

      if (recordingState === 'inactive') {
        setRecordingTime(0);
        setAudioChunks([]);

        // Start recording with the voice service
        await voiceServiceRef.current.startRecording();

        // If using Whisper AI, also set up a separate media recorder to collect audio
        if (useWhisperAI) {
          try {
            // Use the preferred microphone if specified
            const constraints: MediaStreamConstraints = {
              audio: preferredMicrophone
                ? { deviceId: { exact: preferredMicrophone } }
                : true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(
              constraints,
            );
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                setAudioChunks((prev) => [...prev, event.data]);
              }
            };

            mediaRecorder.start(1000); // Collect data every second
          } catch (err) {
            console.error('Error setting up media recorder for Whisper:', err);

            // Fall back to default microphone
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;

              mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  setAudioChunks((prev) => [...prev, event.data]);
                }
              };

              mediaRecorder.start(1000);
            } catch (fallbackErr) {
              console.error(
                'Error setting up fallback media recorder:',
                fallbackErr,
              );
            }
          }
        }
      } else if (recordingState === 'recording') {
        voiceServiceRef.current.pauseRecording();
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.pause();
        }
      } else if (recordingState === 'paused') {
        voiceServiceRef.current.resumeRecording();
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'paused'
        ) {
          mediaRecorderRef.current.resume();
        }
      }
    } catch (error) {
      console.error('Error handling record press:', error);
      setError((error as Error).message);
      toast({
        title: 'Recording Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const transcribeWithWhisper = async (audioBlob: Blob): Promise<string> => {
    if (!hfReady || !infer) {
      throw new Error('Whisper model not ready');
    }

    try {
      // In a real implementation, this would use the actual Hugging Face model
      // For now, we'll just return a mock transcription
      console.log('Transcribing with Whisper AI...', audioBlob.size, 'bytes');

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return 'This is a simulated transcription from the Whisper AI model.';
    } catch (error) {
      console.error('Error transcribing with Whisper:', error);
      throw error;
    }
  };

  const handleStopRecording = async () => {
    if (!voiceServiceRef.current) return;

    try {
      // If we have a no-speech error but some transcript, proceed anyway
      if (error?.includes('No speech detected') && transcript.length > 0) {
        setError(null);
      }

      let whisperTranscript = '';

      // If using Whisper AI, process the collected audio
      if (useWhisperAI && audioChunks.length > 0) {
        try {
          // Stop the media recorder first
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
          ) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream
              .getTracks()
              .forEach((track) => track.stop());
          }

          // Combine all audio chunks and transcribe
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          whisperTranscript = await transcribeWithWhisper(audioBlob);

          // Update the transcript with Whisper results
          setTranscript(whisperTranscript);

          // Also update the voice service's transcript
          if (voiceServiceRef.current) {
            // This is a hack to update the internal transcript
            voiceServiceRef.current.updateTranscript(whisperTranscript, '');
          }
        } catch (err) {
          console.error('Error processing with Whisper:', err);
          // Fall back to whatever transcript we have from Web Speech API
        }
      }

      const result = await voiceServiceRef.current.stopRecording();
      if (result.id) {
        setTranscript('');
        setRecordingTime(0);
        setNetworkError(false);
        router.push(`/note/${result.id}`);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError((error as Error).message);
      toast({
        title: 'Error Saving Note',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelRecording = () => {
    if (!voiceServiceRef.current) return;

    try {
      voiceServiceRef.current.cancelRecording();

      // Also stop the Whisper media recorder if it exists
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      setTranscript('');
      setRecordingTime(0);
      setError(null);
      setNetworkError(false);
      setAudioChunks([]);
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Floating recording panel when active */}
      {recordingState !== 'inactive' && (
        <div className="fixed inset-x-0 bottom-20 mx-auto w-11/12 max-w-md bg-card rounded-lg shadow-lg border p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {networkError ? (
                <>
                  <WifiOffIcon className="w-4 h-4 text-amber-500 mr-2" />
                  <span className="text-sm font-medium text-amber-500">
                    Network Issue - {formatTime(recordingTime)}
                  </span>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full mr-2',
                      recordingState === 'recording'
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-amber-500',
                    )}
                  />
                  <span className="text-sm font-medium">
                    {recordingState === 'recording' ? 'Recording' : 'Paused'} -{' '}
                    {formatTime(recordingTime)}
                  </span>
                </>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCancelRecording}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cancel recording"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel recording</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div
            ref={transcriptContainerRef}
            className="bg-muted rounded-md p-3 mb-3 h-24 overflow-y-auto"
          >
            <p className="text-sm whitespace-pre-wrap">
              {transcript || 'Speak now...'}
            </p>
          </div>

          {/* Show tag suggestions */}
          {transcript.length > 10 && <TagGenerator text={transcript} />}

          {/* Show transcription mode */}
          <div className="text-xs text-muted-foreground mt-2 mb-2">
            Using {useWhisperAI ? 'Whisper AI' : 'Web Speech API'}
            {useWhisperAI && hfLoading && ' (loading model...)'}
            {preferredMicrophone && ' with custom microphone'}
          </div>

          {/* Show error if any */}
          {error && (
            <div className="text-xs text-destructive mt-1 mb-2">{error}</div>
          )}

          <div className="flex justify-center space-x-4 mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRecordPress}
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full',
                    recordingState === 'recording'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
                      : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
                  )}
                  aria-label={
                    recordingState === 'recording'
                      ? 'Pause recording'
                      : 'Resume recording'
                  }
                >
                  {recordingState === 'recording' ? (
                    <PauseIcon className="w-6 h-6" />
                  ) : (
                    <MicIcon className="w-6 h-6" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {recordingState === 'recording'
                    ? 'Pause recording'
                    : 'Resume recording'}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                  aria-label="Stop recording"
                >
                  <StopIcon className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save note</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Main record button */}
      {recordingState === 'inactive' && (
        <>
          <div className="fixed bottom-20 right-0 left-0 flex justify-center z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRecordPress}
                  className="flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Start recording"
                >
                  <MicIcon className="w-8 h-8" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start recording</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Show error if any */}
          {error && (
            <div className="fixed bottom-14 right-0 left-0 flex justify-center z-10">
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-1 text-xs">
                {error}
              </div>
            </div>
          )}
        </>
      )}

      {showMicHelp && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-20 animate-bounce">
          <div className="bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-4 py-2 rounded-lg shadow-lg flex items-center">
            <MicIcon className="w-4 h-4 mr-2" />
            <span>Speak now or check microphone</span>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
