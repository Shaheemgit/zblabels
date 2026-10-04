CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL,
  customer TEXT NOT NULL,
  address TEXT NOT NULL,
  pin TEXT NOT NULL,
  mobile TEXT NOT NULL,
  book TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 260,
  payment TEXT NOT NULL DEFAULT 'Prepaid',
  post TEXT NOT NULL DEFAULT 'India Post',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own orders" ON public.orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.label_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  orders JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_batches TO authenticated;
GRANT ALL ON public.label_batches TO service_role;
ALTER TABLE public.label_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own label batches" ON public.label_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);