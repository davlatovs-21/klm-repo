import { NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/lib/auth/token";

/**
 * Proxy — в Next 16 так называется бывший middleware (файл proxy.ts в корне,
 * рантайм Node.js по умолчанию).
 *
 * Здесь ТОЛЬКО оптимистичная проверка: есть ли кука сессии и сходится ли её подпись.
 * Обращений к базе нет намеренно — Proxy выполняется на каждом маршруте, включая
 * предзагружаемые, и запрос к базе на каждом из них положил бы отклик. Так прямо
 * сказано в документации Next и в разделе 12.3.2 ТЗ.
 *
 * Настоящая авторизация — в слое доступа lib/dal: там проверяется отзыв сессии,
 * срок, активность пользователя и права. Подпись здесь лишь отсекает мусор.
 */

const SESSION_COOKIE = "klm_session";

/** Кабинет и админка требуют сессии */
const PROTECTED = ["/app", "/admin"];
/** Инженерные расчёты доступны из главного меню без входа в кабинет. */
const PUBLIC_APP_PAGES = ["/app/converter", "/app/busbar-converter", "/app/route"];
/** Страницы входа: вошедшего уводим в кабинет */
const AUTH_PAGES = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = verifySignature(req.cookies.get(SESSION_COOKIE)?.value) !== null;
  const publicAppPage = PUBLIC_APP_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !publicAppPage && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", req.nextUrl);
    // куда вернуть после входа
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) return NextResponse.redirect(new URL("/app", req.nextUrl));

  return NextResponse.next();
}

export const config = {
  // статику, картинки и виджет не трогаем
  matcher: ["/((?!_next/static|_next/image|favicon.ico|klm/|widget|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
