-- Test database schema for TalentMarket.
-- Derived from `pg_dump --schema-only` of the application database (PostgreSQL 18).
-- Applied automatically by tests/setup/global-setup.ts to an EMPTY test database only.

CREATE TABLE public.players (
    player_id uuid NOT NULL,
    "position" character varying(3) NOT NULL,
    ratings numeric NOT NULL,
    contact_details text NOT NULL,
    CONSTRAINT players_position_check CHECK ((("position")::text = ANY ((ARRAY['gk'::character varying, 'def'::character varying, 'mid'::character varying, 'fwd'::character varying])::text[]))),
    CONSTRAINT players_ratings_check CHECK (((ratings >= (0)::numeric) AND (ratings <= (100)::numeric)))
);

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL
);

CREATE TABLE public.scout_players (
    scout_id uuid NOT NULL,
    player_id uuid NOT NULL
);

CREATE TABLE public.scouts (
    scout_id uuid NOT NULL,
    contact_details text NOT NULL
);

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    email character varying(30) NOT NULL,
    password_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(5) DEFAULT 'user'::character varying NOT NULL,
    user_type character varying(6),
    google_id character varying(255),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['player'::character varying, 'scout'::character varying])::text[])))
);

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (player_id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.scout_players
    ADD CONSTRAINT scout_players_pkey PRIMARY KEY (scout_id, player_id);

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_pkey PRIMARY KEY (scout_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.scout_players
    ADD CONSTRAINT scout_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.scout_players
    ADD CONSTRAINT scout_players_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.scouts(scout_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.users(user_id) ON DELETE CASCADE;