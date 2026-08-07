import type { Metadata } from "next";
import Link from "next/link";
import { listProjects, requireSession, rolesOf } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { Section } from "@/components/ui";

export const metadata: Metadata = { title: "Кабинет · КЛМ", robots: { index: false, follow: false } };

const STATUS_RU: Record<string, string> = {
  lead: "Заявка", qualified: "Квалифицирован", calculating: "Расчёт", quoted: "КП выпущено",
  negotiation: "Переговоры", won: "Выиграно", lost: "Проиграно",
  in_production: "В производстве", shipped: "Отгружено", closed: "Закрыто",
};

const SOURCE_RU: Record<string, string> = {
  calc: "калькулятор", widget: "виджет", manual: "вручную", api: "API",
};

export default async function AppPage() {
  // страница защищена дважды: Proxy отсекает по куке, слой доступа — по базе
  const session = await requireSession();
  const projects = await listProjects();

  return (
    <main>
      <Section>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cur-d">Кабинет</p>
            <h1 className="display mt-2 text-[clamp(22px,4vw,32px)]">{session.name}</h1>
            <p className="mt-1 text-[13px] text-mute">
              {session.email} ·{" "}
              {session.memberships.length > 0
                ? session.memberships.map((m) => `${m.organizationName} (${m.role})`).join(", ")
                : "без организации"}
            </p>
          </div>
          <form action={logout}>
            <button className="rounded-full border-[1.5px] border-line-2 px-4 py-2 text-[13px] font-bold transition-colors hover:border-ink">
              Выйти
            </button>
          </form>
        </div>

        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="display text-[18px]">Проекты</h2>
            <Link href="/calc" className="text-[13px] font-bold text-cur-d underline decoration-cur/40 underline-offset-4">
              Новый расчёт →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="mt-4 rounded-xl2 border border-dashed border-line-2 p-8 text-center">
              <p className="text-[14px] font-semibold">Проектов пока нет</p>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-mute">
                Заявки из публичного калькулятора попадают сюда автоматически. Ваша роль:{" "}
                {rolesOf(session).join(", ") || "без роли"} — от неё зависит, чьи проекты видны.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl2 border border-line">
              <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="bg-surface text-left text-[11.5px] uppercase tracking-wide text-mute">
                    <th className="px-4 py-2.5 font-semibold">Название</th>
                    <th className="px-4 py-2.5 font-semibold">Заказчик</th>
                    <th className="px-4 py-2.5 font-semibold">Организация</th>
                    <th className="px-4 py-2.5 font-semibold">Статус</th>
                    <th className="px-4 py-2.5 font-semibold">Источник</th>
                    <th className="px-4 py-2.5 font-semibold">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-2.5 font-semibold">{p.name}</td>
                      <td className="px-4 py-2.5 text-mute">{p.customerName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-mute">{p.organizationName}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-cur-soft px-2.5 py-1 text-[11.5px] font-bold text-cur-d">
                          {STATUS_RU[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-mute">{SOURCE_RU[p.source] ?? p.source}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-mute">
                        {p.createdAt.toLocaleDateString("ru-RU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
