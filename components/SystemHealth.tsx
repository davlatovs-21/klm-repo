"use client";

import { useEffect, useState } from "react";

type Health = {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
};

export default function SystemHealth() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (
          typeof data === "object" &&
          data !== null &&
          "status" in data &&
          "database" in data
        ) {
          setHealth(data as Health);
          return;
        }
        setHealth({ status: "degraded", database: "disconnected" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth({ status: "degraded", database: "disconnected" });
      });

    return () => controller.abort();
  }, []);

  const databaseConnected = health?.database === "connected";
  const databaseLabel = health === null ? "Проверка…" : databaseConnected ? "Подключена" : "Недоступна";

  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
      <StatusRow label="Приложение" value="Онлайн" ok />
      <StatusRow label="База данных" value={databaseLabel} ok={databaseConnected} pending={health === null} />
    </div>
  );
}

function StatusRow({ label, value, ok, pending = false }: { label: string; value: string; ok: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-line bg-bg px-4 py-3.5">
      <span className="text-[13px] font-semibold text-mute">{label}</span>
      <span className={`flex items-center gap-2 text-[13px] font-bold ${pending ? "text-mute" : ok ? "text-cur-d" : "text-fault"}`}>
        <span className={`h-2 w-2 rounded-full ${pending ? "animate-pulse bg-line-2" : ok ? "bg-cur" : "bg-fault"}`} />
        {value}
      </span>
    </div>
  );
}
