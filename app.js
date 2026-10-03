import {demo, validate, shortest, plan, clock, minutes} from './engine.mjs';
const $ = s => document.querySelector(s)
  , esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]))
  , fmt = n => Number.isFinite(n) ? n.toFixed(1) : '—'
  , colors = ['#16745c', '#e6a526', '#7160c5', '#2193b0', '#ca647d'];
let data = demo(), page = 'routes', selected = 0, mode = 'priority', scenario = 'Morning demo', labMode = 'dijkstra', from = 'S', to = 'A', step = 0, decision = 0, results, baseline, timer;
try {
    const saved = localStorage.getItem('buswise-v1');
    if (saved) {
        data = validate(JSON.parse(saved));
        scenario = 'Saved network';
    }
} catch {}
const name = id => data.nodes.find(n => n.id === id)?.name || id;
function calculate() {
    results = plan(data, mode);
    baseline = plan(data, 'distance');
    selected = Math.min(selected, Math.max(results.routes.length - 1, 0));
    decision = 0;
}
calculate();
const icon = (n) => ({
    bus: '▣',
    routes: '⌁',
    network: '⊞',
    lab: '◇',
    guide: '☷'
}[n] || '•');
function notify(msg) {
    $('#toast').textContent = msg;
    $('#toast').classList.add('show');
    clearTimeout(notify.t);
    notify.t = setTimeout( () => $('#toast').classList.remove('show'), 3500);
}
function persist() {
    try {
        localStorage.setItem('buswise-v1', JSON.stringify(data));
    } catch {
        notify('Browser storage unavailable. Export your scenario to keep it.');
    }
}
function render() {
    const total = data.nodes.reduce( (a, n) => a + n.students, 0);
    $('#app').innerHTML = `<aside class="sidebar"><a class="brand" href="#" aria-label="mrvtc.ganeshkalmoori.hackathon home"><span class="brand-icon">${icon('bus')}</span><span class="brand-name">mrvtc.<wbr>ganeshkalmoori.<wbr>hackathon</span></a><div class="workspace">TRANSPORT WORKSPACE</div><nav>${[['routes', 'Route planner'], ['network', 'Stops & fleet'], ['lab', 'Algorithm lab'], ['guide', 'Project guide']].map( ([id,label]) => `<button class="nav ${page === id ? 'active' : ''}" data-page="${id}"><span>${icon(id)}</span>${label}${id === 'routes' ? `<small>${results.routes.length}</small>` : ''}</button>`).join('')}</nav><div class="side-bottom"><span class="tiny-label">BUILT TO EXPLAIN</span><h3>Every turn.<br>Every decision.</h3><p>Dijkstra · BFS · Greedy</p><div class="side-rule"></div><small>Problem 32 / DAA prototype</small></div></aside><div class="shell"><header><div class="crumb">Workspace <span>/</span> ${page === 'routes' ? 'Route planner' : page === 'network' ? 'Stops & fleet' : page === 'lab' ? 'Algorithm lab' : 'Project guide'}</div><div class="header-right"><span class="demo-badge">SIMULATED NETWORK</span><button class="quiet" id="share">Share project</button></div></header><main><div class="page-heading"><div><div class="eyebrow">SCHOOL TRANSPORT, SIMPLIFIED</div><h1>${page === 'routes' ? 'A smarter way to school.' : page === 'network' ? 'Build your pickup network.' : page === 'lab' ? 'Look inside the algorithm.' : 'Ready for the demonstration.'}</h1><p>${page === 'routes' ? 'Plan the pickups. Balance the buses. Understand every route.' : page === 'network' ? 'Edit stops, road distances and resources. Every change updates the plan.' : page === 'lab' ? 'Follow the search, compare paths and inspect each greedy choice.' : 'The model, the trade-offs and a clear story for your presentation.'}</p></div><div class="heading-actions"><button class="secondary" id="export">Export scenario</button><button class="primary" id="run">${icon('routes')} Run planner</button></div></div><div class="toolbar"><div><span class="label">SCENARIO</span><select id="scenario" aria-label="Choose scenario"><option value="" selected>${esc(scenario)}</option><option value="demo">Morning demo · balanced fleet</option><option value="capacity">Capacity challenge</option><option value="disconnected">Road closure challenge</option><option value="empty">Empty network</option></select></div><div class="toolbar-end"><span>${data.nodes.length - 1} stops</span><span>${data.edges.length} roads</span><span>${data.buses.length} buses</span><button id="import" class="text-button">Import JSON</button></div></div>${page === 'routes' ? routesView(total) : page === 'network' ? networkView() : page === 'lab' ? labView() : guideView()}</main><footer><span>mrvtc.ganeshkalmoori.hackathon / Algorithm-powered school transport</span><span>Illustrative roads · Local browser storage · No student identities</span></footer></div>`;
    bind();
}
function stat(label, value, sub, accent='') {
    return `<div class="stat ${accent}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;
}
function routesView(total) {
    const r = results.routes[selected]
      , delta = baseline.distance - results.distance;
    return `<div class="stats">${stat('TOTAL ROUTE DISTANCE', `${fmt(results.distance)} <small>km</small>`, `${delta >= 0 ? '−' : '+'}${fmt(Math.abs(delta))} km vs distance-first`)}${stat('STUDENTS ASSIGNED', `${results.served}<small> / ${total}</small>`, results.unassigned.length ? `${results.unassigned.length} stops need attention` : 'Every pickup is accounted for', results.unassigned.length ? 'warn' : '')}${stat('FLEET UTILIZATION', `${Math.round(results.served / data.buses.reduce( (a, b) => a + b.capacity, 0) * 100)}<small>%</small>`, `${results.routes.length} of ${data.buses.length} buses used`)}${stat('SCHOOL ARRIVAL', results.routes.length ? clock(Math.max(...results.routes.map(r => r.time))) : '—', results.late ? `${results.late} buses past ${data.settings.deadline}` : `Deadline ${data.settings.deadline} · estimated`, results.late ? 'warn' : '')}</div>${warnings()}<div class="planner-grid"><section class="panel map-panel"><div class="panel-heading"><div><h2>Pickup network</h2><p>Click a stop to inspect it. Distances in kilometers.</p></div><span class="pill">${esc(scenario)}</span></div><div class="map-wrap">${map(r?.path || [])}</div><div class="map-footer"><span><i style="background:#172c28"></i> School</span><span><i style="background:#fff;border:2px solid #8d9994"></i> Pickup stop</span><span><i style="background:${colors[selected % colors.length]}"></i> Selected bus</span><span class="map-note">Schematic · not to scale</span></div></section><section class="panel route-panel"><div class="panel-heading"><div><h2>Your routes</h2><p>${results.routes.length} routes, one school.</p></div><span class="pill green">${mode === 'priority' ? 'Priority-aware' : 'Distance-first'}</span></div><div class="route-list">${results.routes.length ? results.routes.map( (r, i) => `<button class="route-card ${i === selected ? 'chosen' : ''}" data-route="${i}" style="--route:${colors[i % colors.length]}"><div class="route-card-top"><span class="bus-tag">${icon('bus')} BUS ${esc(r.id)}</span><b>${fmt(r.distance)} <small>km</small></b></div><div class="route-stops">${r.visits.map(v => esc(name(v.id))).join(' <span>·</span> ')}</div><div class="capacity-track"><i style="width:${r.load / r.capacity * 100}%"></i></div><div class="route-meta"><span>${r.load}/${r.capacity} seats</span><span>${r.visits.length} pickups</span><span>${clock(r.time)} arrival</span></div></button>`).join('') : '<div class="empty">No routes yet.<br>Add connected stops with students and enough bus capacity.</div>'}</div><div class="strategy"><label for="strategy">Planning strategy</label><select id="strategy"><option value="priority" ${mode === 'priority' ? 'selected' : ''}>Priority-aware greedy</option><option value="distance" ${mode === 'distance' ? 'selected' : ''}>Distance-first greedy</option></select><p>Shortest road paths with capacity-safe pickup assignments.</p></div></section></div>${r ? `<section class="panel itinerary"><div class="panel-heading"><div><h2>Bus ${esc(r.id)} · pickup itinerary</h2><p>Departure ${data.settings.start} · ${data.settings.speed} km/h average · ${data.settings.dwell} min per pickup</p></div><button class="text-button" id="report">Download route report</button></div><div class="timeline"><div class="timeline-stop school"><span class="stop-dot">S</span><b>${data.settings.start}</b><span>School departure</span></div>${r.visits.map( (v, i) => `<div class="timeline-stop"><span class="stop-dot" style="background:${colors[selected % colors.length]}">${i + 1}</span><b>${clock(v.arrival)}</b><span>${esc(name(v.id))}</span><small>${v.students} students · ${['', 'Normal', 'Medium', 'High'][v.priority]}</small></div>`).join('')}<div class="timeline-stop school"><span class="stop-dot">S</span><b>${clock(r.time)}</b><span>School arrival</span><small>${r.late ? `${fmt(r.late)} min late` : 'Within deadline'}</small></div></div><details><summary>See actual road paths, including transit stops</summary>${r.legs.map(l => `<p><b>${esc(l.from)} → ${esc(l.to)}</b> · ${l.path.map(esc).join(' → ')} · ${fmt(l.distance)} km</p>`).join('')}<p class="muted">Passing a stop does not pick up its students. Only scheduled pickups increase the load.</p></details></section>` : ''}<div class="bottom-grid"><section class="panel"><div class="panel-heading"><div><h2>Strategy comparison</h2><p>Same network, same fleet, different local choices.</p></div></div>${comparison()}</section><section class="insight"><span class="eyebrow">WHY THIS ROUTE?</span><h2>Good decisions should<br>be easy to follow.</h2><p>The planner uses Dijkstra for road distances, then chooses the best feasible next pickup. Priorities can favor earlier collection over fewer kilometers.</p><button class="secondary" data-page="lab">Explore the algorithm</button></section></div>`;
}
function warnings() {
    return results.unassigned.length || results.late ? `<div class="alert" role="status"><b>Plan needs attention.</b> ${results.unassigned.map(u => `${esc(name(u.id))}: ${u.reason}.`).join(' ')} ${results.late ? `${results.late} bus(es) miss the arrival deadline. Increase speed within realistic limits, change the fleet, or start earlier.` : ''}</div>` : '';
}
function comparison() {
    const p = mode === 'priority' ? results : plan(data, 'priority');
    return `<div class="table-wrap"><table><thead><tr><th>Strategy</th><th>Distance</th><th>Assigned</th><th>Priority-weighted wait¹</th><th>Late buses</th></tr></thead><tbody>${[p, baseline].map(r => `<tr><td><b>${r.mode === 'priority' ? 'Priority-aware' : 'Distance-first'}</b></td><td>${fmt(r.distance)} km</td><td>${r.served}/${r.total}</td><td>${fmt(r.weightedWait)} min</td><td>${r.late}</td></tr>`).join('')}</tbody></table></div><p class="table-note">¹ Mean minutes to pickup, weighted by student count × priority, for assigned students only. Compare coverage before distance. Greedy methods do not guarantee a global optimum.</p>`;
}
function map(path=[], visited=[]) {
    const routeColor = page === 'lab' ? '#16745c' : colors[selected % colors.length]
      , nodes = Object.fromEntries(data.nodes.map(n => [n.id, n]));
    return `<svg viewBox="0 0 820 550" role="img" aria-label="Interactive school road graph, selected path highlighted"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.75" fill="#b6c7c0" opacity=".45"/></pattern></defs><rect width="820" height="550" fill="#f1f5f1"/><rect width="820" height="550" fill="url(#grid)"/><text x="750" y="42" fill="#73847d" font-size="14">N ↑</text>${data.edges.map( ([a,b,w]) => {
        const n = nodes[a]
          , m = nodes[b];
        return `<line x1="${n.x}" y1="${n.y}" x2="${m.x}" y2="${m.y}" stroke="#d0dad4" stroke-width="7" stroke-linecap="round"/><line x1="${n.x}" y1="${n.y}" x2="${m.x}" y2="${m.y}" stroke="#fff" stroke-width="3"/>`;
    }
    ).join('')}${path.slice(1).map( (id, i) => {
        const a = nodes[path[i]]
          , b = nodes[id];
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${routeColor}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
    }
    ).join('')}${data.edges.map( ([a,b,w]) => {
        const n = nodes[a]
          , m = nodes[b]
          , x = (n.x + m.x) / 2
          , y = (n.y + m.y) / 2;
        return `<rect x="${x - 17}" y="${y - 10}" width="34" height="20" rx="5" fill="#f9fbf8"/><text x="${x}" y="${y + 5}" text-anchor="middle" fill="#697870" font-size="13">${w}</text>`;
    }
    ).join('')}${data.nodes.map(n => {
        const active = path.includes(n.id)
          , v = visited.includes(n.id);
        return `<g data-node="${esc(n.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(n.name)}" class="graph-node"><circle cx="${n.x}" cy="${n.y}" r="${n.id === 'S' ? 26 : 20}" fill="${n.id === 'S' ? '#172c28' : active || v ? routeColor : '#fff'}" stroke="${active ? routeColor : '#a1b4a9'}" stroke-width="${active ? 4 : 2}"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle" fill="${n.id === 'S' || active || v ? 'white' : '#465c50'}" font-size="14" font-weight="700">${esc(n.id)}</text><text x="${n.x}" y="${n.y + 40}" text-anchor="middle" fill="#30483b" font-size="14" font-weight="600" paint-order="stroke" stroke="#f1f5f1" stroke-width="5">${esc(n.name)}</text>${n.priority === 3 && n.id !== 'S' ? `<circle cx="${n.x + 16}" cy="${n.y - 16}" r="6" fill="#e6a526" stroke="#fff" stroke-width="2"/>` : ''}</g>`;
    }
    ).join('')}</svg>`;
}
function networkView() {
    return `<div class="network-grid"><section class="panel"><div class="panel-heading"><div><h2>Pickup stops</h2><p>Whole groups stay together on one bus.</p></div><button class="secondary" id="add-stop">+ Add stop</button></div><div class="table-wrap"><table><thead><tr><th>Stop</th><th>Students</th><th>Priority</th><th></th></tr></thead><tbody>${data.nodes.map(n => `<tr><td><span class="id-badge">${esc(n.id)}</span> ${esc(n.name)}</td><td>${n.students}</td><td><span class="priority p${n.priority}">${n.id === 'S' ? 'School' : ['', 'Normal', 'Medium', 'High'][n.priority]}</span></td><td><button class="text-button" data-edit-stop="${esc(n.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div></section><section class="panel"><div class="panel-heading"><div><h2>Fleet & timing</h2><p>All buses start and finish at school.</p></div><button class="text-button" id="add-bus">+ Add bus</button></div><div class="fleet">${data.buses.map( (b, i) => `<div class="fleet-row"><span class="bus-icon" style="color:${colors[i % colors.length]}">▣</span><div><b>Bus ${esc(b.id)}</b><small>${b.capacity} seats</small></div><button class="text-button" data-edit-bus="${esc(b.id)}">Edit</button></div>`).join('')}</div><div class="settings-summary"><div><span>Departure</span><b>${data.settings.start}</b></div><div><span>Arrival deadline</span><b>${data.settings.deadline}</b></div><div><span>Average speed</span><b>${data.settings.speed} km/h</b></div><div><span>Pickup dwell time</span><b>${data.settings.dwell} min</b></div><div><span>Priority weight (α)</span><b>${data.settings.weight}</b></div><button class="secondary" id="settings">Edit planning settings</button></div></section></div><section class="panel roads"><div class="panel-heading"><div><h2>Road connections</h2><p>Undirected roads. Only these connections can be traveled.</p></div><button class="secondary" id="add-road">+ Connect stops</button></div><div class="roads-grid">${data.edges.map( ([a,b,w], i) => `<button class="road" data-edit-road="${i}"><span>${esc(a)} <small>↔</small> ${esc(b)}</span><b>${w} <small>km</small></b><span class="muted">Edit</span></button>`).join('') || '<p>No roads. Connect a pickup stop to the school.</p>'}</div></section>`;
}
function labView() {
    if (!data.nodes.some(n => n.id === from))
        from = 'S';
    if (!data.nodes.some(n => n.id === to))
        to = data.nodes.find(n => n.id !== 'S')?.id || 'S';
    const a = shortest(data, from, to, labMode)
      , other = shortest(data, from, to, labMode === 'dijkstra' ? 'bfs' : 'dijkstra');
    step = Math.min(step, Math.max(0, a.trace.length - 1));
    const t = a.trace[step]
      , done = step === a.trace.length - 1;
    const choice = results.choices[Math.min(decision, results.choices.length - 1)];
    return `<div class="lab-controls"><label>Algorithm<select id="lab-mode"><option value="dijkstra" ${labMode === 'dijkstra' ? 'selected' : ''}>Dijkstra · minimum distance</option><option value="bfs" ${labMode === 'bfs' ? 'selected' : ''}>BFS · minimum hops</option></select></label><label>From<select id="from">${options(from)}</select></label><label>To<select id="to">${options(to)}</select></label><div class="step-controls"><button class="secondary" id="restart">Reset</button><button class="secondary" id="prev" ${step === 0 ? 'disabled' : ''}>Previous</button><button class="primary" id="next" ${done ? 'disabled' : ''}>Next step</button><button class="secondary" id="play">${timer ? 'Pause' : 'Play'}</button></div></div><div class="planner-grid"><section class="panel map-panel"><div class="panel-heading"><div><h2>${labMode === 'dijkstra' ? 'Dijkstra search' : 'Breadth-first search'}</h2><p>${done ? 'Search complete' : `Exploring ${esc(t?.node || '—')} · step ${step + 1} of ${a.trace.length}`}</p></div><span class="pill">${labMode === 'dijkstra' ? 'Weighted distance' : 'Unweighted hops'}</span></div><div class="map-wrap">${map(done ? a.path : [], a.trace.slice(0, step + 1).map(t => t.node))}</div><div class="lab-result"><b>${a.path.length ? a.path.map(esc).join(' → ') : 'No reachable path'}</b><span>${fmt(a.distance)} km · ${Number.isFinite(a.hops) ? a.hops : '—'} hops</span></div></section><section class="panel trace"><div class="panel-heading"><div><h2>Search state</h2><p>Step ${step + 1} / ${a.trace.length}</p></div></div>${t ? `<div class="trace-body"><div class="current-node"><span>EXPLORED NODE</span><b>${esc(t.node)}</b><p>${fmt(t.cost)} ${labMode === 'dijkstra' ? 'km tentative distance' : 'hops from source'}</p></div><h3>Neighbor updates</h3>${t.updates.map(u => `<div class="state-row"><span>${esc(u.to)} · ${esc(name(u.to))}</span><b>${fmt(u.value)}</b></div>`).join('') || '<p class="muted">No shorter labels found.</p>'}<h3>Frontier after this step</h3>${t.frontier.map(u => `<span class="frontier">${esc(u.node)} <b>${fmt(u.cost)}</b></span>`).join('') || '<p class="muted">Frontier is empty.</p>'}<p class="muted">${labMode === 'dijkstra' ? 'Select the unsettled node with the lowest tentative distance.' : 'Use a FIFO queue to explore one hop-level at a time. Frontier labels below are sorted for readability.'}</p></div>` : ''}</section></div><section class="panel comparison-panel"><div class="panel-heading"><div><h2>Same stops. Different objectives.</h2><p>BFS minimizes edge count; Dijkstra minimizes the sum of road distances.</p></div></div><div class="table-wrap"><table><thead><tr><th>Algorithm</th><th>Path</th><th>Distance</th><th>Hops</th><th>Explored nodes</th></tr></thead><tbody>${[[labMode, a], [labMode === 'dijkstra' ? 'bfs' : 'dijkstra', other]].map( ([m,r]) => `<tr><td><b>${m === 'bfs' ? 'BFS' : 'Dijkstra'}</b></td><td>${r.path.map(esc).join(' → ') || 'Unreachable'}</td><td>${fmt(r.distance)} km</td><td>${Number.isFinite(r.hops) ? r.hops : '—'}</td><td>${r.trace.length}</td></tr>`).join('')}</tbody></table></div></section><section class="panel greedy"><div class="panel-heading"><div><h2>Greedy decision log</h2><p>Score = distance ÷ [1 + α × (priority − 1)] in priority-aware mode. Lowest feasible score wins.</p></div><span class="pill">α = ${data.settings.weight}</span></div>${choice ? `<div class="decision-controls"><label>Inspect pickup decision<select id="decision">${results.choices.map( (c, i) => `<option value="${i}" ${i === decision ? 'selected' : ''}>${i + 1}. Bus ${esc(c.bus)} · ${esc(c.from)} → ${esc(c.chosen)}</option>`).join('')}</select></label><p>${choice.remaining} seats remaining before pickup. ${mode === 'distance' ? 'Distance-first mode uses score = distance.' : 'Priorities: normal 1, medium 2, high 3.'}</p></div><div class="table-wrap"><table><thead><tr><th>Candidate stop</th><th>Road distance</th><th>Priority</th><th>Score</th><th>Decision</th></tr></thead><tbody>${choice.candidates.map( (c, i) => `<tr><td>${esc(c.id)} · ${esc(name(c.id))}</td><td>${fmt(c.distance)} km</td><td>${c.priority}</td><td>${c.score.toFixed(3)}</td><td>${i === 0 ? '<span class="pill green">Selected</span>' : 'Higher score / tie-break'}</td></tr>`).join('')}</tbody></table></div><p class="table-note">Already assigned, unreachable and over-capacity stops are excluded. Exact ties use stop ID. Buses are filled in listed order.</p>` : '<p class="empty">No pickup decisions. Add reachable stops with students.</p>'}</section>`;
}
function options(value) {
    return data.nodes.map(n => `<option value="${esc(n.id)}" ${value === n.id ? 'selected' : ''}>${esc(n.id)} · ${esc(n.name)}</option>`).join('');
}
function guideView() {
    return `<section class="guide-hero"><div><span class="eyebrow">PROBLEM 32 · SCHOOL BUS ROUTE PLANNER</span><h2>A working route planner.<br>An explainable solution.</h2><p>Model a school neighborhood as a weighted graph, find road paths, and assign whole pickup groups to a capacity-limited fleet.</p><button class="secondary" id="guide-demo">Start the 3-minute demo</button></div><div class="guide-metrics"><b>3<span>core algorithms</span></b><b>100%<span>inspectable decisions</span></b></div></section><div class="guide-grid"><section class="panel prose"><h2>Show it in three minutes</h2><ol><li><b>Plan · 45 seconds.</b> Open the morning demo. Select each bus to see its road path, capacity and pickup schedule.</li><li><b>Explain · 60 seconds.</b> In Algorithm lab, compare S → A. Dijkstra finds 5.5 km through D; BFS takes the direct 8.9 km road because it is one hop. Step through the search.</li><li><b>Challenge · 45 seconds.</b> Load Capacity challenge, then Road closure challenge. Show explicit unassigned stops and reasons.</li><li><b>Adapt · 30 seconds.</b> Edit a bus capacity or road distance. Rerun, compare strategies and export the report.</li></ol></section><section class="panel prose"><h2>What is being optimized?</h2><p><b>Distance-first:</b> select the nearest reachable group that fits the current bus.</p><p><b>Priority-aware:</b> select the smallest distance / [1 + α(priority − 1)]. Larger α favors high-priority stops.</p><p>Track total fleet kilometers, assigned students, weighted pickup wait and late arrivals. Neither strategy is a globally optimal vehicle-routing solver, and priority-aware may travel farther.</p><p>The deadline is a warning constraint, not an optimizer constraint. An infeasible greedy assignment is not proof that no better assignment exists.</p></section><section class="panel prose"><h2>Algorithms & complexity</h2><p><b>Dijkstra:</b> adjacency lists, tentative distances, predecessor reconstruction and linear minimum selection. O(V² + E) per source-target search; non-negative road costs are required (the UI uses positive lengths).</p><p><b>BFS:</b> FIFO queue, level-by-level traversal and predecessor paths. O(V + E) conceptually; this small JavaScript implementation uses array shift and sorted display snapshots, adding overhead.</p><p><b>Greedy:</b> capacity-feasible scoring and deterministic tie-breaking. Distances are cached for at most V² source-target pairs. Worst-case planning is O(V²(V² + E) + BV² log V), excluding trace-display overhead.</p><p>Bounds: 35 nodes, 12 buses, up to 200 students per stop. These keep the browser demo responsive.</p></section><section class="panel prose"><h2>Model & practical limits</h2><ul><li>Undirected road graph; edge weights in kilometers.</li><li>School is the depot. Every used bus makes one round trip.</li><li>Groups are not split; buses are filled in listed order.</li><li>Fixed average speed and pickup dwell; no live traffic, GPS or turn restrictions.</li><li>Each scenario is saved only in this browser. Export/import JSON to transfer edits.</li><li>Synthetic data only; no names or personal student information.</li></ul><p>Production extensions: road-map APIs, time windows, accessibility constraints, multi-trip scheduling and an exact or metaheuristic vehicle-routing solver.</p></section><section class="panel prose"><h2>Implementation you can inspect</h2><p>Dependency-free HTML, CSS and JavaScript ES modules. Algorithms execute in the browser; no paid map service, API key or server setup is needed.</p><p>The suggested technologies are optional. This prototype prioritizes reliable live demonstration and readable source. There is no Flask or PostgreSQL backend.</p><a class="secondary link-button" href="engine.mjs" download>Download algorithm source</a><a class="text-button" href="README.md" download>Download project notes</a></section><section class="panel prose"><h2>Evaluation evidence</h2><ul><li>Actual algorithms, not pre-written result screens.</li><li>Editable stops, fleet, priorities, roads and timings.</li><li>Reconstructed paths and step-by-step search states.</li><li>Side-by-side strategies with measured outcomes.</li><li>Capacity and reachability failures explained.</li><li>Import/export, route reports and responsive layout.</li></ul><p>Automated algorithm checks cover known shortest paths, capacity, disconnected graphs, no-demand inputs, validation and route invariants. Test source is included.</p><a class="text-button" href="tests.mjs" download>Download automated checks</a></section></div>`;
}
function bind() {
    $$('.nav,[data-page]').forEach(b => b.onclick = () => {
        stopTimer();
        page = b.dataset.page;
        render();
        window.scrollTo(0, 0);
    }
    );
    $('.brand').onclick = e => {
        e.preventDefault();
        page = 'routes';
        render();
    }
    ;
    $('#run').onclick = () => {
        calculate();
        persist();
        page = 'routes';
        render();
        notify('Routes recalculated from the current network.');
    }
    ;
    $('#scenario').onchange = e => {
        if (!e.target.value)
            return;
        stopTimer();
        data = demo();
        if (e.target.value === 'capacity') {
            data.buses = [{
                id: '01',
                capacity: 15
            }, {
                id: '02',
                capacity: 15
            }];
            scenario = 'Capacity challenge';
        } else if (e.target.value === 'disconnected') {
            data.edges = data.edges.filter(e => !e.includes('A'));
            scenario = 'Road closure challenge';
        } else if (e.target.value === 'empty') {
            data.nodes = data.nodes.filter(n => n.id === 'S');
            data.edges = [];
            data.buses = [{
                id: '01',
                capacity: 20
            }];
            scenario = 'Empty network';
        } else
            scenario = 'Morning demo';
        selected = 0;
        step = 0;
        calculate();
        persist();
        render();
        notify('Scenario loaded. Previous edits can be restored from an export.');
    }
    ;
    $('#export').onclick = () => download('mrvtc-ganeshkalmoori-hackathon-scenario.json', JSON.stringify(data, null, 2), 'application/json');
    $('#import').onclick = importDialog;
    $('#share').onclick = async () => {
        try {
            await navigator.clipboard.writeText(location.href.split('#')[0]);
            notify('Project link copied. Export your scenario to share your edits.');
        } catch {
            showModal('Share project', `<p>Copy this project link. Custom changes stay in your browser; export the scenario to share them.</p><input aria-label="Project link" value="${esc(location.href.split('#')[0])}" readonly>`);
        }
    }
    ;
    $$('[data-route]').forEach(b => b.onclick = () => {
        selected = Number(b.dataset.route);
        render();
    }
    );
    $$('[data-node]').forEach(b => {
        b.onclick = () => editStop(b.dataset.node);
        b.onkeydown = e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                editStop(b.dataset.node);
            }
        }
        ;
    }
    );
    $('#strategy')?.addEventListener('change', e => {
        mode = e.target.value;
        calculate();
        render();
    }
    );
    $('#report')?.addEventListener('click', report);
    $('#add-stop')?.addEventListener('click', () => editStop());
    $$('[data-edit-stop]').forEach(b => b.onclick = () => editStop(b.dataset.editStop));
    $('#add-bus')?.addEventListener('click', () => editBus());
    $$('[data-edit-bus]').forEach(b => b.onclick = () => editBus(b.dataset.editBus));
    $('#add-road')?.addEventListener('click', () => editRoad());
    $$('[data-edit-road]').forEach(b => b.onclick = () => editRoad(Number(b.dataset.editRoad)));
    $('#settings')?.addEventListener('click', editSettings);
    for (const id of ['lab-mode', 'from', 'to'])
        $('#' + id)?.addEventListener('change', e => {
            stopTimer();
            if (id === 'lab-mode')
                labMode = e.target.value;
            else if (id === 'from')
                from = e.target.value;
            else
                to = e.target.value;
            step = 0;
            render();
        }
        );
    $('#next')?.addEventListener('click', () => {
        step++;
        render();
    }
    );
    $('#prev')?.addEventListener('click', () => {
        step = Math.max(0, step - 1);
        render();
    }
    );
    $('#restart')?.addEventListener('click', () => {
        stopTimer();
        step = 0;
        render();
    }
    );
    $('#play')?.addEventListener('click', () => {
        if (timer) {
            stopTimer();
            render();
            return;
        }
        if (step >= shortest(data, from, to, labMode).trace.length - 1)
            step = 0;
        timer = setInterval( () => {
            const end = shortest(data, from, to, labMode).trace.length - 1;
            if (step < end)
                step++;
            if (step >= end)
                stopTimer();
            render();
        }
        , 850);
        render();
    }
    );
    $('#decision')?.addEventListener('change', e => {
        decision = Number(e.target.value);
        render();
    }
    );
    $('#guide-demo')?.addEventListener('click', () => {
        data = demo();
        mode = 'priority';
        scenario = 'Morning demo';
        page = 'routes';
        selected = 0;
        calculate();
        persist();
        render();
        window.scrollTo(0, 0);
    }
    );
}
const $$ = s => [...document.querySelectorAll(s)];
function stopTimer() {
    clearInterval(timer);
    timer = null;
}
function showModal(title, body, onSave, remove) {
    stopTimer();
    const m = $('#modal');
    m.innerHTML = `<form id="modal-form"><div class="modal-top"><h2>${esc(title)}</h2><button type="button" id="close" class="quiet" aria-label="Close dialog">✕</button></div><div class="modal-content">${body}<p id="form-error" class="error" role="alert"></p></div><div class="modal-actions">${remove ? '<button type="button" class="danger" id="remove">Delete</button>' : ''}<button type="button" class="secondary" id="cancel">Close</button>${onSave ? '<button class="primary" type="submit">Save changes</button>' : ''}</div></form>`;
    m.showModal();
    $('#close').onclick = $('#cancel').onclick = () => m.close();
    $('#modal-form').onsubmit = e => {
        e.preventDefault();
        if (!onSave)
            return;
        try {
            const copy = structuredClone(data);
            onSave(new FormData(e.target), copy);
            validate(copy);
            data = copy;
            scenario = 'Custom network';
            calculate();
            persist();
            m.close();
            render();
            notify('Saved. Routes updated.');
        } catch (err) {
            $('#form-error').textContent = err.message;
        }
    }
    ;
    if (remove)
        $('#remove').onclick = () => {
            try {
                const copy = structuredClone(data);
                remove(copy);
                validate(copy);
                data = copy;
                scenario = 'Custom network';
                calculate();
                persist();
                m.close();
                render();
                notify('Deleted. Routes updated.');
            } catch (err) {
                $('#form-error').textContent = err.message;
            }
        }
        ;
}
function field(label, id, value, type='number', extra='') {
    return `<label>${label}<input name="${id}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
}
function editStop(id) {
    const n = data.nodes.find(n => n.id === id)
      , school = id === 'S';
    showModal(n ? 'Edit ' + n.name : 'Add pickup stop', `${!n ? field('Stop ID', 'id', 'N' + data.nodes.length, 'text', 'maxlength="12"') : ''}${field('Name', 'name', n?.name || '', 'text', 'maxlength="60"')}<div class="form-grid">${!school ? field('Students', 'students', n?.students ?? 5, 'number', 'min="0" max="200" step="1"') : ''}${!school ? `<label>Pickup priority<select name="priority">${[1, 2, 3].map(p => `<option value="${p}" ${n?.priority === p ? 'selected' : ''}>${['', 'Normal', 'Medium', 'High'][p]}</option>`).join('')}</select></label>` : ''}${field('Map X (45–765)', 'x', n?.x ?? 400, 'number', 'min="45" max="765"')}${field('Map Y (50–475)', 'y', n?.y ?? 220, 'number', 'min="50" max="475"')}</div><p class="muted">${n ? 'Deleting a stop also removes its connecting roads.' : 'Connect the new stop using “Connect stops” after saving.'} Map coordinates only affect the diagram; distances come from roads.</p>`, (f, d) => {
        const item = {
            id: id || f.get('id').trim(),
            name: f.get('name').trim(),
            students: school ? 0 : Number(f.get('students')),
            priority: school ? 1 : Number(f.get('priority')),
            x: Number(f.get('x')),
            y: Number(f.get('y'))
        };
        if (n)
            d.nodes[d.nodes.findIndex(x => x.id === id)] = item;
        else
            d.nodes.push(item);
    }
    , n && !school ? d => {
        d.nodes = d.nodes.filter(x => x.id !== id);
        d.edges = d.edges.filter(e => e[0] !== id && e[1] !== id);
    }
    : null);
}
function editBus(id) {
    const b = data.buses.find(b => b.id === id);
    showModal(b ? 'Edit bus ' + b.id : 'Add bus', `${field('Bus ID', 'id', b?.id || String(data.buses.length + 1).padStart(2, '0'), 'text', 'maxlength="20"')}${field('Seat capacity', 'capacity', b?.capacity ?? 20, 'number', 'min="1" max="200" step="1"')}`, (f, d) => {
        const item = {
            id: f.get('id').trim(),
            capacity: Number(f.get('capacity'))
        };
        if (b)
            d.buses[d.buses.findIndex(x => x.id === id)] = item;
        else
            d.buses.push(item);
    }
    , b ? d => {
        d.buses = d.buses.filter(x => x.id !== id);
    }
    : null);
}
function editRoad(index) {
    const e = data.edges[index];
    showModal(e ? 'Edit road' : 'Connect stops', `<div class="form-grid"><label>From<select name="a">${options(e?.[0] || 'S')}</select></label><label>To<select name="b">${options(e?.[1] || data.nodes[1]?.id)}</select></label></div>${field('Road distance (km)', 'distance', e?.[2] ?? 2, 'number', 'min="0.01" max="100" step="0.01"')}<p class="muted">Roads can be traveled in both directions. Deleting a road may disconnect pickup stops.</p>`, (f, d) => {
        const item = [f.get('a'), f.get('b'), Number(f.get('distance'))];
        if (e)
            d.edges[index] = item;
        else
            d.edges.push(item);
    }
    , e ? d => {
        d.edges.splice(index, 1);
    }
    : null);
}
function editSettings() {
    const s = data.settings;
    showModal('Planning settings', `<div class="form-grid">${field('Departure', 'start', s.start, 'time')}${field('School arrival deadline', 'deadline', s.deadline, 'time')}${field('Average speed (km/h)', 'speed', s.speed, 'number', 'min="5" max="80" step="1"')}${field('Dwell per pickup (min)', 'dwell', s.dwell, 'number', 'min="0" max="10" step="0.1"')}${field('Priority weight α', 'weight', s.weight, 'number', 'min="0" max="2" step="0.1"')}</div><p class="muted">A weight of zero makes both greedy strategies distance-first. Arrival times are estimates; deadline violations are reported.</p>`, (f, d) => {
        d.settings = {
            start: f.get('start'),
            deadline: f.get('deadline'),
            speed: Number(f.get('speed')),
            dwell: Number(f.get('dwell')),
            weight: Number(f.get('weight'))
        };
    }
    );
}
function importDialog() {
    showModal('Import a scenario', `<p>Paste a mrvtc.ganeshkalmoori.hackathon scenario JSON export. This replaces the current network after validation.</p><label>Scenario JSON<textarea name="json" rows="12" required placeholder='{"nodes": [...], "edges": [...], "buses": [...], "settings": {...}}'></textarea></label>`, (f, d) => {
        const raw = f.get('json');
        if (raw.length > 100000)
            throw Error('Scenario is too large (100 KB maximum).');
        const parsed = validate(JSON.parse(raw));
        Object.keys(d).forEach(k => delete d[k]);
        Object.assign(d, parsed);
    }
    );
}
function download(filename, text, type='text/plain') {
    const url = URL.createObjectURL(new Blob([text],{
        type
    }))
      , a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout( () => URL.revokeObjectURL(url), 1000);
}
function report() {
    download('mrvtc-ganeshkalmoori-hackathon-route-report.txt', `mrvtc.ganeshkalmoori.hackathon — SCHOOL BUS ROUTE PLAN\nStrategy: ${mode}\nScenario: ${scenario}\nSimulated data; not operational driving guidance.\n\nAssigned: ${results.served}/${results.total}\nDistance: ${fmt(results.distance)} km\nPriority-weighted wait: ${fmt(results.weightedWait)} min\nLate buses: ${results.late}\n\n` + results.routes.map(r => `BUS ${r.id} | ${r.load}/${r.capacity} seats | ${fmt(r.distance)} km\nDeparture ${data.settings.start}; school arrival ${clock(r.time)}\n` + r.visits.map(v => `${clock(v.arrival)} ${name(v.id)} (${v.id}) — ${v.students} students, priority ${v.priority}`).join('\n') + `\nRoad path: ${r.path.join(' > ')}\n`).join('\n') + `\nUNASSIGNED\n${results.unassigned.map(u => name(u.id) + ': ' + u.reason).join('\n') || 'None'}\n\nASSUMPTIONS\nUndirected positive-distance roads; one school round trip per bus; groups not split; ${data.settings.speed} km/h; ${data.settings.dwell} min per pickup. Greedy heuristic; no guarantee of global optimality.\n`);
}
render();
if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => lifecycle.abort(), {
        once: true
    });
    for (const tool of [{
        name: 'read_bus_plan',
        description: 'Read the current school bus plan, coverage, distances and unassigned stops.',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
        },
        annotations: {
            readOnlyHint: true,
            untrustedContentHint: true
        },
        execute() {
            return {
                scenario,
                mode,
                distance: results.distance,
                served: results.served,
                total: results.total,
                unassigned: results.unassigned,
                routes: results.routes.map(r => ({
                    bus: r.id,
                    capacity: r.capacity,
                    load: r.load,
                    stops: r.visits.map(v => v.id),
                    distance: r.distance,
                    arrival: clock(r.time)
                }))
            };
        }
    }, {
        name: 'run_bus_planner',
        description: 'Set the planning strategy, calculate routes for the current network and display the route planner.',
        inputSchema: {
            type: 'object',
            properties: {
                strategy: {
                    type: 'string',
                    enum: ['priority', 'distance']
                }
            },
            required: ['strategy'],
            additionalProperties: false
        },
        annotations: {
            readOnlyHint: false,
            untrustedContentHint: true
        },
        execute(input) {
            if (!input || !['priority', 'distance'].includes(input.strategy))
                throw Error('Choose priority or distance.');
            stopTimer();
            mode = input.strategy;
            calculate();
            page = 'routes';
            render();
            return {
                strategy: mode,
                distance: results.distance,
                assigned: results.served,
                total: results.total,
                unassignedStops: results.unassigned.length
            };
        }
    }]) {
        try {
            Promise.resolve(document.modelContext.registerTool(tool, {
                signal: lifecycle.signal
            })).catch( () => {}
            );
        } catch {}
    }
}
