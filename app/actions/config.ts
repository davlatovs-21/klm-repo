"use server";

import { saveRouteVersion, listRouteVersions, getRouteVersion, type SavedVersion } from "@/lib/dal/route";
import type { Route } from "@/lib/core/route";

/**
 * Сохранение трассы. Файл называется config, а не route: в app/ имя route.ts
 * зарезервировано под обработчик маршрута, и Next принял бы эти действия за него.
 *
 * Server Action, а не маршрут API: выполняется только
 * на сервере и даёт защиту от CSRF (ТЗ 12.3.1). Проверка владения —
 * в слое доступа, здесь только передача.
 */

export type SaveResult =
  | { ok: true; version: SavedVersion }
  | { ok: false; error: string };

export async function saveRoute(configurationId: string, route: Route, comment?: string): Promise<SaveResult> {
  try {
    return { ok: true, version: await saveRouteVersion(configurationId, route, comment) };
  } catch (e) {
    // текст ошибки доступа безопасно показать: он не раскрывает чужих данных
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }
}

export async function fetchVersions(configurationId: string): Promise<SavedVersion[]> {
  return listRouteVersions(configurationId);
}

export async function restoreVersion(configurationId: string, versionId: string): Promise<Route | null> {
  return getRouteVersion(configurationId, versionId);
}
