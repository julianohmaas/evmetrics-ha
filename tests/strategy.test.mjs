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
  LIVE_SELECT: "select",
  VIDEO_LAST: "button",
  VIDEO_EVENT: "event",
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
    image: "/evmetrics_static/seal.webp",
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

test("Todos: grupos por sistema em 3 colunas, chave desconhecida em Outros e sem o nome do carro", async () => {
  const v = vehicle(Object.keys(KEYS).concat(["BMS_CHARGE_COUNT", "UDS_REAR_RPM", "CHAVE_NOVA_DO_APP"]));
  v.device_id = "dev1";
  const hass = hassWith(v);
  hass.devices = { dev1: { name: "BYD Seal" } };
  for (const e of Object.values(v.entities)) hass.states[e].attributes.friendly_name = `BYD Seal ${e.split(".")[1]}`;
  const d = await generateDashboard({}, hass);
  check(d, v);
  const todos = d.views.find((x) => x.path === "todos");
  assert.equal(todos.sections.length, 3, "uma seção por coluna");
  const cards = todos.sections.flatMap((s) => s.cards);
  const group = (heading) => cards[cards.findIndex((x) => x.heading === heading) + 1].entities.map((x) => x.entity);
  assert.deepEqual(group("Outros"), ["sensor.byd_seal_chave_nova_do_app"]);
  assert.ok(group("Bateria e energia").includes("sensor.byd_seal_bms_charge_count"));
  assert.ok(group("Motores").includes("sensor.byd_seal_uds_rear_rpm"));
  assert.ok(group("Motores").includes("sensor.byd_seal_charging_driver_motor_current"), "corrente do motor não é recarga");
  assert.ok(group("Recarga").includes("binary_sensor.byd_seal_charging"));
  assert.ok(group("Sentinela e câmeras").includes("switch.byd_seal_sentinel_switch"));
  assert.ok(cards.filter((x) => x.type === "entities").every((x) => x.entities.every((r) => !r.name.startsWith("BYD Seal"))));
  // colunas equilibradas: a mais alta não passa de 1,5× a mais baixa
  const heights = todos.sections.map((s) => s.cards.filter((x) => x.type === "entities").reduce((n, x) => n + x.entities.length + 2.5, 0));
  assert.ok(Math.max(...heights) <= 1.5 * Math.min(...heights), `colunas desequilibradas: ${heights}`);
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

/** Cartões embaixo do cabeçalho `heading` na view, até o próximo cabeçalho (seções empilhadas com c.stack). */
function under(view, heading) {
  for (const s of view.sections) {
    const i = s.cards.findIndex((x) => x.type === "heading" && x.heading === heading);
    if (i < 0) continue;
    const next = s.cards.findIndex((x, j) => j > i && x.type === "heading");
    return s.cards.slice(i + 1, next < 0 ? undefined : next);
  }
  return null;
}

test("câmeras pela internet: seções próprias, Push só se existirem e sem repetir na lista ao vivo", async () => {
  const v = vehicle(["LIVE_SELECT", "LIVE_STATE", "VIDEO_LAST", "VIDEO_EVENT"]);
  v.cameras = ["camera.seal_ao_vivo", "camera.seal_cameras"];
  const hass = hassWith(v);
  for (const e of ["camera.seal_ao_vivo", "camera.seal_alerta"]) hass.states[e] = { entity_id: e, state: "idle" };
  const d = await generateDashboard({}, hass);
  check(d, { ...v, cameras: [...v.cameras, "camera.seal_alerta"] });
  const sentinela = d.views.find((x) => x.path === "sentinela");
  const pics = (cards) => cards.filter((x) => x.type === "picture-entity").map((x) => x.entity);
  assert.deepEqual(pics(under(sentinela, "Câmeras pela internet")), ["camera.seal_ao_vivo"]);
  const alerta = under(sentinela, "Último alerta");
  assert.deepEqual(pics(alerta), ["camera.seal_alerta"]);
  assert.deepEqual(under(sentinela, "Ao vivo").map((x) => x.entity), ["camera.seal_cameras"], "Push fora da lista ao vivo");
  const btn = alerta.find((x) => x.entity === "button.byd_seal_video_last");
  assert.equal(btn.tap_action.perform_action, "button.press");

  // sem as Push cams no HA e sem as chaves novas: nada da seção
  const pobre = vehicle(["SOC", "SENTINEL_STATE"]);
  const d2 = await generateDashboard({}, hassWith(pobre));
  assert.ok(!JSON.stringify(d2).includes("Câmeras pela internet"));
});

test("abas em 3 colunas: seções empilhadas e larguras certas nas seções de 2 colunas", async () => {
  const v = vehicle(Object.keys(KEYS).concat(["BMS_CHARGE_COUNT"]));
  v.cameras = ["camera.seal_cameras", "camera.seal_dvr"];
  v.device_id = "dev1";
  const hass = hassWith(v);
  hass.devices = { dev1: { name: "BYD Seal" } };
  hass.states["sensor.byd_seal_bms_charge_count"].attributes.friendly_name = "BYD Seal Recargas (BMS)";
  for (const e of ["camera.seal_ao_vivo", "camera.seal_alerta"]) hass.states[e] = { entity_id: e, state: "idle" };
  const d = await generateDashboard({}, hass);
  const view = (p) => d.views.find((x) => x.path === p);
  const headings = (s) => s.cards.filter((x) => x.type === "heading").map((x) => x.heading);

  const carro = view("carro").sections;
  assert.deepEqual(carro.map(headings), [["Visão geral"], ["Portas e janelas", "Clima e luzes"], ["Conexão e 12 V"], ["Onde está"]]);
  assert.equal(carro[3].column_span, 3, "mapa na largura toda");

  const sentinela = view("sentinela").sections;
  assert.deepEqual(sentinela.map(headings), [
    ["Sentinela", "Último disparo"],
    ["Último alerta", "Disparos"],
    ["Câmeras pela internet", "Ao vivo"],
  ]);
  assert.ok(sentinela.every((s) => !s.column_span), "sentinela sem seções de 2 colunas");
  assert.deepEqual(under(view("sentinela"), "Ao vivo").map((x) => x.grid_options.columns), [6, 6], "câmeras lado a lado");

  // seção de 2 colunas tem grade de 24: os históricos lado a lado ocupam 12, a recarga a largura toda
  const hist = view("energia").sections.find((s) => headings(s)[0] === "Últimas 24 h");
  assert.equal(hist.column_span, 2);
  assert.deepEqual(hist.cards.slice(1).map((x) => x.grid_options.columns), [12, 12, "full"]);
  assert.deepEqual(under(view("energia"), "BMS")[0].entities.map((x) => x.name), ["Recargas (BMS)"]);

  const conducao = view("conducao").sections;
  assert.deepEqual(conducao.map((s) => headings(s)[0]), ["Condução", "Motores", "Pneus", "Viagem", "Temperaturas dos motores (24 h)"]);
  const motor = conducao[1].cards[1].entities[0];
  assert.equal(motor.type, "conditional", "linha do motor some sem valor");
  assert.deepEqual(motor.conditions[0].state_not, ["unknown", "unavailable"]);

  // badges: navegação para a aba certa e alerta condicional da 12 V
  const badges = view("carro").badges;
  const bBat = badges.find((b) => b.name === "Bateria");
  assert.equal(bBat.tap_action.navigation_path, "/evmetrics-seal/energia");
  const b12 = badges.find((b) => b.name === "12 V");
  assert.deepEqual(b12.visibility, [{ condition: "numeric_state", entity: "sensor.byd_seal_ota_battery_power_voltage", below: 12.2 }]);

  // gauge de carga sem vermelho em DC rápida, e gráficos novos empilhados em 3 colunas
  const gaugeCarga = under(view("energia"), "Recarga").find((x) => x.type === "gauge");
  assert.equal(gaugeCarga.severity, undefined);
  assert.equal(gaugeCarga.segments.length, 3);
  const graficos = view("graficos").sections;
  assert.deepEqual(graficos.map(headings), [["Uso"], ["Bateria"], ["12 V e motores", "Pneus"]]);
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
