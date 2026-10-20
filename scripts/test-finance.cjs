const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const cache = new Map();

// Use the installed TypeScript compiler, without adding a test-only runtime.
function loadTs(file, overrides = {}) {
  file = path.resolve(__dirname, '..', file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  cache.set(file, mod);
  const original = mod.require.bind(mod);
  mod.require = specifier => {
    if (overrides[specifier]) return overrides[specifier];
    const candidate = specifier.startsWith('@/') ? path.resolve(__dirname, '../src', specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : null;
    const resolved = candidate && ['.ts', '.tsx'].map(ext => candidate + ext).find(value => fs.existsSync(value));
    return resolved ? loadTs(resolved, overrides) : original(specifier);
  };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  mod._compile(output, file);
  return mod.exports;
}
const finance = loadTs('src/lib/finance.ts');
const exportsApi = loadTs('src/lib/finance-export.ts');
const base = () => ({
  rooms: ['101', '102'].map((n, i) => ({ id: `room${i}`, property_id: 'p', room_number: n, room_type: 'Standard', base_price: 1000, status: 'occupied' })),
  leases: [{ id: 'lease', room_id: 'room0', start_date: '2026-01-01', end_date: '2026-10-31', status: 'active' }],
  invoices: [], transactions: [], expenses: [], wallets: [], budgets: [], investments: [],
});
const cash = (id, amount, type = 'income', category = 'room_rent', date = '2026-10-08', title = 'Pembayaran Kamar 101') => ({ id, property_id: 'p', title, amount, type, category, date, notes: '' });
const expense = (id, amount, category = 'Perawatan', room_id = null) => ({ id, property_id: 'p', title: id, amount, category, date: '2026-10-08', room_id });

test('cash income is counted once even when a paid invoice exists', () => {
  const data = base(); data.transactions = [cash('rent', 1000, 'income', 'room_rent', '2026-10-08', 'Pelunasan INV-1 (Kamar 101)')];
  data.invoices = [{ id: 'inv', invoice_number: 'INV-1', total_amount: 1000, status: 'paid', due_date: '2026-10-01', payments: [{ amount_paid: 1000 }] }];
  const totals = finance.pnl(finance.financeEntries(data), finance.monthRange('2026-10'));
  assert.equal(totals.revenue, 1000); assert.equal(totals.rent, 1000);
});
test('invoice receipt is the single ledger source and carries its wallet, date, and room', () => {
  const data = base();
  data.wallets = [{ id: 'wallet1', property_id: 'p', name: 'BCA Operasional', wallet_kind: 'asset', initial_balance: 0 }];
  data.invoices = [{ id: 'inv', property_id: 'p', invoice_number: 'INV-1', room_id: 'room0', total_amount: 1000, status: 'unpaid', due_date: '2026-10-01', payments: [{ id: 'payment1', invoice_id: 'inv', amount_paid: 400, payment_method: 'BCA Operasional', wallet_id: 'wallet1', paid_at: '2026-10-08T09:30:00.000Z' }] }];
  data.transactions = [cash('legacy-invoice-post', 400, 'income', 'room_rent', '2026-10-08', 'Pelunasan INV-1 (Kamar 101)')];
  const entries = finance.financeEntries(data);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, 'payment');
  assert.equal(entries[0].amount, 400);
  assert.equal(entries[0].date, '2026-10-08');
  assert.equal(entries[0].wallet_id, 'wallet1');
  assert.equal(entries[0].room_id, 'room0');
  assert.equal(finance.walletBalances(data).wallets[0].balance, 400);
  assert.equal(finance.receivables(data.invoices, '2026-10-10').total, 600);
});
test('invoice payments with no old cash post still appear exactly once', () => {
  const data = base();
  data.invoices = [{ id: 'inv', property_id: 'p', invoice_number: 'INV-2', room_id: 'room0', total_amount: 500, status: 'paid', due_date: '2026-10-01', payments: [{ id: 'payment2', invoice_id: 'inv', amount_paid: 500, payment_method: 'Tunai', paid_at: '2026-10-09T10:00:00.000Z' }] }];
  const entries = finance.financeEntries(data);
  assert.equal(entries.length, 1);
  assert.equal(finance.pnl(entries, finance.monthRange('2026-10')).revenue, 500);
});
test('P&L separates operating, interest and tax and excludes other periods', () => {
  const data = base(); data.transactions = [cash('rent', 1000), cash('old', 9000, 'income', 'room_rent', '2026-09-01')];
  data.expenses = [expense('op', 200), expense('tax', 50, 'Pajak'), expense('interest', 30, 'Bunga')];
  const totals = finance.pnl(finance.financeEntries(data), finance.monthRange('2026-10'));
  assert.equal(totals.operating, 200); assert.equal(totals.tax, 50); assert.equal(totals.interest, 30);
  assert.equal(totals.profit, 720); assert.equal(totals.margin, 72);
  assert.equal(finance.pnl([], finance.monthRange('2026-10')).margin, null);
});
test('unit allocations conserve revenue/cost and never infer investment', () => {
  const data = base(); data.transactions = [cash('direct', 1000), cash('shared', 200, 'income', 'other', '2026-10-08', 'Pendapatan umum')];
  data.expenses = [expense('shared cost', 100), expense('direct cost', 300, 'Perawatan', 'room0')];
  data.investments = [{ room_id: 'room0', amount: 10000 }];
  const units = finance.unitEconomics(data, finance.financeEntries(data), finance.monthRange('2026-10'));
  assert.equal(units.reduce((t, u) => t + u.revenue, 0), 1200);
  assert.equal(units.reduce((t, u) => t + u.costs, 0), 400);
  assert.equal(units[0].profit, 750); assert.equal(units[0].roi, 7.5); assert.equal(units[1].roi, null);
});
test('room matching requires an exact room number or invoice reference', () => {
  const data = base(); data.transactions = [cash('rent', 1000, 'income', 'room_rent', '2026-10-08', 'Pembayaran Kamar 1010')];
  assert.equal(finance.financeEntries(data)[0].room_id, undefined);
  data.invoices = [{ invoice_number: 'INV-202610-1', room_id: 'room1' }];
  data.transactions[0].title = 'Pelunasan INV-202610-1';
  assert.equal(finance.financeEntries(data)[0].room_id, 'room1');
  data.invoices.unshift({ invoice_number: 'INV-202610', room_id: 'room0' });
  assert.equal(finance.financeEntries(data)[0].room_id, 'room1');
});
test('aging handles partial payments, due today, future and paid invoices', () => {
  const invoice = (id, due_date, status = 'unpaid', paid = 0) => ({ id, due_date, status, total_amount: 1000, payments: paid ? [{ amount_paid: paid }] : [] });
  const result = finance.receivables([
    invoice('today', '2026-10-10'), invoice('future', '2026-11-01'), invoice('partial', '2026-09-10', 'unpaid', 400),
    invoice('old', '2026-06-01'), invoice('paid', '2026-08-01', 'paid'), invoice('paidPartial', '2026-09-01', 'paid', 200),
  ], '2026-10-10');
  assert.equal(result.total, 4400); assert.equal(result.aging[0].value, 2000);
  assert.equal(result.aging[1].value, 600); assert.equal(result.aging[2].value, 800); assert.equal(result.aging[4].value, 1000);
  assert.equal(result.overdue[0].id, 'old'); assert.equal(result.overdue.length, 3);
});
test('budgets include expenses from both sources and flag unbudgeted categories', () => {
  const data = base(); data.transactions = [cash('wifi', 100, 'expense', 'wifi_internet')];
  data.expenses = [expense('wifi2', 50, 'Internet & WiFi'), expense('op', 80)];
  data.budgets = [{ month: '2026-10', category: 'Internet & WiFi', amount: 200 }];
  const result = finance.budgetComparison(data, finance.financeEntries(data), '2026-10');
  assert.equal(result[0].actual, 150); assert.equal(result[0].variance, 50); assert.equal(result[1].hasBudget, false);
});
test('forecast uses three complete months, excludes current month and compounds growth', () => {
  const data = base(); data.transactions = [cash('jul', 300, 'income', 'room_rent', '2026-07-01'), cash('aug', 600, 'income', 'room_rent', '2026-08-01'), cash('sep', 900, 'income', 'room_rent', '2026-09-01'), cash('oct', 99000)];
  const result = finance.projection(finance.financeEntries(data), '2026-10', 10);
  assert.equal(result.hasHistory, true); assert.equal(result.rows[0].revenue, 660);
  assert.ok(Math.abs(result.rows[2].revenue - 798.6) < 1e-8);
  assert.equal(finance.projection([], '2026-10', 0).hasHistory, false);
});
test('date helpers handle leap years and year transitions', () => {
  assert.equal(finance.monthRange('2028-02').end, '2028-02-29');
  assert.equal(finance.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(finance.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(finance.sixMonthTrend([], '2026-01').length, 6);
});
test('cash balance excludes liability opening balances and includes new expenses', () => {
  const data = base(); data.wallets = [{ initial_balance: 5000, wallet_kind: 'asset' }, { initial_balance: 99000, wallet_kind: 'liability' }];
  data.transactions = [cash('rent', 1000), cash('op', 200, 'expense')]; data.expenses = [expense('new', 300)];
  assert.equal(finance.financeKpis(data, finance.financeEntries(data), '2026-10').cash, 5500);
});
test('report summary uses the selected period and PDF wraps and paginates', async () => {
  const data = base(); data.transactions = [cash('rent', 1000000)];
  data.expenses = Array.from({ length: 65 }, (_, i) => ({ ...expense(`Pengeluaran ${i + 1} - perawatan fasilitas dan perlengkapan kamar kost dengan catatan transaksi panjang`, 12000), date: '2026-10-08' }));
  const report = exportsApi.reportData(data, finance.financeEntries(data), finance.monthRange('2026-10'), 'Kost Putri Graha Asri - Finance QA');
  assert.equal(report.totals.profit, 220000); assert.ok(report.summary[0].includes('220.000'));
  const doc = await exportsApi.createFinancePdf(report);
  assert.ok(doc.getNumberOfPages() >= 3);
  const output = doc.output('arraybuffer'); assert.ok(output.byteLength > 3000);
  if (process.env.FINANCE_PDF_QA) {
    fs.mkdirSync(path.dirname(process.env.FINANCE_PDF_QA), { recursive: true });
    fs.writeFileSync(process.env.FINANCE_PDF_QA, Buffer.from(output));
  }
});

test('expense CRUD commits after remote success; failed writes preserve the cache', async () => {
  let rows = [], remoteFails = false;
  const client = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'qa-session' } }, error: null }) },
    from() {
      const query = {
        insert: row => { query.row = row; return query; }, update: row => { query.row = row; return query; },
        eq: () => query, select: () => query, delete: () => query,
        single: async () => remoteFails ? { error: { message: 'RLS rejected' }, data: null } : { error: null, data: { ...query.row, id: 'new-id', created_at: '2026-10-08' } },
      };
      return query;
    },
  };
  const api = loadTs('src/lib/finance-api.ts', {
    './supabase/client': { createClient: () => client },
    './storage': { generateUUID: () => 'new-id', KostStorage: { getExpenses: () => rows, saveExpenses: next => { rows = next; } } },
  });
  const input = { property_id: 'p', title: 'QA expense', category: 'Perawatan', amount: 100, date: '2026-10-08', recorded_by: 'QA', payment_method: 'Cash' };
  await api.FinanceApi.saveExpense(input); assert.equal(rows.length, 1);
  await api.FinanceApi.saveExpense({ ...input, amount: 200 }, 'new-id'); assert.equal(rows[0].amount, 200);
  remoteFails = true;
  await assert.rejects(api.FinanceApi.saveExpense({ ...input, amount: 999 }, 'new-id'));
  await assert.rejects(api.FinanceApi.deleteExpense(rows[0])); assert.equal(rows[0].amount, 200);
  remoteFails = false; await api.FinanceApi.deleteExpense(rows[0]); assert.equal(rows.length, 0);
  client.auth.getSession = async () => ({ data: { session: null }, error: null });
  await assert.rejects(api.financeIsLocal(), /Sesi Supabase berakhir/);
  global.window = {}; global.localStorage = { getItem: () => 'local-qa-user' };
  try {
    await api.FinanceApi.saveExpense(input); assert.equal(rows.length, 1);
    await api.FinanceApi.saveExpense({ ...input, amount: 350 }, 'new-id'); assert.equal(rows[0].amount, 350);
    await api.FinanceApi.deleteExpense(rows[0]); assert.equal(rows.length, 0);
  } finally { delete global.window; delete global.localStorage; }
});

test('empty remote tables replace property cache and failed loads leave it intact', async () => {
  cache.delete(path.resolve(__dirname, '../src/lib/finance-api.ts'));
  let rows = [{ id: 'old', property_id: 'p' }, { id: 'other', property_id: 'other-property' }], source, failure = false;
  const client = {
    auth: { getSession: async () => ({ data: { session: {} }, error: null }) },
    from() { const query = { select: () => query, eq: () => query, order: () => query,
      then: (resolve, reject) => Promise.resolve({ data: [], error: failure ? { message: 'Query failed' } : null }).then(resolve, reject) }; return query; },
  };
  const api = loadTs('src/lib/finance-api.ts', {
    './supabase/client': { createClient: () => client },
    './storage': { KostStorage: { getExpenses: () => rows, saveExpenses: next => { rows = next; }, getFinanceBudgets: () => [], saveFinanceBudgets() {}, getRoomInvestments: () => [], saveRoomInvestments() {}, saveFinanceSource: value => { source = value; } } },
  });
  await api.FinanceApi.load('p'); assert.deepEqual(rows, [{ id: 'other', property_id: 'other-property' }]); assert.equal(source.rooms.length, 0);
  failure = true; rows.push({ id: 'cached', property_id: 'p' });
  await assert.rejects(api.FinanceApi.load('p')); assert.equal(rows.length, 2);
});

test('XLSX exports preserve numeric cells and all report sheets', async () => {
  const XLSX = require('xlsx'); let captured;
  const exportModule = cache.get(path.resolve(__dirname, '../src/lib/finance-export.ts'));
  const original = exportModule.require;
  exportModule.require = specifier => specifier === 'xlsx' ? { ...XLSX, writeFile: book => { captured = XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' }); } } : original(specifier);
  try {
    const data = base(); data.transactions = [cash('rent', 1000)]; data.expenses = [expense('op', 200)];
    const report = exportsApi.reportData(data, finance.financeEntries(data), finance.monthRange('2026-10'), 'QA Kost');
    await exportsApi.exportFinanceXlsx(report);
    assert.equal(captured.SheetNames.length, 6);
    assert.equal(captured.Sheets['Laba Rugi'].B2.t, 'n');
    assert.equal(captured.Sheets['Laba Rugi'].B2.v, 1000);
    await exportsApi.exportExpenses(finance.financeEntries(data).filter(e => e.type === 'expense'));
    assert.deepEqual(captured.SheetNames, ['Expenses']); assert.equal(captured.Sheets.Expenses.D2.v, 200);
  } finally { exportModule.require = original; }
});

test('all six finance content views render on the server without runtime errors', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const data = base(), entries = finance.financeEntries(data), range = finance.monthRange('2026-10');
  const empty = { FinanceApi: {} };
  const views = [
    ['finance-dashboard', 'FinanceDashboard', { data, entries, month: '2026-10', onNavigate() {} }, 'Uang Masuk'],
    ['transactions-view', 'TransactionsView', { data, propertyId: 'p', month: '2026-10', enabled: true, onEdit() {}, onNavigate() {} }, 'Daftar Transaksi'],
    ['pnl-view', 'PnlView', { entries, range, propertyName: 'QA Kost' }, 'LABA BERSIH'],
    ['unit-economics-view', 'UnitEconomicsView', { data, entries, range, propertyId: 'p', enabled: true }, 'Ekonomi per Kamar'],
    ['budget-view', 'BudgetView', { data, entries, month: '2026-10', propertyId: 'p', enabled: true }, 'Budget vs Realisasi'],
    ['reports-view', 'ReportsView', { data, entries, range, propertyName: 'QA Kost' }, 'Finance Report PDF'],
  ];
  // Readonly renders never invoke the write adapter.
  for (const [file, name, props, expected] of views) {
    const moduleFile = path.resolve(__dirname, '../src/components/finance', `${file}.tsx`);
    const component = loadTs(moduleFile, { '@/lib/finance-api': empty });
    const html = renderToStaticMarkup(React.createElement(component[name], props));
    assert.ok(html.includes(expected), `${name} must render ${expected}`);
  }
});

test('owner trends include legacy expenses and follow rolling dates and real leases', () => {
  const data = base();
  data.transactions = [cash('rent', 1000), cash('recent', 500, 'income', 'other', '2026-09-11'), cash('outside', 9999, 'income', 'other', '2026-09-10')];
  data.expenses = [expense('wifi', 200)];
  const daily = finance.ownerCashflow(data, '30d', '2026-10-10');
  assert.equal(daily.length, 30); assert.equal(daily.reduce((t, d) => t + d.Pemasukan, 0), 1500);
  assert.equal(daily.reduce((t, d) => t + d.Pengeluaran, 0), 200);
  const months = finance.ownerCashflow(data, '6m', '2026-10-10');
  const kpis = finance.financeKpis(data, finance.financeEntries(data), '2026-10');
  assert.equal(months.length, 6); assert.equal(months.at(-1).Pemasukan, kpis.revenue); assert.equal(months.at(-1).Pengeluaran, kpis.costs);
  assert.equal(months.at(-1).okupansi, 50);
  assert.equal(finance.ownerCashflow(data, '1y', '2026-01-10').length, 12);
  data.transactions.push(cash('future', 9000, 'income', 'other', '2026-10-11'));
  assert.equal(finance.ownerCashflow(data, '6m', '2026-10-10').at(-1).Pemasukan, 1000);
});

test('wallet balances include linked and legacy expenses without losing unassigned cash', () => {
  const data = base(); data.wallets = [{ id: 'w', property_id: 'p', name: 'BCA', wallet_kind: 'asset', initial_balance: 100 }];
  data.transactions = [{ ...cash('income', 1000), wallet_id: 'w' }, cash('unassigned', 50)];
  data.expenses = [{ ...expense('old', 200), payment_method: 'BCA' }, { ...expense('linked', 100), wallet_id: 'w' }];
  const balances = finance.walletBalances(data, undefined, '2026-10-10');
  assert.equal(balances.wallets[0].balance, 800); assert.equal(balances.unassigned, 50);
  assert.equal(balances.wallets.reduce((t, w) => t + w.balance, 0) + balances.unassigned, finance.financeKpis(data, finance.financeEntries(data), '2026-10').cash);
  data.transactions[0].room_id = 'room1'; assert.equal(finance.financeEntries(data)[0].room_id, 'room1');
});

test('unified transaction CRUD saves once and rejects invalid links, failed writes and invoice changes', async () => {
  cache.delete(path.resolve(__dirname, '../src/lib/finance-api.ts'));
  let rows = [], remoteFails = false, writes = 0;
  const invoices = [{ invoice_number: 'INV-1' }];
  const client = { auth: { getSession: async () => ({ data: { session: {} }, error: null }) }, from() {
    const query = { insert: row => { writes++; query.row = row; return query; }, update: row => { writes++; query.row = row; return query; }, eq: () => query, select: () => query, delete: () => query,
      single: async () => remoteFails ? { error: { message: 'RLS denied' } } : { error: null, data: { ...query.row, id: 'tx', created_at: '2026-10-08' } } }; return query;
  } };
  const storage = { getCashTransactions: () => rows, saveCashTransactions: next => { rows = next; }, getInvoices: () => invoices.map(i => ({ ...i, property_id: 'p' })), getWallets: () => [{ id: 'w', property_id: 'p', wallet_kind: 'asset', name: 'BCA' }, { id: 'other', property_id: 'q', name: 'Other' }], getRooms: () => [{ id: 'r', property_id: 'p' }] };
  const api = loadTs('src/lib/finance-api.ts', { './supabase/client': { createClient: () => client }, './storage': { generateUUID: () => 'tx', KostStorage: storage } }).FinanceApi;
  const input = { property_id: 'p', type: 'income', title: 'Laundry', amount: 100, date: finance.localDate(), category: 'Layanan Tambahan', wallet_id: 'w', room_id: 'r', payment_method: 'BCA', recorded_by: 'QA' };
  await api.saveTransaction(input); assert.equal(writes, 1); assert.equal(rows.length, 1); assert.equal(rows[0].room_id, 'r');
  await assert.rejects(api.saveTransaction({ ...input, title: 'Pembayaran INV-1' }), /Pembayaran invoice dicatat melalui Tagihan/); assert.equal(writes, 1);
  await api.saveTransaction({ ...input, type: 'expense', amount: 30 }, 'tx'); assert.equal(rows.length, 1); assert.equal(rows[0].amount, 30);
  remoteFails = true; await assert.rejects(api.saveTransaction({ ...input, amount: 999 }, 'tx')); await assert.rejects(api.deleteTransaction(rows[0])); assert.equal(rows[0].amount, 30);
  remoteFails = false;
  await assert.rejects(api.saveTransaction({ ...input, wallet_id: 'other' }), /rekening/);
  await assert.rejects(api.saveTransaction({ ...input, room_id: 'wrong' }), /Kamar/);
  await assert.rejects(api.saveTransaction({ ...input, amount: -1 }), /nominal/);
  await assert.rejects(api.saveTransaction({ ...input, date: '2026-02-30' }), /tanggal/);
  rows[0].title = 'Pelunasan INV-1';
  rows[0].type = 'income';
  await assert.rejects(api.saveTransaction(input, 'tx'), /Tagihan/); await assert.rejects(api.deleteTransaction(rows[0]), /Tagihan/);
  rows[0].title = 'Laundry'; await api.deleteTransaction(rows[0]); assert.equal(rows.length, 0);
  global.window = {}; global.localStorage = { getItem: () => 'local-owner' };
  try { const previous = writes; await api.saveTransaction(input); await api.saveTransaction({ ...input, amount: 80 }, 'tx'); assert.equal(writes, previous); assert.equal(rows[0].amount, 80); await api.deleteTransaction(rows[0]); assert.equal(rows.length, 0); }
  finally { delete global.window; delete global.localStorage; }
});

test('account saves require remote success and finance cache propagates storage failures', async () => {
  cache.delete(path.resolve(__dirname, '../src/lib/finance-api.ts'));
  let wallets = [], failure = false;
  const client = { auth: { getSession: async () => ({ data: { session: {} }, error: null }) }, from() {
    const query = { insert: row => { query.row = row; return query; }, update: row => { query.row = row; return query; }, eq: () => query, select: () => query,
      single: async () => failure ? { error: { message: 'Save denied' } } : { error: null, data: { ...query.row, id: 'w' } } }; return query;
  } };
  const api = loadTs('src/lib/finance-api.ts', { './supabase/client': { createClient: () => client }, './storage': { generateUUID: () => 'w', KostStorage: { getWallets: () => wallets, saveWallets: next => { wallets = next; } } } }).FinanceApi;
  const input = { property_id: 'p', name: 'Kas Tunai', type: 'cash', wallet_kind: 'asset', initial_balance: 500 };
  failure = true; await assert.rejects(api.saveWallet(input)); assert.equal(wallets.length, 0);
  failure = false; await api.saveWallet(input); assert.equal(wallets.length, 1);
  await assert.rejects(api.saveWallet({ ...input, name: 'kas tunai' }), /sudah digunakan/);
  await assert.rejects(api.saveWallet({ ...input, property_id: 'q' }, 'w'), /tidak ditemukan/);
  await assert.rejects(api.saveWallet({ ...input, initial_balance: -1 }), /saldo awal/);
  const storage = loadTs('src/lib/storage.ts', { './supabase-service': { FrontendSupabaseService: {} }, './api-client': { KostApiClient: {} } }).KostStorage;
  global.window = {}; global.localStorage = { setItem() { throw new Error('Quota exceeded'); } };
  try { assert.throws(() => storage.saveCashTransactions([]), /Quota exceeded/); assert.throws(() => storage.saveExpenses([]), /Quota exceeded/); }
  finally { delete global.window; delete global.localStorage; }
});

test('invoice payments require a property wallet, persist partial amounts, and update cache only after remote success', async () => {
  cache.delete(path.resolve(__dirname, '../src/lib/finance-api.ts'));
  let invoices = [{ id: 'inv', property_id: 'p', invoice_number: 'INV-1', total_amount: 1000, due_date: '2099-01-01', status: 'unpaid', payments: [{ id: 'old-payment', amount_paid: 250 }] }];
  const wallets = [{ id: 'wallet-p', property_id: 'p', name: 'BCA Operasional', wallet_kind: 'asset' }, { id: 'wallet-q', property_id: 'q', name: 'BCA Lain', wallet_kind: 'asset' }, { id: 'liability', property_id: 'p', name: 'Utang', wallet_kind: 'liability' }];
  let inserted, fail = false;
  const client = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'session' } }, error: null }) },
    from(table) {
      assert.equal(table, 'payments');
      const query = { insert: row => { inserted = row; return query; }, select: () => query, single: async () => fail ? { error: { message: 'RLS rejected' } } : { error: null, data: { ...inserted, id: 'payment-new', paid_at: '2026-10-19T10:00:00.000Z' } } };
      return query;
    },
  };
  const api = loadTs('src/lib/finance-api.ts', { './supabase/client': { createClient: () => client }, './storage': { KostStorage: { getInvoices: () => invoices, saveInvoices: next => { invoices = next; }, getWallets: () => wallets } } }).FinanceApi;
  const payment = await api.recordInvoicePayment({ invoice_id: 'inv', amount_paid: 400, wallet_id: 'wallet-p', verified_by: 'Owner' });
  assert.equal(payment.amount_paid, 400); assert.equal(inserted.wallet_id, 'wallet-p'); assert.equal(inserted.payment_method, 'BCA Operasional');
  assert.equal(invoices[0].payments.length, 2); assert.equal(invoices[0].status, 'unpaid');
  await assert.rejects(api.recordInvoicePayment({ invoice_id: 'inv', amount_paid: 400, wallet_id: 'wallet-p' }), /sisa tagihan/);
  await assert.rejects(api.recordInvoicePayment({ invoice_id: 'inv', amount_paid: 100, wallet_id: 'wallet-q' }), /wallet kas milik properti/);
  fail = true; await assert.rejects(api.recordInvoicePayment({ invoice_id: 'inv', amount_paid: 100, wallet_id: 'wallet-p' }), /RLS rejected/);
  assert.equal(invoices[0].payments.length, 2);
  fail = false; await api.recordInvoicePayment({ invoice_id: 'inv', amount_paid: 350, wallet_id: 'wallet-p' });
  assert.equal(invoices[0].payments.length, 3); assert.equal(invoices[0].status, 'paid');
});

test('desktop and mobile have one finance icon and preserve limited finance permissions', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const auth = { useAuth: () => ({ profile: { role: 'owner' } }) };
  const Sidebar = loadTs('src/components/layout/sidebar.tsx', { '@/lib/auth-context': auth }).Sidebar;
  const MobileNav = loadTs('src/components/layout/mobile-nav.tsx', { '@/lib/auth-context': auth }).MobileNav;
  for (const View of [Sidebar, MobileNav]) for (const activeTab of ['finance', 'cashflow', 'expenses', 'pnl', 'reports', 'owner-audit']) {
    const html = renderToStaticMarkup(React.createElement(View, { currentRole: 'owner', activeTab, onTabChange() {} }));
    assert.equal((html.match(View === Sidebar ? /title="Keuangan"/g : />Keuangan</g) || []).length, 1);
    assert.ok(!html.includes('Expense Tracker'));
  }
  const permissions = loadTs('src/lib/permissions.ts');
  assert.equal(permissions.financeLanding('custom', ['expenses']), 'expenses');
  assert.equal(permissions.financeLanding('custom', ['reports']), 'reports');
  assert.equal(permissions.financeLanding('cleaning_staff'), undefined);
});

test('owner dashboard and transaction form render shared figures and clear income/expense controls', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const data = base(); const date = finance.localDate();
  data.transactions = [cash('income', 12500, 'income', 'other', date)]; data.expenses = [{ ...expense('out', 2500), date }];
  data.wallets = [{ id: 'w', property_id: 'p', name: 'BCA', wallet_kind: 'asset', initial_balance: 5000 }];
  const Owner = loadTs('src/components/owner/owner-dashboard-view.tsx', {
    '@/lib/auth-context': { useAuth: () => ({ profile: { role: 'owner', property_id: 'p' } }) },
    '@/components/finance/use-finance-data': { useFinanceData: () => ({ data, local: true, loading: false, error: '', refresh() {} }) },
    '@/lib/finance-workspace-context': { useFinanceWorkspace: () => ({ activeProperty: { id: 'p', name: 'QA Kost' }, activePropertyId: 'p' }), FinancePropertyPicker: () => null },
  }).OwnerDashboardView;
  const html = renderToStaticMarkup(React.createElement(Owner, { onNavigateTab() {} }));
  for (const text of ['Uang Masuk (Kas)', 'Uang Keluar (Kas)', 'Laba Bersih', 'Saldo Kas', '12.500', '2.500', '10.000', '15.000', finance.monthLabel(date.slice(0, 7))]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Q1 2026'));
  const Form = loadTs('src/components/finance/transaction-form.tsx', { '@/lib/finance-api': { FinanceApi: {} } }).TransactionForm;
  const form = renderToStaticMarkup(React.createElement(Form, { data, propertyId: 'p', recordedBy: 'QA', enabled: true, onClose() {}, onNavigate() {} }));
  assert.ok(form.includes('Uang Masuk')); assert.ok(form.includes('Uang Keluar')); assert.ok(form.includes('Saldo masuk ke wallet / rekening')); assert.ok(form.includes('tercatat otomatis'));
});

test('room cache joins types and leases only within the room property', () => {
  const storage = loadTs('src/lib/storage.ts', { './supabase-service': { FrontendSupabaseService: {} }, './api-client': { KostApiClient: {} } }).KostStorage;
  const values = {
    kost_erp_rooms: [{ id: 'r', property_id: 'p', room_number: '101', room_type: 'Standard', base_price: 1000, status: 'available' }],
    kost_erp_room_types: [{ id: 'other-type', property_id: 'other', name: 'Standard', base_price: 9999 }, { id: 'type', property_id: 'p', name: 'Standard', base_price: 1000 }],
    kost_erp_leases: [{ id: 'other-lease', property_id: 'other', room_number: '101', tenant_id: 'bob', status: 'active' }, { id: 'lease', property_id: 'p', room_id: 'r', tenant_id: 'alice', status: 'active' }],
    kost_erp_tenants: [{ id: 'bob', property_id: 'other', full_name: 'Other Property' }, { id: 'alice', property_id: 'p', full_name: 'Correct Property' }],
  };
  global.window = {}; global.localStorage = { getItem: key => values[key] ? JSON.stringify(values[key]) : null };
  try {
    const room = storage.getRooms()[0]; assert.equal(room.base_price, 1000); assert.equal(room.current_tenant.full_name, 'Correct Property');
    values.kost_erp_leases.pop(); assert.equal(storage.getRooms()[0].status, 'available');
  } finally { delete global.window; delete global.localStorage; }
});
