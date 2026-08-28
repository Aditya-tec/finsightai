"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, [role="button"], [data-cursor-hover]';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const glow = () => glowRef.current;

    const setPos = (x: number, y: number) => {
      targetRef.current = { x, y };
      if (!visibleRef.current) {
        posRef.current = { x, y };
        visibleRef.current = true;
        glow()?.classList.add("is-visible");
      }
    };

    const onMove = (e: MouseEvent) => {
      setPos(e.clientX, e.clientY);
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      glow()?.classList.toggle("is-hovering", Boolean(hit?.closest(INTERACTIVE_SELECTOR)));
    };

    const onLeave = () => {
      visibleRef.current = false;
      glow()?.classList.remove("is-visible", "is-hovering", "is-clicking");
    };

    const onDown = () => glow()?.classList.add("is-clicking");
    const onUp = () => glow()?.classList.remove("is-clicking");

    const tick = () => {
      const el = glow();
      if (el) {
        const ease = 0.12;
        posRef.current.x += (targetRef.current.x - posRef.current.x) * ease;
        posRef.current.y += (targetRef.current.y - posRef.current.y) * ease;
        const { x, y } = posRef.current;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <div ref={glowRef} className="cursor-glow" aria-hidden />;
}
