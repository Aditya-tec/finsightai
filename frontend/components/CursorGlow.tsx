"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const setPos = (x: number, y: number) => {
      targetRef.current = { x, y };
      if (!visibleRef.current) {
        posRef.current = { x, y };
        visibleRef.current = true;
        glowRef.current?.classList.add("is-visible");
      }
    };

    const onMove = (e: MouseEvent) => setPos(e.clientX, e.clientY);

    const onLeave = () => {
      visibleRef.current = false;
      glowRef.current?.classList.remove("is-visible");
    };

    const tick = () => {
      const glow = glowRef.current;
      if (glow) {
        const ease = 0.18;
        posRef.current.x += (targetRef.current.x - posRef.current.x) * ease;
        posRef.current.y += (targetRef.current.y - posRef.current.y) * ease;
        const { x, y } = posRef.current;
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <div ref={glowRef} className="cursor-glow" aria-hidden />;
}
