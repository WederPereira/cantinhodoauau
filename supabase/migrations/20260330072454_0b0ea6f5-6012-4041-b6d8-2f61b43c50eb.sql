
DROP POLICY IF EXISTS "Authenticated access daily_records" ON public.daily_records;
CREATE POLICY "Authenticated can select daily_records" ON public.daily_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert daily_records" ON public.daily_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update daily_records" ON public.daily_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete daily_records" ON public.daily_records FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated access qr_entries" ON public.qr_entries;
CREATE POLICY "Authenticated can select qr_entries" ON public.qr_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert qr_entries" ON public.qr_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update qr_entries" ON public.qr_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete qr_entries" ON public.qr_entries FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated access hotel_stays" ON public.hotel_stays;
CREATE POLICY "Authenticated can select hotel_stays" ON public.hotel_stays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hotel_stays" ON public.hotel_stays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hotel_stays" ON public.hotel_stays FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete hotel_stays" ON public.hotel_stays FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated access hotel_meals" ON public.hotel_meals;
CREATE POLICY "Authenticated can select hotel_meals" ON public.hotel_meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hotel_meals" ON public.hotel_meals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hotel_meals" ON public.hotel_meals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete hotel_meals" ON public.hotel_meals FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated access hotel_medications" ON public.hotel_medications;
CREATE POLICY "Authenticated can select hotel_medications" ON public.hotel_medications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hotel_medications" ON public.hotel_medications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hotel_medications" ON public.hotel_medications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete hotel_medications" ON public.hotel_medications FOR DELETE TO authenticated USING (true);
