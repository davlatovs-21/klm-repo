-- Второй рубеж защиты данных: RLS в Postgres и журнал аудита только на добавление.
-- Разделы 10.2.1 и 14.3.1 ТЗ. Первый рубеж — слой доступа lib/dal.
--
-- Роль приложения создаётся при развёртывании; здесь описано, что ей можно.
-- Владелец схемы (миграции, сид) под RLS не попадает — это ожидаемо и нужно.

-- Роль приложения. IF NOT EXISTS для ролей в Postgres нет, поэтому через DO.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'klm_app') THEN
    CREATE ROLE klm_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO klm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO klm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO klm_app;

-- Журналы: только на добавление. Приложение физически не может переписать историю.
REVOKE UPDATE, DELETE ON audit_log FROM klm_app;
REVOKE UPDATE, DELETE ON calc_log FROM klm_app;

-- Изоляция по тенанту. Значение выставляет слой доступа на соединение:
--   SELECT set_config('app.tenant_id', '<uuid>', true);
-- Без него запросы не увидят ни одной строки — отказ в безопасную сторону.
-- nullif обязателен: current_setting для невыставленного параметра возвращает
-- пустую строку, а её приведение к uuid падает с ошибкой вместо пустого результата.
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON organizations;
CREATE POLICY tenant_isolation ON organizations
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON projects;
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- В журналах tenant_id может быть пустым (анонимный расчёт из публичного
-- калькулятора), такие строки видны в пределах своего тенанта и при отсутствии метки.
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id IS NULL OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON calc_log;
CREATE POLICY tenant_isolation ON calc_log
  USING (tenant_id IS NULL OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
