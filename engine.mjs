export const demo = () => ({
    nodes: [{
        id: 'S',
        name: 'Oakridge School',
        x: 490,
        y: 350,
        students: 0,
        priority: 1
    }, {
        id: 'A',
        name: 'Lakeview',
        x: 120,
        y: 125,
        students: 8,
        priority: 3
    }, {
        id: 'B',
        name: 'Maple Park',
        x: 315,
        y: 95,
        students: 6,
        priority: 2
    }, {
        id: 'C',
        name: 'West End',
        x: 90,
        y: 310,
        students: 7,
        priority: 1
    }, {
        id: 'D',
        name: 'Cedar Grove',
        x: 280,
        y: 265,
        students: 9,
        priority: 3
    }, {
        id: 'E',
        name: 'Hillcrest',
        x: 520,
        y: 100,
        students: 5,
        priority: 2
    }, {
        id: 'F',
        name: 'East Gardens',
        x: 710,
        y: 190,
        students: 8,
        priority: 1
    }, {
        id: 'G',
        name: 'Riverside',
        x: 725,
        y: 385,
        students: 6,
        priority: 2
    }, {
        id: 'H',
        name: 'Southgate',
        x: 310,
        y: 465,
        students: 5,
        priority: 1
    }],
    edges: [['S', 'D', 2.4], ['S', 'E', 3.5], ['S', 'F', 3.8], ['S', 'G', 3.2], ['S', 'H', 2.6], ['A', 'B', 2.1], ['A', 'C', 2.4], ['A', 'D', 3.1], ['B', 'D', 2.2], ['B', 'E', 2.6], ['C', 'D', 2.3], ['C', 'H', 3.5], ['D', 'H', 2.8], ['E', 'F', 2.4], ['F', 'G', 2.7], ['G', 'H', 5.8], ['S', 'A', 8.9]],
    buses: [{
        id: '01',
        capacity: 20
    }, {
        id: '02',
        capacity: 20
    }, {
        id: '03',
        capacity: 20
    }],
    settings: {
        speed: 25,
        dwell: 1,
        start: '07:00',
        deadline: '08:00',
        weight: 0.6
    }
});
export const minutes = t => t.split(':').reduce( (a, x) => a * 60 + Number(x), 0);
export const clock = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
export function validate(d) {
    if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.edges) || !Array.isArray(d.buses) || !d.settings)
        throw Error('Provide nodes, edges, buses and settings.');
    if (d.nodes.length < 1 || d.nodes.length > 35)
        throw Error('Use 1–35 nodes.');
    let ids = new Set;
    for (const n of d.nodes) {
        if (typeof n.id !== 'string' || !n.id || n.id.length > 12 || ids.has(n.id))
            throw Error('Stop IDs must be unique, 1–12 characters.');
        ids.add(n.id);
        if (typeof n.name !== 'string' || !n.name.trim() || n.name.length > 60)
            throw Error('Stop names must contain 1–60 characters.');
        if (!Number.isInteger(n.students) || n.students < 0 || n.students > 200)
            throw Error('Students must be whole numbers from 0 to 200.');
        if (![1, 2, 3].includes(n.priority) || !Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 45 || n.x > 765 || n.y < 50 || n.y > 475)
            throw Error('Invalid stop priority or map coordinates.');
    }
    if (!ids.has('S') || d.nodes.find(n => n.id === 'S').students !== 0)
        throw Error('School S must exist and have zero pickups.');
    let pairs = new Set;
    for (const e of d.edges) {
        if (!Array.isArray(e) || e.length !== 3 || !ids.has(e[0]) || !ids.has(e[1]) || e[0] === e[1] || !Number.isFinite(e[2]) || e[2] <= 0 || e[2] > 100)
            throw Error('Roads must connect distinct existing stops, with distance > 0 and ≤ 100 km.');
        const k = JSON.stringify([e[0], e[1]].sort());
        if (pairs.has(k))
            throw Error('Duplicate road connection.');
        pairs.add(k);
    }
    if (d.buses.length < 1 || d.buses.length > 12 || new Set(d.buses.map(b => b.id)).size !== d.buses.length)
        throw Error('Use 1–12 uniquely named buses.');
    for (const b of d.buses)
        if (typeof b.id !== 'string' || !b.id.trim() || b.id.length > 20 || !Number.isInteger(b.capacity) || b.capacity < 1 || b.capacity > 200)
            throw Error('Bus capacities must be whole numbers from 1 to 200.');
    const s = d.settings;
    if (!Number.isFinite(s.speed) || s.speed < 5 || s.speed > 80 || !Number.isFinite(s.dwell) || s.dwell < 0 || s.dwell > 10 || !Number.isFinite(s.weight) || s.weight < 0 || s.weight > 2 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.deadline) || minutes(s.deadline) <= minutes(s.start))
        throw Error('Check timing: speed 5–80, dwell 0–10, weight 0–2; deadline must follow departure.');
    return d;
}
export function graph(d) {
    return Object.fromEntries(d.nodes.map(n => [n.id, d.edges.flatMap( ([a,b,w]) => a === n.id ? [{
        to: b,
        w
    }] : b === n.id ? [{
        to: a,
        w
    }] : [])]));
}
export function shortest(d, start, end, mode='dijkstra') {
    const g = graph(d)
      , dist = Object.fromEntries(d.nodes.map(n => [n.id, Infinity]))
      , prev = Object.create(null)
      , seen = new Set
      , trace = []
      , queue = [start];
    dist[start] = 0;
    while (mode === 'bfs' ? queue.length : seen.size < d.nodes.length) {
        let u;
        if (mode === 'bfs')
            u = queue.shift();
        else
            u = Object.keys(dist).filter(n => !seen.has(n)).sort( (a, b) => dist[a] - dist[b] || a.localeCompare(b))[0];
        if (u === undefined || !Number.isFinite(dist[u]))
            break;
        seen.add(u);
        const updates = [];
        for (const {to, w} of g[u]) {
            let v = dist[u] + (mode === 'bfs' ? 1 : w);
            if (v < dist[to] - 1e-9) {
                dist[to] = v;
                prev[to] = u;
                updates.push({
                    to,
                    value: v
                });
                if (mode === 'bfs')
                    queue.push(to);
            }
        }
        trace.push({
            node: u,
            cost: dist[u],
            updates,
            frontier: Object.entries(dist).filter( ([n,v]) => !seen.has(n) && Number.isFinite(v)).map( ([node,cost]) => ({
                node,
                cost
            })).sort( (a, b) => a.cost - b.cost)
        });
        if (u === end)
            break;
    }
    if (!Number.isFinite(dist[end]))
        return {
            path: [],
            distance: Infinity,
            hops: Infinity,
            trace
        };
    let path = [end];
    while (path[0] !== start)
        path.unshift(prev[path[0]]);
    let distance = 0;
    for (let i = 1; i < path.length; i++)
        distance += g[path[i - 1]].find(e => e.to === path[i]).w;
    return {
        path,
        distance,
        hops: path.length - 1,
        trace
    };
}
export function plan(data, mode='priority') {
    validate(data);
    const cache = new Map;
    const sp = (a, b) => {
        let k = JSON.stringify([a, b]);
        if (!cache.has(k))
            cache.set(k, shortest(data, a, b));
        return cache.get(k);
    }
    ;
    const pending = new Set(data.nodes.filter(n => n.id !== 'S' && n.students > 0).map(n => n.id))
      , routes = []
      , choices = [];
    for (const bus of data.buses) {
        let at = 'S'
          , load = 0
          , distance = 0
          , time = minutes(data.settings.start)
          , path = ['S']
          , visits = []
          , legs = [];
        while (pending.size) {
            const candidates = data.nodes.filter(n => pending.has(n.id) && load + n.students <= bus.capacity && Number.isFinite(sp(at, n.id).distance)).map(n => ({
                n,
                leg: sp(at, n.id),
                score: sp(at, n.id).distance / (mode === 'priority' ? 1 + data.settings.weight * (n.priority - 1) : 1)
            })).sort( (a, b) => a.score - b.score || a.n.id.localeCompare(b.n.id));
            if (!candidates.length)
                break;
            const c = candidates[0];
            choices.push({
                bus: bus.id,
                from: at,
                chosen: c.n.id,
                remaining: bus.capacity - load,
                candidates: candidates.map(x => ({
                    id: x.n.id,
                    distance: x.leg.distance,
                    priority: x.n.priority,
                    score: x.score
                }))
            });
            time += c.leg.distance / data.settings.speed * 60;
            visits.push({
                id: c.n.id,
                students: c.n.students,
                priority: c.n.priority,
                arrival: time,
                wait: time - minutes(data.settings.start)
            });
            time += data.settings.dwell;
            load += c.n.students;
            distance += c.leg.distance;
            path.push(...c.leg.path.slice(1));
            legs.push({
                from: at,
                to: c.n.id,
                ...c.leg
            });
            at = c.n.id;
            pending.delete(at);
        }
        if (visits.length) {
            const back = sp(at, 'S');
            distance += back.distance;
            time += back.distance / data.settings.speed * 60;
            path.push(...back.path.slice(1));
            legs.push({
                from: at,
                to: 'S',
                ...back
            });
            routes.push({
                ...bus,
                load,
                distance,
                time,
                path,
                visits,
                legs,
                late: Math.max(0, time - minutes(data.settings.deadline))
            });
        }
    }
    const unassigned = [...pending].map(id => ({
        id,
        reason: !Number.isFinite(sp('S', id).distance) ? 'No road path to school' : data.nodes.find(n => n.id === id).students > Math.max(...data.buses.map(b => b.capacity)) ? 'Group exceeds every bus capacity' : 'Insufficient remaining capacity (groups stay together)'
    }));
    const total = data.nodes.reduce( (a, n) => a + n.students, 0)
      , served = routes.reduce( (a, r) => a + r.load, 0);
    let weighted = 0
      , den = 0;
    for (const r of routes)
        for (const v of r.visits) {
            weighted += v.wait * v.priority * v.students;
            den += v.priority * v.students;
        }
    return {
        mode,
        routes,
        choices,
        unassigned,
        total,
        served,
        distance: routes.reduce( (a, r) => a + r.distance, 0),
        weightedWait: den ? weighted / den : 0,
        late: routes.filter(r => r.late > 0).length
    };
}
