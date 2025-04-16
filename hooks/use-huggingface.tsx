import { useState, useEffect, useCallback, useRef } from 'react';
import { pipeline, env, Pipeline, PipelineType } from '@xenova/transformers';

env.allowLocalModels = false;

interface UseHuggingFaceProps {
  model: string;
  task: PipelineType;
  quantized?: boolean;
  progress_callback?: (progress: number) => void;
}

interface UseHuggingFaceReturn {
  pipeline: Pipeline | null;
  loading: boolean;
  error: Error | null;
  infer: (inputs: any, options?: any) => Promise<any>;
  isReady: boolean;
}

export function useHuggingFace({
  model,
  task,
  quantized = false,
  progress_callback,
}: UseHuggingFaceProps): UseHuggingFaceReturn {
  const pipelineRef = useRef<Pipeline | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Initialize the pipeline
  useEffect(() => {
    let isMounted = true;

    const loadPipeline = async () => {
      try {
        if (!model || !task) return;

        setLoading(true);
        setError(null);
        setIsReady(false);

        const progress = progress_callback 
          ? (data: { status: string; progress: number }) => {
              if (data.status === 'progress') {
                progress_callback(data.progress * 100);
              }
            }
          : undefined;

        const instance = await pipeline(task, model, {
          quantized,
          progress_callback: progress,
        });

        if (isMounted) {
          pipelineRef.current = instance as Pipeline;
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load model'));
          setIsReady(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPipeline();

    return () => {
      isMounted = false;
      // Cleanup pipeline instance if it exists
      if (pipelineRef.current && typeof pipelineRef.current.dispose === 'function') {
        pipelineRef.current.dispose();
      }
      pipelineRef.current = null;
    };
  }, [model, task, quantized, progress_callback]);

  // Inference function
  const infer = useCallback(
    async (inputs: any, options?: any): Promise<any> => {
      if (!isReady || !pipelineRef.current) {
        throw new Error('Pipeline not initialized or ready');
      }

      try {
        setLoading(true);
        const result = await pipelineRef.current(inputs, options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Inference failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [isReady]
  );

  return {
    pipeline: pipelineRef.current,
    loading,
    error,
    infer,
    isReady,
  };
}