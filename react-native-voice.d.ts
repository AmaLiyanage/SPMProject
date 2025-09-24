// react-native-voice.d.ts
declare module '@react-native-voice/voice' {
  interface SpeechResultsEvent { value: string[]; }
  interface SpeechErrorEvent { error: string; message?: string; }

  const Voice: {
    onSpeechResults: ((e: SpeechResultsEvent) => void) | null;
    onSpeechPartialResults: ((e: SpeechResultsEvent) => void) | null;
    onSpeechError: ((e: SpeechErrorEvent) => void) | null;
    start(locale?: string): Promise<void>;
    stop(): Promise<void>;
    destroy(): Promise<void>;
    removeAllListeners(): void;
  };

  export default Voice;
}
