"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getHealthUrl } from "@/lib/apiConfig";

type Props = {
  action?: React.ReactNode;
};

const HEALTH_INTERVAL_MS = 60_000;

export default function TopBar({ action }: Props) {
  const [online, setOnline] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(getHealthUrl());
      setOnline(res.ok);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = window.setInterval(checkHealth, HEALTH_INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkHealth();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkHealth]);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Link href="/" className="topbar-logo">
          <Image
            src="/rupeeread-logo.png"
            alt=""
            width={22}
            height={25}
            className="topbar-logo-mark"
            priority
          />
          <span className="topbar-logo-text">RupeeRead</span>
        </Link>
      </div>
      <div className="topbar-right">
        <div className="status-pill">
          <span className={`status-dot ${online ? "online" : "offline"}`} />
          <span className={`status-label ${online ? "online-text" : "offline-text"}`}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
        {action}
      </div>
    </header>
  );
}
