import assert from 'node:assert/strict';
import {demo, validate, shortest, plan} from './engine.mjs';

const d = demo();
validate(d);

const dj = shortest(d, 'S', 'A', 'dijkstra');
assert.deepEqual(dj.path, ['S', 'D', 'A']);
assert.ok(Math.abs(dj.distance - 5.5) < 1e-9);

const bf = shortest(d, 'S', 'A', 'bfs');
assert.equal(bf.hops, 1);
assert.ok(Math.abs(bf.distance - 8.9) < 1e-9);

for (const mode of ['priority', 'distance']) {
  const r = plan(d, mode);
  assert.equal(r.served, r.total);
  assert.equal(r.unassigned.length, 0);
  for (const route of r.routes) assert.ok(route.load <= route.capacity);
}

const closed = demo();
closed.edges = closed.edges.filter(e => !e.includes('A'));
const c = plan(closed);
assert.equal(c.unassigned.length, 1);
assert.equal(c.unassigned[0].reason, 'No road path to school');

const empty = demo();
empty.nodes = empty.nodes.filter(n => n.id === 'S');
empty.edges = [];
assert.equal(plan(empty).routes.length, 0);

const dup = demo();
dup.nodes.push({...dup.nodes[1]});
assert.throws(() => validate(dup));

console.log('All checks passed.');
