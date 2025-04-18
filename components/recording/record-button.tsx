'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MicIcon,
  PauseIcon,
  MonitorStopIcon as StopIcon,
  XIcon,
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
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]); // For storing audio data
  const [useWhisperAI, setUseWhisperAI] = useState(false);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
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

  const scrollToBottom = () => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop =
        transcriptContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
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
        const whisperAiTranscription =
          settings?.whisperAiTranscription !== 'transformers';

        setUseWhisperAI(whisperAiTranscription);

        voiceServiceRef.current = new VoiceService({
          onTranscriptUpdate: (text) => {
            if (!whisperAiTranscription) {
              // Only use web-speech transcript if not using Whisper
              setTranscript(text);
              setTimeout(scrollToBottom, 10);
            }
          },
          onStateChange: (state) => setRecordingState(state),
          onError: (error) => {
            console.error('Voice service error:', error);
            setError(error.message);
            toast({
              title: 'Transcription Error',
              description: error.message,
              variant: 'destructive',
            });
          },
          transcriptionMode: whisperAiTranscription ? undefined : 'web-speech',
          language: settings?.language || 'en-US',
        });

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
      if (voiceServiceRef.current) {
        voiceServiceRef.current.cancelRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hfError) {
      setError(hfError.message);
      toast({
        title: 'Transcription Error',
        description: hfError.message,
        variant: 'destructive',
      });
    }
  }, [hfError]);

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  useEffect(() => {
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
      if (recordingState === 'inactive') {
        setRecordingTime(0);
        setAudioChunks([]); // Reset audio chunks
        await voiceServiceRef.current.startRecording();

        // Initialize media recorder if using Whisper
        if (useWhisperAI) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            setAudioChunks((prev) => [...prev, e.data]);
          };

          mediaRecorder.start(1000); // Collect data every second
        }
      } else if (recordingState === 'recording') {
        voiceServiceRef.current.pauseRecording();
        mediaRecorderRef.current?.pause();
      } else if (recordingState === 'paused') {
        voiceServiceRef.current.resumeRecording();
        mediaRecorderRef.current?.resume();
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

  const transcribeWithWhisper = async (audioBlob: Blob) => {
    if (!hfReady || !infer) {
      throw new Error('Whisper model not ready');
    }

    try {
      const audioFile = new File([audioBlob], 'recording.wav', {
        type: 'audio/wav',
      });
      const result = await infer(audioFile);
      return result.text;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  };

  const handleStopRecording = async () => {
    if (!voiceServiceRef.current) return;

    try {
      if (useWhisperAI && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());

        // Combine all audio chunks
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const whisperTranscript = await transcribeWithWhisper(audioBlob);
        setTranscript(whisperTranscript);
      }

      const result = await voiceServiceRef.current.stopRecording();
      if (result.id) {
        setTranscript('');
        setRecordingTime(0);
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
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
      setTranscript('');
      setRecordingTime(0);
      setError(null);
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
            {useWhisperAI ? 'Using Whisper AI' : 'Using Web Speech API'}
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
    </TooltipProvider>
  );
}
