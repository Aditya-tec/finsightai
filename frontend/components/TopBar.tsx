"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  action?: React.ReactNode;
};

export default function TopBar({ action }: Props) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${base}/health`)
      .then((r) => r.ok && setOnline(true))
      .catch(() => setOnline(false));
  }, []);

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
