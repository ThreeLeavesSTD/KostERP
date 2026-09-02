-- ==============================================================================
-- SCHEMA MIGRATION: 006_seed_real_data.sql
-- ERP Operasional Kost Seed Data (Konsisten Relational Hierarchy)
-- ==============================================================================

-- 1. Property
INSERT INTO public.properties (id, name, address, city, phone)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Kost Putri Graha Asri',
    'Jl. Kemang Raya No. 42B, Mampang Prapatan',
    'Jakarta Selatan',
    '+6281234567890'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    phone = EXCLUDED.phone;

-- 2. Rooms
INSERT INTO public.rooms (property_id, room_number, floor, room_type, base_price, facilities, status, notes)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '101', 1, 'Deluxe AC', 1800000, ARRAY['Kasur Queen', 'AC', 'Kamar Mandi Dalam', 'Lemari', 'Meja Kerja'], 'occupied', 'Depan taman'),
    ('a0000000-0000-0000-0000-000000000001', '102', 1, 'Standard AC', 1500000, ARRAY['Kasur Single', 'AC', 'Kamar Mandi Luar', 'Lemari'], 'occupied', 'Dekat pantry'),
    ('a0000000-0000-0000-0000-000000000001', '103', 1, 'Standard Non-AC', 1200000, ARRAY['Kasur Single', 'Kipas Angin', 'Kamar Mandi Luar'], 'available', 'Jendela samping'),
    ('a0000000-0000-0000-0000-000000000001', '201', 2, 'VIP Balcony', 2200000, ARRAY['Kasur King', 'AC', 'Kamar Mandi Dalam (Water Heater)', 'Balkon Pribadi', 'Smart TV'], 'occupied', 'Pemandangan kota'),
    ('a0000000-0000-0000-0000-000000000001', '202', 2, 'Deluxe AC', 1800000, ARRAY['Kasur Queen', 'AC', 'Kamar Mandi Dalam', 'Lemari'], 'available', 'Lantai 2 timur'),
    ('a0000000-0000-0000-0000-000000000001', '203', 2, 'Standard AC', 1500000, ARRAY['Kasur Single', 'AC', 'Kamar Mandi Luar'], 'maintenance', 'Perbaikan cat dinding')
ON CONFLICT (property_id, room_number) DO UPDATE SET
    floor = EXCLUDED.floor,
    room_type = EXCLUDED.room_type,
    base_price = EXCLUDED.base_price,
    facilities = EXCLUDED.facilities,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- 3. Tenants
INSERT INTO public.tenants (id, property_id, full_name, phone_number, id_card_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Siti Rahmawati', '+6281234567890', '3271012345678901', 'Hj. Fatimah (Ibu)', '+6281298765432', 'Orang Tua'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Dimas Pratama', '+6285712345678', '3271019876543210', 'Bambang (Ayah)', '+6285787654321', 'Orang Tua'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Amanda Putri', '+6289612345678', '3271015678901234', 'Rina (Kakak)', '+6289687654321', 'Saudara Kandung')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    id_card_number = EXCLUDED.id_card_number;

-- 4. Leases
INSERT INTO public.leases (id, property_id, room_id, tenant_id, start_date, end_date, billing_cycle_day, rent_amount, deposit_amount, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'c0000000-0000-0000-0000-000000000001', '2026-01-01', '2027-01-01', 5, 1800000, 500000, 'active'),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000102', 'c0000000-0000-0000-0000-000000000002', '2026-02-10', '2027-02-10', 10, 1500000, 500000, 'active'),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000201', 'c0000000-0000-0000-0000-000000000003', '2026-03-15', '2027-03-15', 15, 2200000, 1000000, 'active')
ON CONFLICT (id) DO UPDATE SET
    rent_amount = EXCLUDED.rent_amount,
    status = EXCLUDED.status;

-- 5. Invoices
INSERT INTO public.invoices (id, property_id, lease_id, invoice_number, billing_period, subtotal_rent, additional_fees, total_amount, due_date, status, notes)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'INV/202608/001', '2026-08', 1800000, 0, 1800000, '2026-08-05', 'paid', 'Sewa Kamar 101 - Agustus 2026'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'INV/202608/002', '2026-08', 1500000, 0, 1500000, '2026-08-10', 'paid', 'Sewa Kamar 102 - Agustus 2026'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'INV/202608/003', '2026-08', 2200000, 50000, 2250000, '2026-08-15', 'unpaid', 'Sewa Kamar 201 + Laundry - Agustus 2026')
ON CONFLICT (invoice_number) DO UPDATE SET
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount;

-- 6. Payments
INSERT INTO public.payments (id, invoice_id, amount_paid, payment_method, verified_by, paid_at, notes)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1800000, 'bca_transfer', 'Admin', '2026-08-04 10:15:00+07', 'Transfer BCA Lunas'),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1500000, 'qris', 'Admin', '2026-08-09 14:20:00+07', 'QRIS Statis Lunas')
ON CONFLICT (id) DO UPDATE SET
    amount_paid = EXCLUDED.amount_paid;

-- 7. Electricity Transactions
INSERT INTO public.electricity_transactions (id, property_id, lease_id, room_id, tenant_id, token_code, nominal_amount, kwh_units, cost_price, selling_price, payment_status, sent_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', 'c0000000-0000-0000-0000-000000000001', '4512-8921-3412-7890-1234', 100000, 66.5, 98000, 105000, 'paid_cash', NOW()),
    ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000102', 'c0000000-0000-0000-0000-000000000002', '1290-7812-4523-9012-3456', 50000, 33.2, 49000, 53000, 'paid_transfer', NOW()),
    ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000201', 'c0000000-0000-0000-0000-000000000003', '8923-4512-7890-1234-5678', 100000, 66.5, 98000, 105000, 'invoiced', NULL)
ON CONFLICT (id) DO UPDATE SET
    payment_status = EXCLUDED.payment_status;

-- 8. Payment Methods Config
INSERT INTO public.payment_methods_config (id, property_id, bank_name, account_number, account_holder, instructions, is_active)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'BCA Transfer', '8281928190', 'Hendra Wijaya', 'Sertakan nomor kamar pada berita transfer. Bukti transfer diunggah via portal.', TRUE),
    ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mandiri Transfer', '1370019283719', 'Kost Putri Graha Asri', 'Transfer sebelum tanggal 10 tiap bulan.', TRUE),
    ('20000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'QRIS Statis', 'NMID: ID1029384756', 'Kost Graha Asri Official', 'Scan melalui BCA, GoPay, OVO, ShopeePay atau bank apa saja.', TRUE),
    ('20000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Kas Tunai', 'Langsung Pengelola', 'Penjaga Kost Pak Joko', 'Bayar langsung di pos penjaga kost pada jam 08:00 - 20:00 WIB.', TRUE)
ON CONFLICT (id) DO UPDATE SET
    account_number = EXCLUDED.account_number,
    is_active = EXCLUDED.is_active;

-- 9. Finance Categories
INSERT INTO public.finance_categories (id, name, type, category_kind, icon, is_default)
VALUES
    ('60000000-0000-0000-0000-000000000001', 'Sewa Kamar', 'income', 'income', 'DoorClosed', TRUE),
    ('60000000-0000-0000-0000-000000000002', 'Penjualan Token Listrik', 'income', 'income', 'Zap', TRUE),
    ('60000000-0000-0000-0000-000000000003', 'Operasional & Kebersihan', 'expense', 'expense', 'Sparkles', TRUE),
    ('60000000-0000-0000-0000-000000000004', 'Tagihan WiFi & Internet', 'expense', 'expense', 'Wifi', TRUE),
    ('60000000-0000-0000-0000-000000000005', 'Perbaikan & Maintenance AC', 'expense', 'expense', 'Wrench', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type;

-- 10. Finance Wallets
INSERT INTO public.finance_wallets (id, property_id, name, type, wallet_kind, category_name, account_number, account_holder, initial_balance, color, is_default)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Kas Tunai Operasional', 'cash', 'asset', 'Kas Tunai', 'Cash Drawer', 'Penjaga Kost', 2500000, 'amber', TRUE),
    ('30000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rekening Utama BCA', 'bank', 'asset', 'Bank Transfer', '8281928190', 'Hendra Wijaya', 15000000, 'blue', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    initial_balance = EXCLUDED.initial_balance;

-- 11. Cash Transactions
INSERT INTO public.cash_transactions (id, property_id, type, category, category_name, wallet_id, wallet_name, title, amount, date, payment_method, notes, recorded_by)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'income', 'Sewa Kamar', 'Sewa Kamar', '30000000-0000-0000-0000-000000000002', 'Rekening Utama BCA', 'Pembayaran Sewa Kamar 101 Agustus', 1800000, CURRENT_DATE - INTERVAL '2 days', 'BCA Transfer', 'Lunas via transfer', 'Admin'),
    ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'expense', 'Operasional & Kebersihan', 'Operasional & Kebersihan', '30000000-0000-0000-0000-000000000001', 'Kas Tunai Operasional', 'Beli Sabun Pel, Karbol & Plastik Sampah', 150000, CURRENT_DATE - INTERVAL '1 days', 'Kas Tunai', 'Struk terlampir di pos', 'Staff')
ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount;

-- 12. Room Complaints
INSERT INTO public.room_complaints (id, property_id, room_id, room_number, tenant_id, tenant_name, tenant_phone, raw_chat_message, ai_extracted_summary, category, priority, status)
VALUES
    ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000101', '101', 'c0000000-0000-0000-0000-000000000001', 'Siti Rahmawati', '+6281234567890', 'Halo admin, kran air wastafel di kamar saya netes terus dari semalam.', 'Kran wastafel kamar 101 bocor menetes terus', 'plumbing', 'medium', 'in_progress'),
    ('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000201', '201', 'c0000000-0000-0000-0000-000000000003', 'Amanda Putri', '+6289612345678', 'Malam min, AC kamar 201 agak kurang dingin ya, tolong dicek freonnya.', 'AC kamar 201 kurang dingin perlu cek freon', 'ac_facility', 'low', 'pending')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;
