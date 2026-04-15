-- Add medication_type to hotel_medications
ALTER TABLE public.hotel_medications 
ADD COLUMN medication_type text NOT NULL DEFAULT 'comprimido';

-- Make ate nullable in hotel_meals (null = not marked, true = ate, false = didn't eat)
ALTER TABLE public.hotel_meals 
ALTER COLUMN ate DROP NOT NULL,
ALTER COLUMN ate DROP DEFAULT,
ALTER COLUMN ate SET DEFAULT NULL;

-- Update existing rows with ate=false to null (not yet marked)
UPDATE public.hotel_meals SET ate = NULL WHERE ate = false;