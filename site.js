window.renderLanding = function (tables) {
  var host = document.getElementById('landing');
  if (!host) return;
  var make = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var topTen = function (rows) { return rows.slice().sort(function (a, b) { return +a.rank - +b.rank; }).slice(0, 10); };
  var open = function (tab) {
    var b = document.querySelector('.ci-tab[data-tab="' + tab + '"]');
    if (b) { b.click(); document.getElementById('tabs').scrollIntoView({ block: 'start' }); }
  };
  var figure = function (no, title, who, rows, tab, more) {
    var fig = make('figure', 'lead-fig');
    var cap = make('figcaption', 'lead-cap'); cap.appendChild(make('b', null, 'Table ' + no + '. ')); cap.appendChild(document.createTextNode(title)); fig.appendChild(cap);
    var scroll = make('div', 'ci-scroll'), table = make('table', 'ci-table lead-table');
    var head = make('tr');
    [['#', 1], [who, 0], ['Clutch Index', 1], ['Rank range', 1], ['Chance of top 10', 1]].forEach(function (h) { head.appendChild(make('th', h[1] ? 'ci-n' : null, h[0])); });
    var thead = make('thead'); thead.appendChild(head); table.appendChild(thead);
    var tb = make('tbody');
    topTen(rows).forEach(function (r) {
      var tr = make('tr');
      tr.appendChild(make('td', 'ci-n', r.rank));
      tr.appendChild(make('td', 'lead-name', r.name));
      tr.appendChild(make('td', 'ci-n lead-idx', r.clutch));
      tr.appendChild(make('td', 'ci-n', r.rank_lo + '–' + r.rank_hi));
      tr.appendChild(make('td', 'ci-n', r.top10_pct + '%'));
      tb.appendChild(tr);
    });
    table.appendChild(tb); scroll.appendChild(table); fig.appendChild(scroll);
    var btn = make('button', 'lead-more', more); btn.type = 'button'; btn.addEventListener('click', function () { open(tab); }); fig.appendChild(btn);
    return fig;
  };
  var grid = make('div', 'lead-grid');
  grid.appendChild(figure(1, 'Top 10 batters under pressure', 'Batter', tables.batters, 'batters', 'Full batting record'));
  grid.appendChild(figure(2, 'Top 10 bowlers under pressure', 'Bowler', tables.bowlers, 'bowlers', 'Full bowling record'));
  host.className = 'lead';
  host.replaceChildren(make('h2', 'ci-h', 'Final rankings'), grid,
    make('p', 'ci-note', 'Clutch Index is a 0 to 100 percentile among eligible players. Rank range is where the rank falls in 90% of draws from the player model; chance of top 10 comes from the same draws.'));
};

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

  var CSV = ['summary', 'tiers', 'heat', 'moments', 'match_balls', 'definitions', 'notes', 'splits', 'player_matches', 'player_moments', 'styles', 'lift_test', 'validity', 'calibration', 'ball_models', 'reranks'];
  var JSONS = ['batters', 'bowlers'];
  var msg = document.getElementById('site-msg'), root = document.getElementById('dash-root');
  if (!window.d3) { msg.textContent = 'The charts could not load. Check your connection and reload.'; return; }

  Promise.all(CSV.map(function (n) { return d3.csv('data/' + n + '.csv').then(function (r) { tables[n] = r; }); })
    .concat(JSONS.map(function (n) { return d3.json('data/' + n + '.json').then(function (r) { tables[n] = r.rows; }); })))
    .then(function () {
      root.hidden = false; msg.hidden = true;
      if (window.renderLanding) { try { window.renderLanding(tables); } catch (e) { flag('landing: ' + e.message); } }
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
