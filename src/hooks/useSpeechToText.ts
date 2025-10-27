import { useCallback, useRef, useState } from "react";

type SpeechResultHandler = (text: string) => void;

interface Options {
  lang?: string;
  onResult?: SpeechResultHandler;
}

export function useSpeechToText({ lang = "es-ES", onResult }: Options = {}) {
  const recognitionRef = useRef<any | null>(null);
  const [isListening, setIsListening] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return false;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onResult?.(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    return true;
  }, [isSupported, lang, onResult]);

  return {
    isSupported: Boolean(isSupported),
    isListening,
    startListening,
    stopListening,
  };
}
