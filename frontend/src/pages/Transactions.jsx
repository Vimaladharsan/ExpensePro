import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Inbox, Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react';
import { api, toQuery } from '../api.js';
import { useApp } from '../context/AppContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORIES } from '../constants.js';
import { CategoryIcon, EmptyState, Skeleton } from '../components/ui.jsx';
import { formatDate, formatINR, formatMonth } from '../utils/format.js';
import { downloadTransactionsCsv } from '../utils/csv.js';

const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

export default function Transactions() {
  const { month, refreshKey, refresh, openTransaction, askConfirm } = useApp();
  const toast = useToast();

  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState(''); // searchText, applied 300ms after typing stops
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Wait until the user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Any filter change goes back to page 1
  useEffect(() => setPage(1), [month, search, type, category, sort]);

  const filters = { month, search, type, category, sort };

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api(`/transactions${toQuery({ ...filters, page, limit: PAGE_SIZE })}`)
      .then((data) => !ignore && setResult(data))
      .catch((err) => !ignore && toast.error(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [month, search, type, category, sort, page, refreshKey, toast]);

  async function handleDelete(t) {
    const ok = await askConfirm({
      title: 'Delete this transaction?',
      message: `${t.note || t.category} · ${formatINR(t.amount)} on ${formatDate(t.date, true)}. This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await api(`/transactions/${t._id}`, { method: 'DELETE' });
      toast.success('Transaction deleted');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Download the filtered transactions as a CSV file (opens in Excel)
  async function exportCsv() {
    try {
      const data = await api(`/transactions${toQuery({ ...filters, limit: 1000 })}`);
      if (data.items.length === 0) return toast.info('Nothing to export');
      const count = downloadTransactionsCsv(data.items, `transactions-${month}.csv`);
      toast.success(`Exported ${count} transactions`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const hasFilters = Boolean(search || type || category);
  function clearFilters() {
    setSearchText('');
    setSearch('');
    setType('');
    setCategory('');
  }

  const categoryOptions = type ? CATEGORIES[type] : [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])];
  const first = result ? (result.page - 1) * PAGE_SIZE + 1 : 0;
  const last = result ? Math.min(result.page * PAGE_SIZE, result.total) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>All transactions</h2>
          <p className="muted">{formatMonth(month)}{result ? ` · ${result.total} found` : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={exportCsv}><Download size={16} /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => openTransaction()}><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="card filters">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search notes, categories, payment…" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          {searchText && (
            <button className="input-action" onClick={() => setSearchText('')} aria-label="Clear search"><X size={15} /></button>
          )}
        </div>
        <div className="segmented segmented-sm" role="group" aria-label="Type">
          {[['', 'All'], ['income', 'Income'], ['expense', 'Expense']].map(([value, label]) => (
            <button key={label} className={type === value ? `active ${value}` : ''}
              onClick={() => { setType(value); setCategory(''); }}>{label}</button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className={`card table-card ${loading && result ? 'is-loading' : ''}`}>
        {!result ? (
          <div className="table-skeleton">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={44} />)}</div>
        ) : result.items.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={SearchX} title="No matching transactions" text="Try a different search or filter."
              action={<button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>} />
          ) : (
            <EmptyState icon={Inbox} title={`No transactions in ${formatMonth(month)}`} text="Add your first income or expense."
              action={<button className="btn btn-primary btn-sm" onClick={() => openTransaction()}><Plus size={16} /> Add transaction</button>} />
          )
        ) : (
          <>
            <div className="tx-table" role="table" aria-label="Transactions">
              <div className="tx-row tx-head" role="row">
                <span role="columnheader">Transaction</span>
                <span role="columnheader">Date</span>
                <span role="columnheader">Payment</span>
                <span role="columnheader" className="right">Amount</span>
                <span role="columnheader" className="right">Actions</span>
              </div>
              {result.items.map((t) => (
                <div className="tx-row" role="row" key={t._id}>
                  <span className="tx-main" role="cell">
                    <CategoryIcon category={t.category} size={38} />
                    <span>
                      <b>{t.note || t.category}</b>
                      <small className="muted">{t.category}</small>
                    </span>
                  </span>
                  <span className="tx-date" role="cell">{formatDate(t.date)}</span>
                  <span role="cell"><span className="badge">{t.paymentMethod}</span></span>
                  <span role="cell" className={`right amount ${t.type}`}>{t.type === 'income' ? '+' : '−'}{formatINR(t.amount)}</span>
                  <span role="cell" className="right tx-actions">
                    <button className="icon-btn" onClick={() => openTransaction(t)} aria-label="Edit"><Pencil size={16} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(t)} aria-label="Delete"><Trash2 size={16} /></button>
                  </span>
                </div>
              ))}
            </div>

            <div className="pagination">
              <span className="muted small">Showing {first}–{last} of {result.total}</span>
              <div className="pagination-buttons">
                <button className="icon-btn" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)} aria-label="Previous page">
                  <ChevronLeft size={18} />
                </button>
                <span className="small">Page {result.page} of {result.pages}</span>
                <button className="icon-btn" disabled={result.page >= result.pages} onClick={() => setPage(result.page + 1)} aria-label="Next page">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
