// Launch Radar's dashboard. It reads window.RADAR (written beside dashboard/
// by main.ts) and renders the ranked board, a filterable table, a per-protocol
// detail view with the model's own inputs and the protocol's farm plan, and the
// live-token table. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var rows = DATA.rows || [];
  var live = DATA.live || [];
  var state = { q: '', category: 'all', scope: 'all', sort: 'implied', minTvl: 0, selected: null };

  function $(id) { return document.getElementById(id); }

  /** $1,234,567,890 -> $1.23B; $746,200,000 -> $746.2M; $51,300,000 -> $51.3M. */
  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }

  /** +5.6% / -2.2% / — when the snapshot reports no change. */
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }

  function pctClass(n) {
    if (n === null || n === undefined) return '';
    return n >= 0 ? 'pos' : 'neg';
  }

  /** 543 -> 1.5y; 90 -> 90d; null -> —. */
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return days + 'd';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bySlug(slug) {
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) return rows[i];
    return null;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = rows.filter(function (r) {
      if (state.scope === 'watchlist' && !r.watchlist) return false;
      if (state.scope === 'early' && r.watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Uncategorised') !== state.category) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    out.sort(function (a, b) {
      if (key === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (key === 'growth') return (b.change_7d === null ? -1e9 : b.change_7d) - (a.change_7d === null ? -1e9 : a.change_7d);
      if (key === 'age') return (b.age_days === null ? -1 : b.age_days) - (a.age_days === null ? -1 : a.age_days);
      return a.rank - b.rank;
    });
    return out;
  }

  function renderStats() {
    var top = rows.length ? rows[0] : null;
    $('stats').innerHTML =
      '<div><dt>Snapshot</dt><dd>' + esc(DATA.as_of) + '</dd></div>' +
      '<div><dt>Watchlist</dt><dd>' + DATA.watchlist_size + '</dd></div>' +
      '<div><dt>Board rows</dt><dd>' + DATA.board_size + '</dd></div>' +
      '<div><dt>Early finds</dt><dd>' + DATA.early_size + '</dd></div>' +
      '<div><dt>Top implied</dt><dd>' + (top ? money(top.implied_value_usd) : '—') + '</dd></div>';
  }

  function renderCategories() {
    var seen = {};
    rows.forEach(function (r) { seen[r.category || 'Uncategorised'] = true; });
    var cats = Object.keys(seen).sort();
    var html = '<option value="all">All categories</option>';
    cats.forEach(function (c) {
      html += '<option value="' + esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    });
    $('category').innerHTML = html;
  }

  function renderBoard() {
    var list = filtered();
    var html = '';
    if (list.length === 0) {
      html = '<tr><td colspan="8" class="empty">No protocol matches this filter.</td></tr>';
    }
    list.forEach(function (r) {
      var chains = r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '');
      html += '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="selected"' : '') + '>' +
        '<td class="num rank">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="tag' + (r.watchlist ? '' : ' early') + '">' + (r.watchlist ? 'Watchlist' : 'Early') + '</span><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(chains || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td>' +
        '</tr>';
    });
    $('rows').innerHTML = html;
    $('count').textContent = 'Showing ' + list.length + ' of ' + rows.length + ' ranked protocols';
  }

  function renderDetail() {
    var section = $('detail');
    var r = state.selected ? bySlug(state.selected) : null;
    if (!r) { section.hidden = true; $('detail-body').innerHTML = ''; return; }
    var base = Math.round(r.tvl_usd * DATA.model.base_multiple);
    var growth = r.change_7d === null ? 0 : Math.max(DATA.model.growth_floor, Math.min(DATA.model.growth_cap, r.change_7d));
    var steps = (r.farm_steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('detail-body').innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ') || 'no chain listed') +
      ' · ' + (r.watchlist ? 'on the watchlist' : 'an early find below the $50M floor') + '</p>' +
      '<dl class="kv">' +
      '<div><dt>Implied value</dt><dd>' + money(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd class="' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</dd></div>' +
      '<div><dt>Tracked</dt><dd>' + ageText(r.age_days) + '</dd></div>' +
      '<div><dt>Momentum</dt><dd>' + r.momentum.toFixed(2) + '×</dd></div>' +
      '<div><dt>Tenure</dt><dd>' + r.tenure.toFixed(2) + '×</dd></div>' +
      '</dl>' +
      '<p class="math">' + money(r.tvl_usd) + ' × 0.30 = ' + money(base) + ' &nbsp;·&nbsp; momentum ' + r.momentum.toFixed(2) +
      '× (7d ' + (r.change_7d === null ? 'unreported' : growth.toFixed(1) + '%') + ') &nbsp;·&nbsp; tenure ' + r.tenure.toFixed(2) +
      '× &nbsp;=&nbsp; ' + money(r.implied_value_usd) + '</p>' +
      '<h3>How to farm it — seven steps</h3>' +
      '<ol class="steps">' + steps + '</ol>';
    section.hidden = false;
  }

  function renderLive() {
    var html = '';
    live.forEach(function (p) {
      html += '<tr>' +
        '<td><span class="name">' + esc(p.name) + '</span><br><span class="slug">' + esc(p.slug) + '</span></td>' +
        '<td>' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td>' +
        '<td class="num value">' + money(p.mcap_usd) + '</td>' +
        '<td class="num ' + pctClass(p.change_7d) + '">' + pct(p.change_7d) + '</td>' +
        '</tr>';
    });
    $('live-rows').innerHTML = html;
  }

  function renderModelFoot() {
    $('model-foot').textContent = 'Model ' + DATA.model_version + ': base multiple ' + DATA.model.base_multiple +
      ', growth clamped to ' + DATA.model.growth_floor + '% … +' + DATA.model.growth_cap +
      '%, tenure ' + DATA.model.tenure_floor + ' → ' + (DATA.model.tenure_floor + DATA.model.tenure_range) +
      ' over ' + DATA.model.tenure_days + ' days, unknown age ' + DATA.model.unknown_age_days +
      ' days. Board: ' + DATA.watchlist_size + ' watchlist protocols plus ' + DATA.early_size +
      ' early finds, ' + DATA.board_size + ' rows in all.';
  }

  function renderAll() {
    renderStats();
    renderCategories();
    renderBoard();
    renderDetail();
    renderLive();
    renderModelFoot();
  }

  function openDetail(slug, scroll) {
    state.selected = slug;
    renderBoard();
    renderDetail();
    if (scroll && !$('detail').hidden) $('detail').scrollIntoView({ block: 'start' });
  }

  function applyHash() {
    var hash = window.location.hash || '';
    var m = hash.match(/#p=([^&]+)/);
    var c = hash.match(/#cat=([^&]+)/);
    if (c) {
      var cat = decodeURIComponent(c[1]);
      if (state.category !== cat) { state.category = cat; $('category').value = cat; }
    }
    if (m) openDetail(decodeURIComponent(m[1]), true);
    else if (state.selected) { state.selected = null; renderBoard(); renderDetail(); }
    renderBoard();
  }

  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  $('category').addEventListener('change', function (e) { state.category = e.target.value; renderBoard(); });
  $('scope').addEventListener('change', function (e) { state.scope = e.target.value; renderBoard(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderBoard(); });
  $('min-tvl').addEventListener('change', function (e) { state.minTvl = Number(e.target.value); renderBoard(); });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    if (window.location.hash === '#p=' + slug) { openDetail(slug, true); return; }
    window.location.hash = 'p=' + slug;
  });
  $('detail-close').addEventListener('click', function () {
    state.selected = null;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    renderBoard();
    renderDetail();
  });
  window.addEventListener('hashchange', applyHash);

  renderAll();
  applyHash();
})();
