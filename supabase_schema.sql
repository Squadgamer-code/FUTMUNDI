-- FUTMUNDI Supabase schema
-- Ejecutar en Supabase SQL Editor.
-- Backend Render usará SUPABASE_SERVICE_ROLE_KEY. No expongas esa key en el frontend.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Helpers
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- Usuarios / wallets
-- =========================
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  wallet_raw text UNIQUE,
  username text,
  ref_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_app_users ON public.app_users;
CREATE TRIGGER set_updated_at_app_users
BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Balance de gemas
-- =========================
CREATE TABLE IF NOT EXISTS public.balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.app_users(id) ON DELETE CASCADE,
  gems integer NOT NULL DEFAULT 0 CHECK (gems >= 0),
  locked_gems integer NOT NULL DEFAULT 0 CHECK (locked_gems >= 0),
  total_deposited_usdt numeric(18,6) NOT NULL DEFAULT 0 CHECK (total_deposited_usdt >= 0),
  total_withdrawn_usdt numeric(18,6) NOT NULL DEFAULT 0 CHECK (total_withdrawn_usdt >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_balances ON public.balances;
CREATE TRIGGER set_updated_at_balances
BEFORE UPDATE ON public.balances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Configuración de juego
-- =========================
CREATE TABLE IF NOT EXISTS public.game_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_game_settings ON public.game_settings;
CREATE TRIGGER set_updated_at_game_settings
BEFORE UPDATE ON public.game_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.game_settings(key, value, description) VALUES
  ('gems_per_usdt', '32'::jsonb, 'Conversión: 32 gemas = 1 USDT'),
  ('withdraw_fee_percent', '0.05'::jsonb, 'Comisión de retiro: 5%'),
  ('withdraw_fee_fixed_gems', '32'::jsonb, 'Comisión fija de retiro en gemas'),
  ('withdraw_min_gems', '160'::jsonb, 'Retiro mínimo'),
  ('withdraw_max_gems', '3200'::jsonb, 'Retiro máximo'),
  ('training_pct_nft_usdt', '0.30'::jsonb, 'Entrenamiento: 30% del valor USDT del NFT'),
  ('training_duration_hours', '24'::jsonb, 'Duración de entrenamiento'),
  ('training_gems_percent', '0.50'::jsonb, 'Entrenamiento genera 50% de gemas de juego en 24h'),
  ('training_level_bonus_percent', '0.05'::jsonb, 'Entrenamiento suma +5% nivel'),
  ('free_neymar_days', '15'::jsonb, 'Neymar Free dura 15 días'),
  ('free_neymar_usd_cap', '5'::jsonb, 'Neymar Free se destruye al generar $5'),
  ('max_units_per_item', '20'::jsonb, 'Máximo 20 unidades por NFT/item pagado')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- =========================
-- Catálogo NFT / Market
-- =========================
CREATE TABLE IF NOT EXISTS public.nft_catalog (
  code text PRIMARY KEY,
  item_type text NOT NULL CHECK (item_type IN ('player','uniform','shoes','dt')),
  display_name text NOT NULL,
  price_gems integer NOT NULL DEFAULT 0 CHECK (price_gems >= 0),
  value_usdt numeric(18,6) NOT NULL DEFAULT 0 CHECK (value_usdt >= 0),
  image_path text,
  is_free boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_nft_catalog ON public.nft_catalog;
CREATE TRIGGER set_updated_at_nft_catalog
BEFORE UPDATE ON public.nft_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.nft_catalog(code, item_type, display_name, price_gems, value_usdt, image_path, is_free) VALUES
  ('neymar_free','player','Neymar',0,0,'imagen/Neymar_Free_gemas.png',true),
  ('james_rodriguez','player','James Rodríguez',320,10,'imagen/james_rodriguez_320_gemas.png',false),
  ('alexis_sanchez','player','Alexis Sánchez',640,20,'imagen/Alexis_640_gemas.png',false),
  ('harry_kane','player','Harry Kane',960,30,'imagen/harry_kane_960_gemas.png',false),
  ('pedri','player','Pedri',1280,40,'imagen/Pedri_1280_gemas.jpg',false),
  ('vinicius_jr','player','Vinicius Jr',1600,50,'imagen/Vinicius_Jr_1600_gemas.jpg',false),
  ('rodri','player','Rodri',1920,60,'imagen/Rodri_1920_gemas.png',false),
  ('mbappe','player','Mbappé',2080,65,'imagen/mbappe_2080_gemas.png',false),
  ('haaland','player','Haaland',2240,70,'imagen/Haaland_2240_gemas.jpg',false),
  ('lamine_yamal','player','Lamine Yamal',4000,125,'imagen/lamine_yamal_4000_gemas.png',false),
  ('bellingham','player','Bellingham',5120,160,'imagen/bellingham_5120_gemas.png',false),
  ('lionel_messi','player','Lionel Messi',6400,200,'imagen/Lionel_Messi_6400_gemas.png',false),
  ('cristiano_r','player','Cristiano R.',16000,500,'imagen/Cristiano_R_16000_gemas.png',false),

  ('uniforme_bronce','uniform','Uniforme Bronce',500,15.625,'imagen/uniforme_bronce_1000_fisico_500_gemas.png',false),
  ('uniforme_oro','uniform','Uniforme Oro',1200,37.5,'imagen/uniforme_oro_1500_fisco_1200_gemas.png',false),
  ('uniforme_platinium','uniform','Uniforme Platinium',2000,62.5,'imagen/uniforme_platinium_3000_fisico_2000_gemas.png',false),
  ('uniforme_diamante','uniform','Uniforme Diamante',2500,78.125,'imagen/uniforme_diamante_4000_fisico_2500_gemas.png',false),

  ('zapatillas_1980','shoes','Modelo 1980',300,9.375,'imagen/zapatillas_1980_15%25_300_gemas.png',false),
  ('zapatillas_2000','shoes','Modelo 2000',500,15.625,'imagen/zapatillas_2000_35%25_500_gemas.png',false),
  ('zapatillas_2010','shoes','Modelo 2010',1000,31.25,'imagen/zapatillas_2010_45%25_1000_gemas.png',false),
  ('zapatillas_2020','shoes','Modelo 2020',1500,46.875,'imagen/zapatillas_2020_65%25_1500_gemas.png',false),

  ('dt_portugal','dt','DT Portugal',300,9.375,'imagen/entrenador_portugal_15%25_300_gemas.png',false),
  ('dt_brasil','dt','DT Brasil',300,9.375,'imagen/entrenador_brasil_15%25_300_gemas.png',false),
  ('dt_alemania','dt','DT Alemania',800,25,'imagen/entrenador_alemania_35%25_800_gemas.png',false),
  ('dt_espana','dt','DT España',800,25,'imagen/entrenador_espa%C3%B1a_35%25_800_gemas.png',false),
  ('dt_argentina','dt','DT Argentina',2000,62.5,'imagen/entrenador_argentina_65%25_2000_gemas.png',false)
ON CONFLICT (code) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  display_name = EXCLUDED.display_name,
  price_gems = EXCLUDED.price_gems,
  value_usdt = EXCLUDED.value_usdt,
  image_path = EXCLUDED.image_path,
  is_free = EXCLUDED.is_free,
  active = EXCLUDED.active;

-- =========================
-- Instancias NFT de usuarios
-- =========================
CREATE TABLE IF NOT EXISTS public.nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  catalog_code text REFERENCES public.nft_catalog(code) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('player','uniform','shoes','dt')),
  name text NOT NULL,
  source text NOT NULL DEFAULT 'market' CHECK (source IN ('free','market','reward','tournament','admin_gift')),
  durability numeric(6,2) NOT NULL DEFAULT 100 CHECK (durability >= 0 AND durability <= 100),
  stamina integer NOT NULL DEFAULT 4 CHECK (stamina >= 0),
  max_stamina integer NOT NULL DEFAULT 4 CHECK (max_stamina >= 0),
  level numeric(10,4) NOT NULL DEFAULT 1 CHECK (level >= 0),
  exp integer NOT NULL DEFAULT 0 CHECK (exp >= 0),
  earned_usd numeric(18,6) NOT NULL DEFAULT 0 CHECK (earned_usd >= 0),
  earned_usd_cap numeric(18,6),
  equipped_uniform_id uuid REFERENCES public.nfts(id) ON DELETE SET NULL,
  equipped_shoes_id uuid REFERENCES public.nfts(id) ON DELETE SET NULL,
  equipped_dt_id uuid REFERENCES public.nfts(id) ON DELETE SET NULL,
  training_started_at timestamptz,
  training_ends_at timestamptz,
  expires_at timestamptz,
  destroyed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_nfts ON public.nfts;
CREATE TRIGGER set_updated_at_nfts
BEFORE UPDATE ON public.nfts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON public.nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_type ON public.nfts(item_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_free_neymar_per_user ON public.nfts(user_id)
WHERE source = 'free' AND name = 'Neymar' AND destroyed_at IS NULL;

-- =========================
-- Órdenes de pago USDT Jetton
-- =========================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('deposit','training','tournament')),
  amount_usdt numeric(18,6) NOT NULL CHECK (amount_usdt > 0),
  gems integer NOT NULL DEFAULT 0 CHECK (gems >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','wallet_opened','sent','confirmed','failed','expired','cancelled')),
  tx_hash text UNIQUE,
  ton_payload jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_payment_orders ON public.payment_orders;
CREATE TRIGGER set_updated_at_payment_orders
BEFORE UPDATE ON public.payment_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payment_orders_wallet ON public.payment_orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

-- =========================
-- Depósitos
-- =========================
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  payment_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  amount_usdt numeric(18,6) NOT NULL CHECK (amount_usdt > 0),
  gems integer NOT NULL CHECK (gems > 0),
  tx_hash text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_deposits ON public.deposits;
CREATE TRIGGER set_updated_at_deposits
BEFORE UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);

-- =========================
-- Retiros
-- =========================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  wallet_to text NOT NULL,
  gems_requested integer NOT NULL CHECK (gems_requested > 0),
  fee_percent_gems integer NOT NULL DEFAULT 0 CHECK (fee_percent_gems >= 0),
  fee_fixed_gems integer NOT NULL DEFAULT 32 CHECK (fee_fixed_gems >= 0),
  gems_net integer NOT NULL CHECK (gems_net >= 0),
  amount_usdt_net numeric(18,6) NOT NULL CHECK (amount_usdt_net >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected','cancelled')),
  tx_hash text UNIQUE,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_withdrawals ON public.withdrawals;
CREATE TRIGGER set_updated_at_withdrawals
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- =========================
-- Torneos
-- =========================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entry_usdt numeric(18,6) NOT NULL DEFAULT 10,
  min_users integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','active','closed','paid')),
  starts_at timestamptz,
  ends_at timestamptz,
  prize_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_tournaments ON public.tournaments;
CREATE TRIGGER set_updated_at_tournaments
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  nft_id uuid REFERENCES public.nfts(id) ON DELETE SET NULL,
  payment_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  paid_usdt numeric(18,6) NOT NULL DEFAULT 0,
  tx_hash text,
  score integer NOT NULL DEFAULT 0,
  rank integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','active','eliminated','winner','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

DROP TRIGGER IF EXISTS set_updated_at_tournament_entries ON public.tournament_entries;
CREATE TRIGGER set_updated_at_tournament_entries
BEFORE UPDATE ON public.tournament_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Partidos / uso de NFT
-- =========================
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  nft_id uuid REFERENCES public.nfts(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('estadio','cancha','torneo')),
  result text CHECK (result IN ('win','draw','loss')),
  gems_delta integer NOT NULL DEFAULT 0,
  points_delta integer NOT NULL DEFAULT 0,
  durability_delta numeric(8,2) NOT NULL DEFAULT 0,
  stamina_delta integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_nft_id ON public.matches(nft_id);

-- =========================
-- Ranking
-- =========================
CREATE TABLE IF NOT EXISTS public.ranking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  season text NOT NULL DEFAULT 'S1',
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, season)
);

DROP TRIGGER IF EXISTS set_updated_at_ranking ON public.ranking;
CREATE TRIGGER set_updated_at_ranking
BEFORE UPDATE ON public.ranking
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Referidos
-- =========================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.app_users(id) ON DELETE CASCADE,
  commission_percent numeric(5,2) NOT NULL DEFAULT 10,
  total_earned_gems integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);

-- =========================
-- Reclamo diario
-- =========================
CREATE TABLE IF NOT EXISTS public.daily_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  claim_date date NOT NULL DEFAULT current_date,
  day_number integer NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('gems','points')),
  reward_amount integer NOT NULL CHECK (reward_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

-- =========================
-- Logros
-- =========================
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  threshold integer NOT NULL DEFAULT 1000 CHECK (threshold > 0),
  reward_gems integer NOT NULL DEFAULT 5 CHECK (reward_gems >= 0),
  claimed_count integer NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

DROP TRIGGER IF EXISTS set_updated_at_achievements ON public.achievements;
CREATE TRIGGER set_updated_at_achievements
BEFORE UPDATE ON public.achievements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Goles / recompensas por tipo
-- =========================
CREATE TABLE IF NOT EXISTS public.goal_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  threshold integer NOT NULL DEFAULT 100 CHECK (threshold > 0),
  reward_gems integer NOT NULL DEFAULT 0 CHECK (reward_gems >= 0),
  claimed_count integer NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_type)
);

DROP TRIGGER IF EXISTS set_updated_at_goal_rewards ON public.goal_rewards;
CREATE TRIGGER set_updated_at_goal_rewards
BEFORE UPDATE ON public.goal_rewards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Regalos admin: NFT/gemas
-- =========================
CREATE TABLE IF NOT EXISTS public.admin_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
  to_wallet text,
  gift_type text NOT NULL CHECK (gift_type IN ('nft','gems')),
  catalog_code text REFERENCES public.nft_catalog(code) ON DELETE SET NULL,
  gems integer NOT NULL DEFAULT 0 CHECK (gems >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_gifts_to_user ON public.admin_gifts(to_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_gifts_status ON public.admin_gifts(status);

-- =========================
-- Vista útil para backend/admin
-- =========================
CREATE OR REPLACE VIEW public.v_user_summary AS
SELECT
  u.id,
  u.wallet_address,
  u.wallet_raw,
  u.ref_code,
  u.referred_by,
  u.is_admin,
  u.is_banned,
  u.created_at,
  u.last_login_at,
  COALESCE(b.gems, 0) AS gems,
  COALESCE(b.locked_gems, 0) AS locked_gems,
  COALESCE(b.total_deposited_usdt, 0) AS total_deposited_usdt,
  COALESCE(b.total_withdrawn_usdt, 0) AS total_withdrawn_usdt,
  (SELECT count(*) FROM public.nfts n WHERE n.user_id = u.id AND n.destroyed_at IS NULL) AS nft_count
FROM public.app_users u
LEFT JOIN public.balances b ON b.user_id = u.id;

-- =========================
-- RLS: activado sin políticas públicas.
-- El backend con service_role puede leer/escribir.
-- =========================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_gifts ENABLE ROW LEVEL SECURITY;

COMMIT;
