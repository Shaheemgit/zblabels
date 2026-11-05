CREATE TABLE public.india_post_barcodes (
  consignment_no TEXT PRIMARY KEY,
  assignment_key TEXT UNIQUE,
  assigned_user_id UUID,
  assigned_at TIMESTAMPTZ
);
GRANT ALL ON public.india_post_barcodes TO service_role;
ALTER TABLE public.india_post_barcodes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.allocate_india_post_barcode(p_assignment_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_barcode TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_assignment_key IS NULL OR length(p_assignment_key) > 200 OR
     p_assignment_key !~ '^(sheet:[0-9]+:[0-9]+|order:[0-9a-fA-F-]{36})$' THEN
    RAISE EXCEPTION 'Invalid barcode assignment key';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_assignment_key, 0));

  SELECT consignment_no INTO v_barcode
  FROM public.india_post_barcodes
  WHERE assignment_key = p_assignment_key;
  IF v_barcode IS NOT NULL THEN
    RETURN v_barcode;
  END IF;

  SELECT consignment_no INTO v_barcode
  FROM public.india_post_barcodes
  WHERE assignment_key IS NULL
  ORDER BY consignment_no
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_barcode IS NULL THEN
    RAISE EXCEPTION 'No India Post barcodes remain';
  END IF;

  UPDATE public.india_post_barcodes
  SET assignment_key = p_assignment_key,
      assigned_user_id = v_user_id,
      assigned_at = now()
  WHERE consignment_no = v_barcode;

  RETURN v_barcode;
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_india_post_barcode(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_india_post_barcode(TEXT) TO authenticated;