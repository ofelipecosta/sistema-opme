-- ============================================================
-- OPME NOS — Schema Supabase
-- Execute no SQL Editor do Supabase: Database > SQL Editor
-- ============================================================

-- 1. Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome         TEXT        NOT NULL,
  email        TEXT        NOT NULL DEFAULT '',
  telefone     TEXT        NOT NULL DEFAULT '',
  cargo        TEXT        NOT NULL DEFAULT '',
  empresa      TEXT        NOT NULL DEFAULT '',
  login        TEXT        NOT NULL UNIQUE,
  senha        TEXT        NOT NULL DEFAULT '',
  perfil       TEXT        NOT NULL DEFAULT 'vendedor',
  status       TEXT        NOT NULL DEFAULT 'ativo',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. REQUISICOES
CREATE TABLE IF NOT EXISTS public.requisicoes (
  id                        UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero                    TEXT        NOT NULL UNIQUE,
  tipo_cirurgia             TEXT        NOT NULL DEFAULT 'eletiva',
  status                    TEXT        NOT NULL DEFAULT 'rascunho',
  data_solicitacao          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solicitante_id            UUID        REFERENCES public.usuarios(id),
  solicitante_nome          TEXT        NOT NULL DEFAULT '',
  vendedor_nome             TEXT        NOT NULL DEFAULT '',
  vendedor_telefone         TEXT        NOT NULL DEFAULT '',
  vendedor_email            TEXT        NOT NULL DEFAULT '',
  hospital_nome             TEXT        NOT NULL DEFAULT '',
  hospital_cidade           TEXT        NOT NULL DEFAULT '',
  hospital_estado           TEXT        NOT NULL DEFAULT '',
  hospital_setor            TEXT        NOT NULL DEFAULT '',
  hospital_centro_cirurgico TEXT        NOT NULL DEFAULT '',
  hospital_contato          TEXT        NOT NULL DEFAULT '',
  medico_nome               TEXT        NOT NULL DEFAULT '',
  medico_especialidade      TEXT        NOT NULL DEFAULT '',
  medico_crm                TEXT        NOT NULL DEFAULT '',
  paciente_nome             TEXT        NOT NULL DEFAULT '',
  paciente_data_nascimento  TEXT        NOT NULL DEFAULT '',
  paciente_prontuario       TEXT        NOT NULL DEFAULT '',
  paciente_sexo             TEXT        NOT NULL DEFAULT '',
  instrumentador_nome       TEXT        NOT NULL DEFAULT '',
  instrumentador_telefone   TEXT        NOT NULL DEFAULT '',
  instrumentador_empresa    TEXT        NOT NULL DEFAULT '',
  cirurgia_data             TEXT        NOT NULL DEFAULT '',
  cirurgia_horario          TEXT        NOT NULL DEFAULT '',
  cirurgia_procedimento     TEXT        NOT NULL DEFAULT '',
  cirurgia_convenio         TEXT        NOT NULL DEFAULT '',
  cirurgia_cod_tuss         TEXT        NOT NULL DEFAULT '',
  cirurgia_sala             TEXT        NOT NULL DEFAULT '',
  materiais                 JSONB       NOT NULL DEFAULT '[]',
  observacoes_gerais        TEXT        NOT NULL DEFAULT '',
  anexos                    JSONB       NOT NULL DEFAULT '[]',
  auditoria                 JSONB       NOT NULL DEFAULT '[]',
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AGENDA
CREATE TABLE IF NOT EXISTS public.agenda (
  id              TEXT        PRIMARY KEY,
  codigo          TEXT,
  data            TEXT        NOT NULL DEFAULT '',
  hora_cirurgia   TEXT        NOT NULL DEFAULT '',
  paciente        TEXT        NOT NULL DEFAULT '',
  hospital        TEXT        NOT NULL DEFAULT '',
  convenio        TEXT        NOT NULL DEFAULT '',
  medico          TEXT        NOT NULL DEFAULT '',
  cliente         TEXT,
  procedimento    TEXT        NOT NULL DEFAULT '',
  instrumentadores TEXT,
  vendedor        TEXT        NOT NULL DEFAULT '',
  autorizada      BOOLEAN     NOT NULL DEFAULT FALSE,
  emergencia      BOOLEAN     NOT NULL DEFAULT FALSE,
  status          TEXT        NOT NULL DEFAULT 'agendada',
  importado_em    TIMESTAMPTZ,
  importado_por   TEXT        NOT NULL DEFAULT '',
  origem          TEXT        NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SEPARACOES
CREATE TABLE IF NOT EXISTS public.separacoes (
  id               TEXT        PRIMARY KEY,
  req_id           UUID        REFERENCES public.requisicoes(id),
  req_numero       TEXT        NOT NULL DEFAULT '',
  separado_por_id  UUID,
  separado_por_nome TEXT       NOT NULL DEFAULT '',
  separado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  via              INTEGER     NOT NULL DEFAULT 1,
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Desabilitar RLS (sistema interno)
ALTER TABLE public.usuarios    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacoes  DISABLE ROW LEVEL SECURITY;

-- 7. Garantir acesso ao anon key
GRANT ALL ON public.usuarios    TO anon, authenticated;
GRANT ALL ON public.requisicoes TO anon, authenticated;
GRANT ALL ON public.agenda      TO anon, authenticated;
GRANT ALL ON public.separacoes  TO anon, authenticated;

-- 8. Usuários padrão
INSERT INTO public.usuarios (nome, email, telefone, cargo, empresa, login, senha, perfil, status)
VALUES
  ('Administrador Sistema',    'admin@nos.com.br',        '(11) 99999-0000', 'Administrador', 'NOS', 'admin',        'admin123', 'admin',        'ativo'),
  ('João Vendedor Silva',      'joao.silva@nos.com.br',   '(11) 98888-1111', 'Vendedor',      'NOS', 'joao.silva',   '123456',   'vendedor',     'ativo'),
  ('Maria Operacional Santos', 'maria.santos@nos.com.br', '(11) 97777-2222', 'Operacional',   'NOS', 'maria.santos', '123456',   'operacional',  'ativo')
ON CONFLICT (login) DO NOTHING;
