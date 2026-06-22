"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Props = {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  active?: boolean;
  onComplete?: () => void;
  hideCursorOnComplete?: boolean;
};

export default function TypewriterText({
  text,
  className,
  speed = 36,
  startDelay = 0,
  active = true,
  onComplete,
  hideCursorOnComplete = true,
}: Props) {
  const reduced = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  const [displayed, setDisplayed] = useState(reduced ? text : "");
  const [done, setDone] = useState(!!reduced);
  const [started, setStarted] = useState(!!reduced);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reduced) {
      setDisplayed(text);
      setDone(true);
      setStarted(true);
      onCompleteRef.current?.();
      return;
    }

    if (!active) {
      setDisplayed("");
      setDone(false);
      setStarted(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let index = 0;

    setDisplayed("");
    setDone(false);
    setStarted(false);

    timeoutId = setTimeout(() => {
      setStarted(true);
      intervalId = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(intervalId);
          setDone(true);
          onCompleteRef.current?.();
        }
      }, speed);
    }, startDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, text, speed, startDelay, reduced]);

  const showCursor = started && (!done || !hideCursorOnComplete);

  return (
    <span className={className}>
      {displayed}
      {showCursor ? <span className="typewriter-cursor" aria-hidden /> : null}
    </span>
  );
}
