// Testes da strategy sem navegador: `node --test tests/`.
// Gera o dashboard com um carro de exemplo (todas as chaves) e com um carro "pobre" (poucas chaves) e confere que
// nenhum cartão sai com entidade vazia, null ou tipo desconhecido.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../custom_components/evmetrics/frontend/evmetrics-strategy.js", import.meta.url));
const mod = await import("data:text/javascript;base64," + src.toString("base64"));
const { generateDashboard, KEYS } = mod;

const DOMAIN_OF = {
  CHARGING: "binary_sensor",
  CONNECTED: "binary_sensor",
  LOCK: "binary_sensor",
  DOOR_LF: "binary_sensor",
  DOOR_RF: "binary_sensor",
  TRUNK: "binary_sensor",
  WIN_LF: "binary_sensor",
  WIN_RF: "binary_sensor",
  WIN_LR: "binary_sensor",
  WIN_RR: "binary_sensor",
  AC: "binary_sensor",
  LOW_BEAM: "binary_sensor",
  PARK: "binary_sensor",
  PLUG: "binary_sensor",
  LOCATION: "device_tracker",
  SENTINEL_SWITCH: "switch",
  SENTINEL_PHOTO: "camera",
  SENTINEL_EVENT: "event",
  CHARGE_EVENT: "event",
};

function vehicle(keys) {
  const entities = {};
  for (const name of keys) {
    const key = KEYS[name] || name;
    // como no registro do HA: unique_id do app em minúsculas
    entities[key.toLowerCase()] = `${DOMAIN_OF[name] || "sensor"}.byd_seal_${key.toLowerCase()}`;
  }
  return {
    entry_id: "abc",
    title: "BYD Seal",
    url_path: "evmetrics-seal",
    app_version: "1.0",
    min_app_version: "1.0",
    image: "/evmetrics_static/seal.svg",
    cameras: ["camera.seal_cameras"],
    entities,
  };
}

function hassWith(v) {
  const states = {};
  for (const e of Object.values(v.entities)) states[e] = { entity_id: e, state: "1", attributes: { friendly_name: e } };
  return {
    states,
    async callWS(msg) {
      assert.equal(msg.type, "evmetrics/vehicles");
      return [v];
    },
  };
}

const CARD_TYPES = new Set([
  "heading", "tile", "gauge", "glance", "entities", "history-graph", "statistics-graph", "map", "picture-entity",
  "picture-elements", "logbook", "markdown", "entity-filter",
]);

function walk(node, path, visit) {
  visit(node, path);
  if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`, visit));
  else if (node && typeof node === "object") for (const [k, n] of Object.entries(node)) walk(n, `${path}.${k}`, visit);
}

function check(dashboard, v) {
  const known = new Set([...Object.values(v.entities), ...v.cameras, "zone.home"]);
  walk(dashboard, "dashboard", (node, path) => {
    assert.notEqual(node, null, `${path} é null`);
    assert.notEqual(node, undefined, `${path} é undefined`);
    if (node && typeof node === "object" && !Array.isArray(node)) {
      if ("entity" in node) assert.ok(known.has(node.entity), `${path}.entity desconhecida: ${node.entity}`);
      if (/\.cards\[\d+\]$|\.card$/.test(path)) {
        assert.ok(CARD_TYPES.has(node.type), `${path}: tipo de cartão inesperado ${node.type}`);
      }
    }
  });
  for (const view of dashboard.views) {
    assert.ok(view.path, `view sem path: ${view.title}`);
    for (const section of view.sections || []) {
      assert.equal(section.type, "grid");
      assert.ok(section.cards.length > 1 || section.cards[0].type !== "heading", `seção vazia em ${view.path}`);
    }
  }
}

test("carro completo gera as 6 views sem buracos", async () => {
  const v = vehicle(Object.keys(KEYS).concat(["BMS_CHARGE_COUNT", "BMS_BALANCE_MAX"]));
  const d = await generateDashboard({}, hassWith(v));
  assert.deepEqual(
    d.views.map((x) => x.path),
    ["carro", "sentinela", "energia", "conducao", "graficos", "todos"]
  );
  check(d, v);
  const energia = d.views.find((x) => x.path === "energia");
  assert.ok(JSON.stringify(energia).includes("sensor.byd_seal_bms_charge_count"), "chaves BMS_* entram sozinhas");
  const todos = d.views.find((x) => x.path === "todos");
  const listed = JSON.stringify(todos);
  for (const e of Object.values(v.entities)) assert.ok(listed.includes(e), `"Todos" sem ${e}`);
});

test("chaves do registro em minúsculas (unique_id do app) acham os cartões", async () => {
  const v = vehicle(Object.keys(KEYS));
  const d = await generateDashboard({}, hassWith(v));
  const view = (p) => JSON.stringify(d.views.find((x) => x.path === p));
  assert.ok(view("carro").includes("sensor.byd_seal_statistic_remaining_battery_power"), "SOC no cartão do carro");
  assert.equal(d.views.find((x) => x.path === "conducao").sections.length, 5, "condução com as 5 seções");
  assert.ok(view("energia").includes("sensor.byd_seal_battery_cell_delta_mv"), "células do CAN na energia");
});

test("carro com poucas chaves não gera cartão vazio", async () => {
  const v = vehicle(["SOC", "RANGE", "V12", "LOCK", "CONNECTED"]);
  v.cameras = [];
  const d = await generateDashboard({}, hassWith(v));
  check(d, v);
  const sentinela = d.views.find((x) => x.path === "sentinela");
  assert.equal(sentinela.sections.length, 0, "sem sentinela no carro, a view fica vazia");
});

test("sem integração ou sem carro mostra uma mensagem", async () => {
  const semWs = await generateDashboard({}, { states: {}, callWS: async () => { throw new Error("unknown_command"); } });
  assert.equal(semWs.views[0].cards[0].type, "markdown");
  const vazio = await generateDashboard({}, { states: {}, callWS: async () => [] });
  assert.match(vazio.views[0].cards[0].content, /Nenhum carro/);
});

test("app mais velho que o pacote mostra aviso", async () => {
  const v = vehicle(["SOC"]);
  v.app_version = "0.9";
  const d = await generateDashboard({}, hassWith(v));
  assert.match(JSON.stringify(d.views[0]), /espera a \*\*1\.0\*\*/);
});

test("entry_id vai no pedido ao websocket", async () => {
  const v = vehicle(["SOC"]);
  let sent;
  await generateDashboard({ entry_id: "xyz" }, { states: {}, callWS: async (m) => ((sent = m), [v]) });
  assert.equal(sent.entry_id, "xyz");
});
