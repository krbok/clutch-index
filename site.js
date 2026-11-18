window.renderLanding = function (tables) {
  var host = document.getElementById('landing');
  if (!host) return;
  var make = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var byRank = function (rows) { return rows.slice().sort(function (a, b) { return +a.rank - +b.rank; }); };
  var signed = function (v) { var x = +v; return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1); };
  var open = function (tab) {
    var b = document.querySelector('.ci-tab[data-tab="' + tab + '"]');
    if (b) { b.click(); document.getElementById('tabs').scrollIntoView({ block: 'start' }); }
  };
  var half = function (head, rows, valueHead) {
    var scroll = make('div', 'ci-scroll'), table = make('table', 'ci-table lead-table'), tr = make('tr');
    [['#', 1], [head, 0], [valueHead, 1]].forEach(function (h) { tr.appendChild(make('th', h[1] ? 'ci-n' : null, h[0])); });
    var thead = make('thead'); thead.appendChild(tr); table.appendChild(thead);
    var tb = make('tbody');
    rows.forEach(function (r) {
      var row = make('tr');
      row.appendChild(make('td', 'ci-n', r.rank));
      row.appendChild(make('td', null, r.name));
      row.appendChild(make('td', 'ci-n lead-val ' + (+r.est100 >= 0 ? 'pos' : 'neg'), signed(r.est100)));
      tb.appendChild(row);
    });
    table.appendChild(tb); scroll.appendChild(table);
    return scroll;
  };
  var figure = function (no, who, rows, valueHead, tab, more) {
    var all = byRank(rows), fig = make('figure', 'lead-fig');
    var cap = make('figcaption', 'lead-cap'); cap.appendChild(make('b', null, 'Table ' + no + '. '));
    cap.appendChild(document.createTextNode(who + ': the best ten and the bottom ten of ' + all.length + ' eligible, by Clutch Index')); fig.appendChild(cap);
    var pair = make('div', 'lead-pair');
    pair.appendChild(half('Best ten', all.slice(0, 10), valueHead));
    pair.appendChild(half('Bottom ten', all.slice(-10).reverse(), valueHead));
    fig.appendChild(pair);
    var btn = make('button', 'lead-more', more); btn.type = 'button'; btn.addEventListener('click', function () { open(tab); }); fig.appendChild(btn);
    return fig;
  };
  var grid = make('div', 'lead-grid');
  grid.appendChild(figure(1, 'Batters', tables.batters, 'Runs above average per 100', 'batters', 'Full batting record, ranges and checks'));
  grid.appendChild(figure(2, 'Bowlers', tables.bowlers, 'Runs saved above average per 100', 'bowlers', 'Full bowling record, ranges and checks'));
  host.className = 'lead';
  host.replaceChildren(make('h2', 'ci-h', 'Final rankings'), grid,
    make('p', 'ci-note', 'The value column is the player model’s estimate of runs above an average player per 100 balls at high pressure; for bowlers it is runs saved, with wickets counted at their value in runs. Positive is better for both. The order is by Clutch Index, which also counts wins added on pressure balls, so it need not follow this column exactly.'));
};

(function () {
  var num = function (v) { return v === '' || v == null ? NaN : +v; };
  var make = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var byRank = function (rows) { return rows.slice().sort(function (a, b) { return +a.rank - +b.rank; }); };
  var signed = function (x, d) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d == null ? 1 : d); };
  var ordinal = function (n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  var bare = function (name) { return String(name).replace(/\s*\([^)]*\)\s*$/, ''); };
  var Z90 = 1.6449;

  var frame = function (el, h) {
    el.replaceChildren();
    var w = Math.max(280, el.clientWidth || 640);
    var svg = d3.select(el).append('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('height', h);
    var tip = make('div', 'ci-tip'); tip.hidden = true; el.appendChild(tip);
    return { svg: svg, w: w, tip: tip };
  };
  var tipAt = function (tip, el, ev, lines) {
    tip.replaceChildren.apply(tip, lines.filter(function (t) { return t != null && t !== ''; }).map(function (t, i) { return make(i ? 'span' : 'b', null, t); }));
    tip.hidden = false;
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    if (x + tw > r.width) x = Math.max(0, ev.clientX - r.left - tw - 14);
    if (y + th > r.height) y = Math.max(0, r.height - th);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  var section = function (id, title, note) {
    var b = make('div', 'ci-block'); b.id = id;
    b.appendChild(make('h3', 'ci-h3', title));
    if (note) b.appendChild(make('p', 'ci-note', note));
    return b;
  };
  var chart = function (name, label) { var c = make('div', 'ci-chart'); c.dataset.draw = name; c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); return c; };
  var after = function (id, node) { var ref = document.getElementById(id); if (ref) ref.insertAdjacentElement('afterend', node); };
  var table = function (heads, rows) {
    var scroll = make('div', 'ci-scroll'), t = make('table', 'ci-table'), tr = make('tr');
    heads.forEach(function (h) { tr.appendChild(make('th', h[1] ? 'ci-n' : null, h[0])); });
    var thead = make('thead'); thead.appendChild(tr); t.appendChild(thead);
    var tb = make('tbody');
    rows.forEach(function (cells) { var row = make('tr'); cells.forEach(function (c, i) { row.appendChild(make('td', heads[i][1] ? 'ci-n' : null, c)); }); tb.appendChild(row); });
    t.appendChild(tb); scroll.appendChild(t);
    return scroll;
  };
  var pearson = function (xs, ys) {
    var n = xs.length, mx = d3.mean(xs), my = d3.mean(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
    return sxy / Math.sqrt(sxx * syy);
  };

  // ---- rating distributions: ridgeline + quantile table
  var ROLE = {
    bat: { rows: 'batters', who: 'batter', unit: 'Runs above average per 100 balls at high pressure', anchor: 'bat-ranking',
      conv: { key: 'p_sr', high: true, name: 'strike rate under pressure', rate: function (r) { return 'scoring at ' + r.p_sr + ' where an average batter facing the same balls would manage ' + r.p_xsr; } },
      stats: [['Strike rate under pressure', function (r) { return num(r.p_sr); }], ['Boundary balls under pressure, %', function (r) { return num(r.p_bdry_pct); }], ['Dot balls under pressure, %', function (r) { return num(r.p_dot_pct); }], ['Strike rate in calmer balls', function (r) { return num(r.calm_sr); }]] },
    bowl: { rows: 'bowlers', who: 'bowler', unit: 'Runs saved above average per 100 balls at high pressure', anchor: 'bowl-ranking',
      conv: { key: 'p_econ', high: false, name: 'economy under pressure', rate: function (r) { return 'conceding ' + r.p_econ + ' an over where an average bowler on the same balls would concede ' + r.p_xecon; } },
      stats: [['Economy under pressure', function (r) { return num(r.p_econ); }], ['Dot balls under pressure, %', function (r) { return num(r.p_dot_pct); }], ['Wickets per 100 pressure balls', function (r) { return 100 * num(r.p_wkts) / num(r.p_balls); }], ['Economy in calmer balls', function (r) { return num(r.calm_econ); }]] }
  };
  var topTen = function (rows) { return byRank(rows).slice(0, 10).map(function (r) { var mu = num(r.est100), sd = num(r.est_sd100); return { r: r, mu: mu, sd: sd, lo: mu - Z90 * sd, hi: mu + Z90 * sd }; }); };

  var drawRidge = function (el, rows, unit) {
    var top = topTen(rows), rh = 30, amp = rh * 2.1, mt = Math.round(amp - rh + 22), mb = 40;
    var f = frame(el, mt + rh * top.length + mb), ml = Math.min(160, Math.round(f.w * 0.36)), mr = 16;
    var x = d3.scaleLinear().domain([d3.min(top, function (d) { return d.mu - 3 * d.sd; }), d3.max(top, function (d) { return d.mu + 3 * d.sd; })]).range([ml, f.w - mr]);
    var peak = d3.max(top, function (d) { return 1 / d.sd; }), bottom = mt + rh * top.length;
    x.ticks(f.w < 480 ? 4 : 7).forEach(function (t) {
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', x(t)).attr('x2', x(t)).attr('y1', mt - 6).attr('y2', bottom);
      f.svg.append('text').attr('class', 'ci-t').attr('x', x(t)).attr('y', bottom + 16).attr('text-anchor', 'middle').text(t);
    });
    f.svg.append('text').attr('class', 'ci-t').attr('x', (ml + f.w - mr) / 2).attr('y', bottom + 34).attr('text-anchor', 'middle').text(unit);
    var cut = top[top.length - 1].mu;
    f.svg.append('line').attr('class', 'ci-ref').attr('x1', x(cut)).attr('x2', x(cut)).attr('y1', 16).attr('y2', bottom);
    f.svg.append('text').attr('class', 'ci-t').attr('x', x(cut) + 5).attr('y', 12).text('10th-ranked rating');
    top.forEach(function (d, i) {
      var base = mt + rh * (i + 1), pts = d3.range(61).map(function (k) {
        var v = d.mu - 3 * d.sd + k * d.sd / 10, z = (v - d.mu) / d.sd;
        return [x(v), base - Math.exp(-0.5 * z * z) / d.sd / peak * amp];
      });
      var line = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
      f.svg.append('path').attr('d', line + 'L' + pts[60][0].toFixed(1) + ',' + base + 'L' + pts[0][0].toFixed(1) + ',' + base + 'Z').style('fill', 'var(--ci-s0)').style('fill-opacity', 0.26);
      f.svg.append('path').attr('d', line).style('fill', 'none').style('stroke', 'var(--ci-s0)').style('stroke-width', 1.5);
      f.svg.append('line').attr('x1', x(d.mu)).attr('x2', x(d.mu)).attr('y1', base).attr('y2', base - 1 / d.sd / peak * amp).style('stroke', 'var(--ci-s0)').style('stroke-width', 1);
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', ml).attr('x2', f.w - mr).attr('y1', base).attr('y2', base);
      f.svg.append('text').attr('class', i === 0 ? 'ci-tt' : 'ci-t').attr('x', ml - 8).attr('y', base - 5).attr('text-anchor', 'end').text(d.r.name);
    });
    f.svg.append('g').selectAll('rect').data(top).join('rect').attr('x', 0).attr('width', f.w).attr('y', function (d, i) { return mt + rh * i; }).attr('height', rh).style('fill', 'transparent')
      .on('pointermove', function (ev, d) { tipAt(f.tip, el, ev, [d.r.rank + '. ' + d.r.name, 'Median ' + signed(d.mu), '90% range ' + signed(d.lo) + ' to ' + signed(d.hi), 'Rank range ' + d.r.rank_lo + '–' + d.r.rank_hi]); })
      .on('pointerleave', function () { f.tip.hidden = true; });
  };

  var ratingBlock = function (tables, key) {
    var R = ROLE[key], rows = tables[R.rows], top = topTen(rows), cut = top[top.length - 1].mu;
    var clear = top.slice(0, -1).filter(function (d) { return d.lo > cut; });
    var title = clear.length === 0 ? 'No top-ten ' + R.who + ' is clear of tenth place at the 90% level'
      : clear.length === 1 ? 'Only ' + clear[0].r.name + ' is clear of tenth place at the 90% level'
      : clear.length + ' of the top ten ' + R.who + 's are clear of tenth place at the 90% level';
    var b = section(key + '-ridge', title, 'Each curve is one player’s rating as the model sees it: centred on the estimate, as wide as its uncertainty. Where a curve crosses the dashed line, the data cannot separate that player from the 10th-ranked one. Point at a row for its figures.');
    b.appendChild(chart('ridge-' + key, 'Rating distributions for the top ten ' + R.who + 's'));
    var cap = make('p', 'vw-cap'); cap.appendChild(make('b', null, 'Table ' + (key === 'bat' ? 3 : 4) + '. ')); cap.appendChild(document.createTextNode('Quantiles of the rating for the top ten ' + R.who + 's, runs per 100 balls against an average ' + R.who)); b.appendChild(cap);
    b.appendChild(table([['#', 1], [key === 'bat' ? 'Batter' : 'Bowler', 0], ['5%', 1], ['50%', 1], ['95%', 1], ['Interval width', 1], ['Rank, 90% range', 1]],
      top.map(function (d) { return [d.r.rank, d.r.name, signed(d.lo), signed(d.mu), signed(d.hi), (d.hi - d.lo).toFixed(1), d.r.rank_lo + '–' + d.r.rank_hi]; })));
    after(R.anchor, b);
    dash.draw('ridge-' + key, function (el) { drawRidge(el, rows, R.unit); });
    return b;
  };

  // ---- the index against the conventional statistic
  var agreement = function (rows, conv) {
    var pts = rows.map(function (r) { return { r: r, v: num(r[conv.key]), rank: num(r.rank) }; }).filter(function (d) { return !isNaN(d.v); });
    pts.sort(function (a, b) { return conv.high ? b.v - a.v : a.v - b.v; });
    pts.forEach(function (d, i) { d.conv = i + 1; d.gap = d.conv - d.rank; });
    var sorted = pts.slice().sort(function (a, b) { return b.gap - a.gap; });
    return { pts: pts, n: pts.length, rho: pearson(pts.map(function (d) { return d.conv; }), pts.map(function (d) { return d.rank; })), up: sorted.slice(0, 2), down: sorted.slice(-2).reverse() };
  };
  var drawAgree = function (el, A, conv) {
    var w0 = Math.max(280, el.clientWidth || 640), h = Math.round(Math.min(460, w0 * 0.78)) + 20;
    var f = frame(el, h), ml = 46, mr = 16, mt = 14, mb = 44;
    var x = d3.scaleLinear().domain([1, A.n]).range([ml, f.w - mr]), y = d3.scaleLinear().domain([1, A.n]).range([mt, h - mb]);
    [1, 25, 50, 75, 100].filter(function (t) { return t <= A.n; }).forEach(function (t) {
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', x(t)).attr('x2', x(t)).attr('y1', mt).attr('y2', h - mb);
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', ml).attr('x2', f.w - mr).attr('y1', y(t)).attr('y2', y(t));
      f.svg.append('text').attr('class', 'ci-t').attr('x', x(t)).attr('y', h - mb + 16).attr('text-anchor', 'middle').text(t);
      f.svg.append('text').attr('class', 'ci-t').attr('x', ml - 8).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t);
    });
    f.svg.append('line').attr('class', 'ci-ref').attr('x1', x(1)).attr('y1', y(1)).attr('x2', x(A.n)).attr('y2', y(A.n));
    f.svg.append('text').attr('class', 'ci-t').attr('x', (ml + f.w - mr) / 2).attr('y', h - 6).attr('text-anchor', 'middle').text('Rank on ' + conv.name + ' alone');
    f.svg.append('text').attr('class', 'ci-t').attr('transform', 'translate(12,' + (mt + h - mb) / 2 + ') rotate(-90)').attr('text-anchor', 'middle').text('Clutch Index rank');
    var named = A.up.concat(A.down);
    f.svg.append('g').selectAll('circle').data(A.pts).join('circle').attr('cx', function (d) { return x(d.conv); }).attr('cy', function (d) { return y(d.rank); })
      .attr('r', function (d) { return d.rank <= 10 ? 4.5 : 3.2; })
      .style('fill', function (d) { return d.rank <= 10 ? 'var(--ci-s0)' : 'var(--chart-muted)'; }).style('stroke', 'var(--color-bg)').style('stroke-width', 1);
    named.forEach(function (d) {
      var right = x(d.conv) < f.w - 150;
      f.svg.append('circle').attr('cx', x(d.conv)).attr('cy', y(d.rank)).attr('r', 6.5).style('fill', 'none').style('stroke', 'var(--color-fg)').style('stroke-width', 1.2);
      f.svg.append('text').attr('class', 'ci-tt').attr('x', x(d.conv) + (right ? 10 : -10)).attr('y', y(d.rank) + 4).attr('text-anchor', right ? 'start' : 'end').text(d.r.name);
    });
    f.svg.append('g').selectAll('circle').data(A.pts).join('circle').attr('cx', function (d) { return x(d.conv); }).attr('cy', function (d) { return y(d.rank); }).attr('r', 9).style('fill', 'transparent')
      .on('pointermove', function (ev, d) { tipAt(f.tip, el, ev, [d.r.name, 'Clutch Index rank ' + d.rank, 'Rank on ' + conv.name + ' ' + d.conv + ' (' + d.r[conv.key] + ')']); })
      .on('pointerleave', function () { f.tip.hidden = true; });
  };
  var agreeBlock = function (tables, key, anchor) {
    var R = ROLE[key], rows = tables[R.rows], A = agreement(rows, R.conv), up = A.up[0], down = A.down[0];
    var rho = Math.round(A.rho * 100) / 100, word = rho >= 0.85 ? 'closely' : rho >= 0.6 ? 'only in part' : 'weakly';
    var b = section(key + '-agree', 'The Clutch Index and raw ' + R.conv.name + ' agree ' + word + ' on the order (rank correlation ' + A.rho.toFixed(2) + ')',
      'Every eligible ' + R.who + '. Across: rank on ' + R.conv.name + ' alone. Down: rank on the Clutch Index. On the dashed line the two agree; the top ten are filled, and the four largest disagreements are named.');
    b.appendChild(chart('agree-' + key, 'Clutch Index rank against rank on ' + R.conv.name + ' for every eligible ' + R.who));
    b.appendChild(make('p', 'ci-p', up.r.name + ' is ' + ordinal(up.conv) + ' of ' + A.n + ' on ' + R.conv.name + ' but ' + ordinal(up.rank) + ' on the index, ' + R.conv.rate(up.r) + '. ' +
      down.r.name + ' goes the other way, ' + ordinal(down.conv) + ' on the raw figure and ' + ordinal(down.rank) + ' on the index, ' + R.conv.rate(down.r) + '. The index credits how hard the balls were, what the match needed and how sure the sample is; a raw rate does none of that.'));
    var est = rows.map(function (r) { return num(r.est100); });
    var cap = make('p', 'vw-cap'); cap.appendChild(make('b', null, 'Table ' + (key === 'bat' ? 5 : 6) + '. ')); cap.appendChild(document.createTextNode('Correlation of the pressure rating with conventional statistics, all ' + A.n + ' eligible ' + R.who + 's')); b.appendChild(cap);
    b.appendChild(table([['Conventional statistic', 0], ['Correlation with the rating', 1]], R.stats.map(function (s) { return [s[0], signed(pearson(rows.map(s[1]), est), 2)]; })));
    after(anchor, b);
    dash.draw('agree-' + key, function (el) { drawAgree(el, A, R.conv); });
  };

  // ---- model comparison as dot charts
  var drawDots = function (el, items, cfg) {
    var rh = 42, mt = 6, mb = 38, f = frame(el, mt + rh * items.length + mb), ml = 6, mr = 46;
    var vals = []; items.forEach(function (it) { it.values.forEach(function (v) { if (!isNaN(v)) vals.push(v); }); });
    var ext = d3.extent(vals), pad = (ext[1] - ext[0]) * 0.12 || 1;
    var x = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([ml + 8, f.w - mr]), bottom = mt + rh * items.length;
    x.ticks(f.w < 480 ? 4 : 6).forEach(function (t) {
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', x(t)).attr('x2', x(t)).attr('y1', mt).attr('y2', bottom);
      f.svg.append('text').attr('class', 'ci-t').attr('x', x(t)).attr('y', bottom + 15).attr('text-anchor', 'middle').text(cfg.fmt(t));
    });
    f.svg.append('text').attr('class', 'ci-t').attr('x', (ml + f.w - mr) / 2).attr('y', bottom + 33).attr('text-anchor', 'middle').text(cfg.axis);
    items.forEach(function (it, i) {
      var y0 = mt + rh * i, cy = y0 + 29;
      f.svg.append('text').attr('class', it.pick ? 'ci-tt' : 'ci-t').attr('x', ml).attr('y', y0 + 14).text(it.label);
      f.svg.append('line').attr('class', 'ci-grid').attr('x1', ml).attr('x2', f.w - mr).attr('y1', cy).attr('y2', cy);
      var shown = it.values.map(function (v, k) { return { v: v, k: k }; }).filter(function (d) { return !isNaN(d.v); });
      var hiV = d3.max(shown, function (d) { return d.v; });
      shown.forEach(function (d) {
        var col = 'var(--ci-s' + d.k + ')', solid = it.pick || it.values.length > 1;
        f.svg.append('circle').attr('cx', x(d.v)).attr('cy', cy).attr('r', 6).style('fill', solid ? col : 'var(--color-bg)').style('stroke', col).style('stroke-width', 2).style('fill-opacity', it.pick || it.values.length === 1 ? 1 : 0.55);
        var right = shown.length === 1 || d.v === hiV;
        f.svg.append('text').attr('class', 'ci-tv').attr('x', x(d.v) + (right ? 11 : -11)).attr('y', cy + 4).attr('text-anchor', right ? 'start' : 'end').text(cfg.fmt(d.v));
      });
    });
    f.svg.append('g').selectAll('rect').data(items).join('rect').attr('x', 0).attr('width', f.w).attr('y', function (d, i) { return mt + rh * i; }).attr('height', rh).style('fill', 'transparent')
      .on('pointermove', function (ev, d) { tipAt(f.tip, el, ev, [d.label].concat(d.lines)); })
      .on('pointerleave', function () { f.tip.hidden = true; });
  };
  var order = function (rows) { return rows.slice().sort(function (a, b) { return num(a.order) - num(b.order); }); };
  var legend = function (names) { var l = make('div', 'ci-legend'); names.forEach(function (n, k) { var s = make('span'), i = make('i', 'ci-sw'); i.dataset.sw = k; i.style.background = 'var(--ci-s' + k + ')'; s.appendChild(i); s.appendChild(document.createTextNode(n)); l.appendChild(s); }); return l; };

  var modelBlocks = function (tables) {
    // ball models
    var bm = order(tables.ball_models), best = bm.slice().sort(function (a, b) { return num(a.unseen_matches) - num(b.unseen_matches); })[0];
    var home = document.getElementById('ball-models');
    if (home) {
      var cap = make('p', 'vw-cap'); cap.appendChild(make('b', null, bare(best.model) + ' predicts the next ball best: log-loss ' + best.unseen_matches + ' on matches it had not seen.'));
      home.appendChild(cap);
      home.appendChild(make('p', 'ci-note', 'Each dot is one ball model scored on matches held out of its training; further left is better. The filled dot is the model the ratings use.'));
      home.appendChild(chart('cmp-ball', 'Log-loss of each ball model on unseen matches'));
    }
    dash.draw('cmp-ball', function (el) {
      drawDots(el, bm.map(function (r) { return { label: r.model, pick: /\(used\)/.test(r.model), values: [num(r.unseen_matches)], lines: ['Unseen matches ' + r.unseen_matches, r.season_2026 ? 'Season 2026 held out ' + r.season_2026 : 'Season 2026 hold-out not run for the blend'] }; }),
        { axis: 'Log-loss on unseen matches (lower is better)', fmt: d3.format('.3f') });
    });
    // candidate ratings
    var va = order(tables.validity), maxB = d3.max(va, function (r) { return num(r.batters); }), minB = d3.min(va, function (r) { return num(r.batters); });
    var bestB = va.filter(function (r) { return num(r.batters) === maxB; }).map(function (r) { return bare(r.rating); }), worstB = va.filter(function (r) { return num(r.batters) === minB; })[0];
    var b2 = section('cmp-rating', (bestB.length > 1 ? bestB.join(' and ') + ' tie for best' : bestB[0] + ' is best') + ' at predicting batters’ unseen pressure performance (' + maxB.toFixed(2) + '); ' + bare(worstB.rating).toLowerCase() + ' is weakest (' + minB.toFixed(2) + ')',
      'Each candidate rating was built on half the matches and compared with what players did under pressure in the other half. Further right is better.');
    b2.appendChild(legend(['Batters', 'Bowlers']));
    b2.appendChild(chart('cmp-rating', 'How well each candidate rating predicts pressure performance in unseen matches'));
    after('lift-finding', b2);
    dash.draw('cmp-rating', function (el) {
      drawDots(el, va.map(function (r) { return { label: r.rating, pick: /\(final\)/.test(r.rating), values: [num(r.batters), num(r.bowlers)], lines: ['Batters ' + r.batters, 'Bowlers ' + r.bowlers] }; }),
        { axis: 'Correlation with pressure performance in unseen matches', fmt: d3.format('.2f') });
    });
    // pressure definitions
    var de = order(tables.definitions), bestD = de.slice().sort(function (a, b) { return num(b.tight_finishes) - num(a.tight_finishes); })[0];
    var b3 = section('cmp-def', bare(bestD.definition) + ' picks out tight finishes best (' + bestD.tight_finishes + ', where 0.5 is chance)',
      'Each dot is one candidate definition of pressure, scored on how well it ranks the last three overs of chases that went to the final over. Further right is better; the filled dot is the definition used.');
    b3.appendChild(chart('cmp-def', 'Tight-finish score for each candidate definition of pressure'));
    after('definitions', b3);
    dash.draw('cmp-def', function (el) {
      drawDots(el, de.map(function (r) { return { label: r.definition, pick: /\(chosen\)/.test(r.definition), values: [num(r.tight_finishes)], lines: ['Tight finishes ' + r.tight_finishes, 'Run-outs ' + r.runouts + '×, wides and no-balls ' + r.extras + '×, full tosses ' + r.fulltosses + '×', 'Dead chases at percentile ' + r.dead_chase_pct] }; }),
        { axis: 'Tight-finish score (0.5 is chance, 1.0 is perfect)', fmt: d3.format('.3f') });
    });
  };

  window.renderViews = function (tables, flag) {
    var run = function (name, fn) { try { fn(); } catch (e) { flag(name + ': ' + e.message); } };
    ['bat', 'bowl'].forEach(function (key) {
      run('rating-' + key, function () { var b = ratingBlock(tables, key); run('agree-' + key, function () { agreeBlock(tables, key, b.id); }); });
    });
    run('models', function () { modelBlocks(tables); });
  };
})();

(function () {
  var problems = [], drawings = {}, tables = {};
  var flag = function (m) { problems.push(m); document.documentElement.dataset.errors = problems.join(' | '); if (window.console) console.error(m); };
  window.addEventListener('error', function (e) { flag('error: ' + e.message); });

  var drawOne = function (name) {
    document.querySelectorAll('[data-draw="' + name + '"]').forEach(function (el) {
      if (el.closest('[hidden]')) return;
      try { if (drawings[name]) drawings[name](el); } catch (e) { flag(name + ': ' + e.message); }
    });
  };
  var drawAll = function () { Object.keys(drawings).forEach(drawOne); };

  window.dash = {
    colors: ['var(--ci-s0)', 'var(--ci-s1)', 'var(--ci-s2)'],
    data: function (id) { return tables[id] ? { status: 'ok', data: tables[id] } : { status: 'missing', data: [] }; },
    draw: function (name, fn) { if (fn) drawings[name] = fn; else drawOne(name); },
    onData: function (fn) { fn(); },
    setLink: function (id) { try { history.replaceState(null, '', '#' + id); } catch (e) {} },
    params: function () { return {}; }, setParams: function () {}, resetParams: function () {}, calc: function () {}, loader: function () {}, refresh: function () {}
  };

  var CSV = ['summary', 'tiers', 'heat', 'moments', 'match_balls', 'definitions', 'notes', 'splits', 'player_matches', 'player_moments', 'styles', 'lift_test', 'validity', 'calibration', 'ball_models', 'reranks'].concat(window.extraTables || []);
  var JSONS = ['batters', 'bowlers'];
  var msg = document.getElementById('site-msg'), root = document.getElementById('dash-root');
  if (!window.d3) { msg.textContent = 'The charts could not load. Check your connection and reload.'; return; }

  Promise.all(CSV.map(function (n) { return d3.csv('data/' + n + '.csv').then(function (r) { tables[n] = r; }); })
    .concat(JSONS.map(function (n) { return d3.json('data/' + n + '.json').then(function (r) { tables[n] = r.rows; }); })))
    .then(function () {
      root.hidden = false; msg.hidden = true;
      if (window.renderLanding) { try { window.renderLanding(tables); } catch (e) { flag('landing: ' + e.message); } }
      if (window.renderViews) { try { window.renderViews(tables, flag); } catch (e) { flag('views: ' + e.message); } }
      var s = document.createElement('script'); s.src = 'app.js';
      s.onload = function () {
        drawAll();
        new MutationObserver(function (list) {
          if (list.some(function (m) { return !m.target.closest('[data-draw]'); })) drawAll();
        }).observe(root, { attributes: true, attributeFilter: ['hidden'], subtree: true });
        var timer = null, width = window.innerWidth;
        window.addEventListener('resize', function () {
          if (window.innerWidth === width) return;
          width = window.innerWidth; clearTimeout(timer); timer = setTimeout(drawAll, 150);
        });
        document.documentElement.dataset.ready = '1';
      };
      s.onerror = function () { flag('app.js failed to load'); };
      document.body.appendChild(s);
    })
    .catch(function (e) { flag('data: ' + e.message); msg.textContent = 'The data could not load. Reload the page to try again.'; });
})();
