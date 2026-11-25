/**
 * EvMetrics: strategy do dashboard do carro ("custom:evmetrics").
 *
 * Gera o dashboard inteiro na hora, a partir das entidades do carro. Não usa cartões de terceiros: só os cartões
 * padrão do Home Assistant (picture-elements, tile, gauge, glance, history/statistics-graph, map, logbook...).
 *
 * As entidades são achadas pelas CHAVES do app (as mesmas do JSON e do SensorCatalog do EvMetrics), não pelo
 * entity_id: a integração responde no websocket "evmetrics/vehicles" com o mapa chave → entity_id montado pelos
 * unique_id do MQTT Discovery. Renomear uma entidade no HA não quebra o dashboard. Chave que o carro não publica
 * (opção desligada no app, versão antiga) só some do dashboard.
 *
 * Uso em YAML: strategy: { type: custom:evmetrics, entry_id: <opcional> }
 */

const KEYS = {
  // bateria e energia
  SOC: "STATISTIC_SOC_BATTERY_PERCENTAGE",
  SOC_FINE: "STATISTIC_REMAINING_BATTERY_POWER",
  RANGE: "STATISTIC_ELEC_DRIVING_RANGE",
  ENERGY: "POWER_BATTERY_REMAIN_ELECTRICITY",
  CURRENT: "STATISTIC_INSTANTANEOUS_CURRENT",
  DISCH_MAX: "STATISTIC_MAX_DISCHARGE_POWER_ALLOW",
  CHG_MAX: "STATISTIC_MAX_CHARGE_POWER_ALLOW",
  SOH: "STATISTIC_BATTERY_HEALTHY_INDEX",
  SOH_CALC: "soh_calc",
  CAPACITY: "BODYWORK_BATTERY_CAPACITY",
  CELL_MIN: "STATISTIC_LOWEST_BATTERY_VOLTAGE",
  CELL_MAX: "STATISTIC_HIGHEST_BATTERY_VOLTAGE",
  BYD_DELTA: "byd_cell_delta_mv",
  TEMP_AVG: "STATISTIC_AVERAGE_BATTERY_TEMP",
  TEMP_MIN: "STATISTIC_LOWEST_BATTERY_TEMP",
  TEMP_MAX: "STATISTIC_HIGHEST_BATTERY_TEMP",
  // células (CAN)
  CAN_MIN: "BATTERY_CELL_MIN_MV",
  CAN_MAX: "BATTERY_CELL_MAX_MV",
  CAN_AVG: "BATTERY_CELL_AVG_MV",
  CAN_DELTA: "BATTERY_CELL_DELTA_MV",
  CAN_MIN_NUM: "BATTERY_CELL_MIN_NUM",
  CAN_MAX_NUM: "BATTERY_CELL_MAX_NUM",
  PACK_V: "BATTERY_CELL_SUM_V",
  CELLS: "BATTERY_CELL_VOLTAGES",
  PACK_TMIN: "BATTERY_TEMP_MIN_C",
  PACK_TMAX: "BATTERY_TEMP_MAX_C",
  // viagem
  ODO: "STATISTIC_TOTAL_MILEAGE",
  TRIP1: "STATISTIC_DD_MILEAGE1",
  TRIP2: "STATISTIC_DD_MILEAGE2",
  DRIVE_TIME: "STATISTIC_DRIVING_TIME",
  CONS_TOTAL: "STATISTIC_TOTAL_ELEC_CONSUMPTION",
  CONS50: "INSTRUMENT_DD_LAST_50KM_POWER_CONSUME",
  // condução
  GEAR: "GEARBOX_AUTO_MODE_TYPE",
  SPEED: "SPEED_AUTO_SPEED",
  PARK: "GEARBOX_PARK_BRAKE_SWITCH",
  TRACTION: "ENGINE_POWER",
  ACCEL: "SPEED_ACCELERATOR_S",
  BRAKE: "SPEED_BRAKE_S",
  STEER: "BODYWORK_STEERING_WHEEL_ANGEL",
  SLOPE: "SENSOR_AUTO_SLOPE",
  DRIVE_MODE: "drive_mode",
  REGEN: "SET_DR_ENERGY_FB",
  SNOW: "ENERGY_ROAD_SURFACE_MODE",
  ESC: "ADAS_ESP_STATE",
  // carroceria e 12 V
  POWER_LEVEL: "BODYWORK_POWER_LEVEL",
  ALARM: "BODYWORK_ALARM_STATE",
  V12: "OTA_BATTERY_POWER_VOLTAGE",
  AWAKE: "BODYWORK_BATTERY_POWER",
  DCDC: "ENERGY_DC_WORK_MODE",
  LOCK: "OTA_LF_DOOR_LOCK",
  DOOR_LF: "BODYWORK_LEFT_HAND_FRONT_DOOR",
  DOOR_RF: "BODYWORK_RIGHT_HAND_FRONT_DOOR",
  TRUNK: "BODYWORK_LUGGAGE_DOOR",
  WIN_LF: "BODYWORK_LEFT_FRONT_WINDOW",
  WIN_RF: "BODYWORK_RIGHT_FRONT_WINDOW",
  WIN_LR: "BODYWORK_LEFT_REAR_WINDOW",
  WIN_RR: "BODYWORK_RIGHT_REAR_WINDOW",
  WINP_LF: "BODYWORK_WINDOW_LEFT_FRONT_PERCENT",
  WINP_RF: "BODYWORK_WINDOW_RIGHT_FRONT_PERCENT",
  WINP_LR: "BODYWORK_WINDOW_LEFT_REAR_PERCENT",
  WINP_RR: "BODYWORK_WINDOW_RIGHT_REAR_PERCENT",
  AC: "AC_POWER_STATE",
  AC_TEMP: "AC_TEMP_MAIN",
  LOW_BEAM: "LIGHT_LOW_BEAM_LIGHT",
  HAZARD: "BODYWORK_EMERGENCY_ALARM_STATE",
  TURN: "LIGHT_TURN_SIGNAL_LIGHT",
  FOG: "LIGHT_REAR_FOG_LAMPS",
  OUT_TEMP: "INSTRUMENT_DD_OUT_TEMP",
  // recarga
  CHARGING: "charging",
  CHARGER_STATE: "CHARGING_CHARGER_WORK_STATE",
  CHARGE_POWER: "CHARGING_CHARGE_POWER_DD",
  CHARGE_DISPLAY: "CHARGING_CHARGE_DISPLAY_DD",
  CHARGER_ACTIVE: "CHARGING_BATTERRY_DEVICE_STATE",
  PLUG: "CHARGING_CHARGER_CONNECT_STATE",
  GUN: "CHARGING_GUN_CONNECT_STATE",
  LIMIT: "CHARGING_STOP_QUANTITY_SETTING",
  FULL_H: "CHARGING_FULL_REST_HOUR",
  FULL_MIN: "CHARGING_FULL_REST_MINUTE",
  LAST_CHARGE: "last_charge",
  CHARGE_EVENT: "charge_event",
  // motores
  M_FRONT: "GB_FRONT_MOTOR_TEMP",
  M_REAR: "GB_TREAR_MOTOR_TEMP",
  IPM_FRONT: "GB_FRONT_MOTOR_IPM_TEMP",
  IPM_REAR: "GB_REAR_MOTOR_IPM_TEMP",
  BUS_FRONT: "GB_FRONT_MOTOR_BUS_VOLTAGE",
  BUS_REAR: "GB_REAR_MOTOR_BUS_VOLTAGE",
  RPM_FRONT: "ENGINE_FRONT_MOTOR_SPEED",
  RPM_REAR: "ENGINE_REAR_MOTOR_SPEED",
  TQ_FRONT: "ENGINE_FRONT_MOTOR_TORQUE",
  TQ_REAR: "ENGINE_REAR_MOTOR_TORQUE_F",
  TQ_REAR_TARGET: "GB_REAR_MOTOR_TARGET_TORQUE",
  I_FRONT: "CHARGING_DRIVER_MOTOR_CURRENT",
  I_REAR: "CHARGING_REAR_DRIVER_MOTOR_CURRENT",
  CAN_M_FRONT: "CAN_MOTOR_FRONT_C",
  CAN_M_REAR: "CAN_MOTOR_REAR_C",
  CAN_INV_FRONT: "CAN_INVERTER_FRONT_C",
  CAN_INV_REAR: "CAN_INVERTER_REAR_C",
  // pneus
  TP_LF: "INSTRUMENT_2IN1_LF_TYRE_PRESSURE",
  TP_RF: "INSTRUMENT_2IN1_RF_TYRE_PRESSURE",
  TP_LR: "INSTRUMENT_2IN1_LB_TYRE_PRESSURE",
  TP_RR: "INSTRUMENT_2IN1_RB_TYRE_PRESSURE",
  TT_LF: "INSTRUMENT_2IN1_LF_TYRE_TEMPERATURE",
  TT_RF: "INSTRUMENT_2IN1_RF_TYRE_TEMPERATURE",
  TT_LR: "INSTRUMENT_2IN1_LB_TYRE_TEMPERATURE",
  TT_RR: "INSTRUMENT_2IN1_RB_TYRE_TEMPERATURE",
  // app, conexão e sentinela
  CONNECTED: "connected",
  LAST_SENT: "last_sent",
  LOCATION: "location",
  SENTINEL_STATE: "sentinel_state",
  SENTINEL_SWITCH: "sentinel_switch",
  SENTINEL_PHOTO: "sentinel_photo",
  SENTINEL_EVENT: "sentinel_event",
  // câmeras pela internet (Push camera do HA)
  LIVE_SELECT: "live_select",
  LIVE_STATE: "live_state",
  VIDEO_LAST: "video_last",
  VIDEO_EVENT: "video_event",
};

// Câmeras Push criadas pelo YAML do usuário (docs/CAMERAS.md do app), não pelo app: entram se existirem.
const PUSH_LIVE = "camera.seal_ao_vivo";
const PUSH_ALERT = "camera.seal_alerta";

const DOMAIN_TITLES = {
  sensor: "Sensores",
  binary_sensor: "Liga/desliga",
  switch: "Interruptores",
  event: "Eventos",
  camera: "Câmeras",
  device_tracker: "Localização",
};

/** Ferramentas para montar cartões só com o que existe. */
class Ctx {
  constructor(vehicle, hass) {
    this.v = vehicle;
    this.hass = hass;
    // o app publica unique_id em minúsculas ("evmetrics_seal_statistic_soc_battery_percentage"); as chaves daqui
    // seguem o JSON do app (maiúsculas), então a busca é sempre em minúsculas
    this.map = {};
    for (const [key, entity] of Object.entries(vehicle.entities || {})) this.map[key.toLowerCase()] = entity;
  }

  /** entity_id da chave, ou undefined. */
  id(key) {
    return this.map[String(key).toLowerCase()];
  }

  has(...keys) {
    return keys.every((k) => this.id(k));
  }

  /** Linhas {entity, name, icon} das chaves que existem. */
  rows(list) {
    return list
      .map(([key, name, icon]) => {
        const entity = this.id(key);
        return entity ? { entity, ...(name ? { name } : {}), ...(icon ? { icon } : {}) } : null;
      })
      .filter(Boolean);
  }

  tile(key, name, extra = {}) {
    const entity = this.id(key);
    if (!entity) return null;
    return { type: "tile", entity, ...(name ? { name } : {}), grid_options: { columns: 6 }, ...extra };
  }

  glance(title, list, extra = {}) {
    const entities = this.rows(list);
    if (!entities.length) return null;
    return { type: "glance", ...(title ? { title } : {}), entities, state_color: true, ...extra };
  }

  entities(title, list, extra = {}) {
    const entities = Array.isArray(list[0]) ? this.rows(list) : list.filter(Boolean);
    if (!entities.length) return null;
    return { type: "entities", ...(title ? { title } : {}), entities, state_color: true, ...extra };
  }

  history(title, hours, list, extra = {}) {
    const entities = this.rows(list);
    if (!entities.length) return null;
    return { type: "history-graph", ...(title ? { title } : {}), hours_to_show: hours, entities, ...extra };
  }

  stats(title, days, list, extra = {}) {
    const entities = this.rows(list);
    if (!entities.length) return null;
    return {
      type: "statistics-graph",
      title,
      days_to_show: days,
      period: "day",
      chart_type: "line",
      stat_types: ["mean", "min", "max"],
      entities,
      ...extra,
    };
  }

  /** Atributo de uma entidade numa linha de cartão entities. */
  attr(key, attribute, name, suffix) {
    const entity = this.id(key);
    if (!entity) return null;
    return { type: "attribute", entity, attribute, name, ...(suffix ? { suffix } : {}) };
  }

  /** Seção com cabeçalho; some se não sobrou nenhum cartão. */
  section(heading, icon, cards, extra = {}, headingKeys = []) {
    const list = cards.flat().filter(Boolean);
    if (!list.length) return null;
    // estado das chaves de headingKeys à direita do cabeçalho
    const badges = headingKeys
      .map((k) => this.id(k))
      .filter(Boolean)
      .map((entity) => ({ type: "entity", entity, show_state: true, color: "state" }));
    const head = { type: "heading", heading, icon, ...(badges.length ? { badges } : {}) };
    return { type: "grid", cards: [head, ...list], ...extra };
  }

  /** Tile com o mini-gráfico do histórico embaixo (feature "trend-graph"). */
  trend(key, name, hours = 24, extra = {}) {
    return this.tile(key, name, { features: [{ type: "trend-graph", hours_to_show: hours }], ...extra });
  }

  /** Tile com barra de min a max (feature "bar-gauge"), para valores numa faixa conhecida. */
  bar(key, name, min, max, extra = {}) {
    return this.tile(key, name, { features: [{ type: "bar-gauge", min, max }], ...extra });
  }

  /** Badge de entidade (topo da view). */
  badge(key, name, extra = {}) {
    const entity = this.id(key);
    if (!entity) return null;
    return { type: "entity", entity, ...(name ? { name, show_name: true } : {}), ...extra };
  }

  /** Esconde o cartão enquanto a entidade não tem valor (carro desligado, sensor que só responde ligado). */
  known(card) {
    if (!card || !card.entity) return card;
    return {
      ...card,
      visibility: [
        ...(card.visibility || []),
        { condition: "state", entity: card.entity, state_not: ["unknown", "unavailable"] },
      ],
    };
  }

  view(title, path, icon, sections, extra = {}) {
    return {
      title,
      path,
      icon,
      type: "sections",
      max_columns: 3,
      badges: headerBadges(this),
      sections: sections.filter(Boolean),
      ...extra,
    };
  }

  /** Cartão só visível com a chave no estado dado. */
  when(card, key, state) {
    if (!card || !this.id(key)) return card;
    return { ...card, visibility: [{ condition: "state", entity: this.id(key), state }] };
  }
}

// ------------------------------------------------------------------------------------------------ cartão do carro

/** Imagem do carro com SOC, autonomia e ícones de estado por cima (picture-elements, cartão padrão do HA). */
function vehicleCard(c) {
  const label = (key, style, extra = {}) =>
    c.id(key) ? { type: "state-label", entity: c.id(key), style, ...extra } : null;
  const icon = (key, left, extra = {}) =>
    c.id(key)
      ? {
          type: "state-icon",
          entity: c.id(key),
          state_color: true,
          style: { top: "91%", left, "--mdc-icon-size": "24px" },
          ...extra,
        }
      : null;
  const soc = c.has(KEYS.SOC_FINE) ? KEYS.SOC_FINE : KEYS.SOC;
  const bigText = { "font-size": "26px", "font-weight": "600", "line-height": "1", color: "var(--primary-text-color)" };
  const smallText = { "font-size": "13px", "line-height": "1", color: "var(--secondary-text-color)" };
  const elements = [
    label(soc, { top: "10%", left: "5%", transform: "translate(0,-50%)", ...bigText }),
    label(KEYS.ENERGY, { top: "19%", left: "5%", transform: "translate(0,-50%)", ...smallText }),
    label(KEYS.RANGE, { top: "10%", right: "5%", transform: "translate(0,-50%)", ...bigText }),
    label(KEYS.CONS50, { top: "19%", right: "5%", transform: "translate(0,-50%)", ...smallText }),
    icon(KEYS.LOCK, "8%"),
    icon(KEYS.CHARGING, "19%"),
    icon(KEYS.CONNECTED, "30%"),
    icon(KEYS.SENTINEL_SWITCH, "41%", { icon: "mdi:cctv", tap_action: { action: "more-info" } }),
    icon(KEYS.AC, "52%", { icon: "mdi:air-conditioner" }),
    label(KEYS.POWER_LEVEL, { top: "91%", right: "5%", transform: "translate(0,-50%)", ...smallText }),
  ].filter(Boolean);
  // durante a recarga, a potência aparece no meio
  if (c.id(KEYS.CHARGING) && c.id(KEYS.CHARGE_POWER)) {
    elements.push({
      type: "conditional",
      conditions: [{ entity: c.id(KEYS.CHARGING), state: "on" }],
      elements: [
        {
          type: "state-label",
          entity: c.id(KEYS.CHARGE_POWER),
          prefix: "⚡ ",
          style: { top: "10%", left: "50%", ...bigText, color: "var(--success-color, #4caf50)" },
        },
      ],
    });
  }
  return {
    type: "picture-elements",
    image: c.v.image,
    elements,
    grid_options: { columns: 12 },
  };
}

function socGauge(c) {
  const key = c.has(KEYS.SOC_FINE) ? KEYS.SOC_FINE : KEYS.SOC;
  if (!c.id(key)) return null;
  return {
    type: "gauge",
    entity: c.id(key),
    name: "Bateria",
    min: 0,
    max: 100,
    needle: true,
    severity: { red: 0, yellow: 20, green: 50 },
    grid_options: { columns: 12 },
  };
}

/** Faixa de badges no topo de todas as views: o essencial do carro sempre à vista. */
function headerBadges(c) {
  const soc = c.has(KEYS.SOC_FINE) ? KEYS.SOC_FINE : KEYS.SOC;
  return [
    c.badge(soc, "Bateria"),
    c.badge(KEYS.RANGE, "Autonomia"),
    c.badge(KEYS.LOCK, "Portas"),
    c.when(c.badge(KEYS.CHARGE_POWER, "Carregando", { icon: "mdi:ev-station", color: "green" }), KEYS.CHARGING, "on"),
    c.badge(KEYS.SENTINEL_STATE, "Sentinela"),
    c.badge(KEYS.LAST_SENT, "Último envio"),
    c.when(c.badge(KEYS.CONNECTED, "App", { color: "red" }), KEYS.CONNECTED, "off"),
  ].filter(Boolean);
}

const HALF = { grid_options: { columns: 6 } };
const FULL = { grid_options: { columns: 12 } };

// ------------------------------------------------------------------------------------------------ views
// Grade de 3 colunas: cada seção é uma coluna (o mapa e os históricos largos ocupam 2), na ordem em que aparecem.

function viewCarro(c) {
  const v = c.v;
  const warning =
    v.app_version && v.min_app_version && compareVersions(v.app_version, v.min_app_version) < 0
      ? {
          type: "markdown",
          content: `⚠️ O app no carro está na versão **${v.app_version}**; este dashboard espera a **${v.min_app_version}** ou mais nova. Algumas informações podem faltar.`,
        }
      : null;

  // linha 1: o carro (1 coluna) + o mapa (2 colunas)
  const visao = c.section("Visão geral", "mdi:car-electric", [
    warning,
    vehicleCard(c),
    c.tile(KEYS.OUT_TEMP, "Externa"),
    c.known(c.tile(KEYS.GEAR, "Marcha", { icon: "mdi:car-shift-pattern" })),
    c.known(c.tile(KEYS.DRIVE_MODE, "Modo")),
    c.known(c.tile(KEYS.SPEED, "Velocidade")),
    c.tile(KEYS.ODO, "Hodômetro", { icon: "mdi:counter" }),
  ]);

  const mapa = c.id(KEYS.LOCATION)
    ? {
        type: "grid",
        column_span: 2,
        cards: [
          { type: "heading", heading: "Onde está", icon: "mdi:map-marker" },
          {
            type: "map",
            entities: [{ entity: c.id(KEYS.LOCATION) }, { entity: "zone.home" }],
            hours_to_show: 24,
            default_zoom: 15,
            theme_mode: "auto",
            grid_options: { columns: "full", rows: 9 },
          },
        ],
      }
    : null;

  // linha 2: portas e janelas, clima e luzes, conexão e 12 V
  const aberturas = [
    [KEYS.DOOR_LF, "Porta E", "mdi:car-door"],
    [KEYS.DOOR_RF, "Porta D", "mdi:car-door"],
    [KEYS.TRUNK, "Porta-malas", "mdi:car-back"],
    [KEYS.WIN_LF, "Janela DE", "mdi:car-windshield-outline"],
    [KEYS.WIN_RF, "Janela DD", "mdi:car-windshield-outline"],
    [KEYS.WIN_LR, "Janela TE", "mdi:car-windshield-outline"],
    [KEYS.WIN_RR, "Janela TD", "mdi:car-windshield-outline"],
  ];
  const janela = (pct, bin, name) => [c.id(pct) ? pct : bin, name, "mdi:car-windshield-outline"];
  const resumoAberturas = [
    [KEYS.LOCK, "Trava", "mdi:car-door-lock"],
    [KEYS.DOOR_LF, "Porta E", "mdi:car-door"],
    [KEYS.DOOR_RF, "Porta D", "mdi:car-door"],
    [KEYS.TRUNK, "Porta-malas", "mdi:car-back"],
    janela(KEYS.WINP_LF, KEYS.WIN_LF, "Janela DE"),
    janela(KEYS.WINP_RF, KEYS.WIN_RF, "Janela DD"),
    janela(KEYS.WINP_LR, KEYS.WIN_LR, "Janela TE"),
    janela(KEYS.WINP_RR, KEYS.WIN_RR, "Janela TD"),
  ];
  const abertoAgora = c.rows(aberturas);
  const portas = c.section(
    "Portas e janelas",
    "mdi:car-door",
    [
      abertoAgora.length
        ? {
            type: "entity-filter",
            entities: abertoAgora,
            conditions: [{ state: "on" }],
            show_empty: false,
            card: { type: "entities", title: "⚠️ Aberto agora", state_color: true },
          }
        : null,
      c.glance(null, resumoAberturas, { columns: 4 }),
    ],
    {},
    [KEYS.LOCK]
  );

  const clima = c.section("Clima e luzes", "mdi:air-conditioner", [
    c.tile(KEYS.AC, "Ar-condicionado", { icon: "mdi:air-conditioner" }),
    c.known(c.tile(KEYS.AC_TEMP, "Temperatura do ar")),
    c.glance(
      null,
      [
        [KEYS.LOW_BEAM, "Farol", "mdi:car-light-dimmed"],
        [KEYS.FOG, "Neblina", "mdi:car-light-fog"],
        [KEYS.HAZARD, "Alerta", "mdi:hazard-lights"],
        [KEYS.TURN, "Setas", "mdi:arrow-left-right"],
        [KEYS.PARK, "Freio de mão", "mdi:car-brake-parking"],
      ],
      { columns: 5 }
    ),
  ]);

  const conexao = c.section("Conexão e 12 V", "mdi:car-battery", [
    c.tile(KEYS.CONNECTED, "App conectado"),
    c.tile(KEYS.LAST_SENT, "Último envio"),
    c.trend(KEYS.V12, "Bateria 12 V", 48, { ...FULL, icon: "mdi:car-battery" }),
    c.tile(KEYS.DCDC, "DC-DC", { icon: "mdi:current-dc" }),
    c.tile(KEYS.AWAKE, "Tempo acordado", { icon: "mdi:timer-outline" }),
    c.history(null, 24, [
      [KEYS.CONNECTED, "Conectado"],
      [KEYS.POWER_LEVEL, "Energia"],
      [KEYS.CHARGING, "Carregando"],
    ]),
  ]);

  return c.view(v.title, "carro", "mdi:car-electric", [visao, mapa, portas, clima, conexao]);
}

function viewSentinela(c) {
  const evento = c.entities(null, [
    c.id(KEYS.SENTINEL_EVENT) ? { entity: c.id(KEYS.SENTINEL_EVENT), name: "Último evento" } : null,
    c.attr(KEYS.SENTINEL_EVENT, "event_type", "Tipo"),
    c.attr(KEYS.SENTINEL_EVENT, "objects", "O que viu"),
    c.attr(KEYS.SENTINEL_EVENT, "at", "Hora do disparo"),
    c.attr(KEYS.SENTINEL_STATE, "reason", "Motivo"),
    c.attr(KEYS.SENTINEL_STATE, "profile", "Área"),
  ]);
  const sentinela = c.section("Sentinela", "mdi:cctv", [
    c.tile(KEYS.SENTINEL_STATE, "Estado"),
    c.tile(KEYS.SENTINEL_SWITCH, "Ativo", {
      icon: "mdi:cctv",
      features: [{ type: "toggle" }],
      features_position: "inline",
    }),
    evento,
  ]);

  const foto = c.id(KEYS.SENTINEL_PHOTO)
    ? c.section("Último disparo", "mdi:camera", [
        {
          type: "picture-entity",
          entity: c.id(KEYS.SENTINEL_PHOTO),
          show_name: false,
          show_state: false,
          camera_view: "auto",
        },
      ])
    : null;

  const logbookTargets = [c.id(KEYS.SENTINEL_EVENT), c.id(KEYS.SENTINEL_STATE)].filter(Boolean);
  const historico = logbookTargets.length
    ? c.section("Disparos", "mdi:history", [
        { type: "logbook", hours_to_show: 72, target: { entity_id: logbookTargets } },
      ])
    : null;

  // câmeras ao vivo (opção da integração): somem enquanto estão indisponíveis (carro fora da rede)
  // as câmeras Push têm a seção delas (pushCameras): não repetem aqui se também estiverem na opção
  const cams = (c.v.cameras || []).filter((e) => e !== PUSH_LIVE && e !== PUSH_ALERT);
  const aoVivo = cams.length
    ? c.section(
        "Ao vivo",
        "mdi:video",
        cams.map((entity) =>
          c.known({
            type: "picture-entity",
            entity,
            show_state: false,
            camera_view: "live",
            grid_options: { columns: cams.length > 1 ? 6 : 12 },
          })
        ),
        cams.length > 1 ? { column_span: 2 } : {}
      )
    : null;

  return c.view("Sentinela", "sentinela", "mdi:cctv", [sentinela, foto, historico, aoVivo, pushCameras(c)]);
}

/** Câmeras pela internet: escolha do ao vivo, estado, imagens das câmeras Push e o vídeo do último alerta. */
function pushCameras(c) {
  const exists = (entity) => Boolean(c.hass && c.hass.states && c.hass.states[entity]);
  const live = exists(PUSH_LIVE)
    ? {
        type: "picture-entity",
        entity: PUSH_LIVE,
        name: "Ao vivo",
        show_state: false,
        camera_view: "live",
        grid_options: { columns: 12 },
      }
    : null;
  // a imagem ao vivo só aparece enquanto o carro transmite
  const liveCard =
    live && c.id(KEYS.LIVE_STATE)
      ? {
          ...live,
          visibility: [{ condition: "state", entity: c.id(KEYS.LIVE_STATE), state: ["iniciando", "transmitindo"] }],
        }
      : live;
  const videoBtn = c.id(KEYS.VIDEO_LAST)
    ? c.tile(KEYS.VIDEO_LAST, "Enviar vídeo do último alerta", {
        tap_action: { action: "perform-action", perform_action: "button.press", target: { entity_id: c.id(KEYS.VIDEO_LAST) } },
        grid_options: { columns: 12 },
      })
    : null;
  return c.section(
    "Câmeras pela internet",
    "mdi:cctv",
    [
      c.tile(KEYS.LIVE_SELECT, "Câmera ao vivo", { features: [{ type: "select-options" }], grid_options: { columns: 12 } }),
      c.entities(null, [
        c.id(KEYS.LIVE_STATE) ? { entity: c.id(KEYS.LIVE_STATE), name: "Ao vivo" } : null,
        c.attr(KEYS.LIVE_STATE, "frames", "Imagens"),
        c.attr(KEYS.LIVE_STATE, "kb", "Enviado", "KB"),
        c.attr(KEYS.LIVE_STATE, "route", "Rota"),
        c.attr(KEYS.LIVE_STATE, "error", "Erro"),
        c.attr(KEYS.LIVE_STATE, "month_4g_mb", "4G no mês", "MB"),
        c.attr(KEYS.LIVE_STATE, "limit_4g_mb", "Limite do 4G", "MB"),
      ]),
      liveCard,
      exists(PUSH_ALERT)
        ? {
            type: "picture-entity",
            entity: PUSH_ALERT,
            name: "Último alerta",
            show_state: false,
            camera_view: "live",
            grid_options: { columns: 12 },
          }
        : null,
      videoBtn,
      c.entities(null, [
        c.id(KEYS.VIDEO_EVENT) ? { entity: c.id(KEYS.VIDEO_EVENT), name: "Vídeo do sentinela" } : null,
        c.attr(KEYS.VIDEO_EVENT, "event_type", "Resultado"),
        c.attr(KEYS.VIDEO_EVENT, "mb", "Tamanho", "MB"),
        c.attr(KEYS.VIDEO_EVENT, "error", "Erro"),
      ]),
    ],
    {},
    [KEYS.LIVE_STATE]
  );
}

function viewEnergia(c) {
  const bateria = c.section("Bateria", "mdi:battery-high", [
    socGauge(c),
    c.tile(KEYS.ENERGY, "Energia restante"),
    c.tile(KEYS.RANGE, "Autonomia"),
    c.trend(KEYS.CURRENT, "Corrente", 24, FULL),
    c.tile(KEYS.DISCH_MAX, "Descarga máx."),
    c.tile(KEYS.CHG_MAX, "Recarga máx."),
    c.entities("Saúde", [
      [KEYS.SOH, "SOH (BYD)"],
      [KEYS.SOH_CALC, "SOH calculado"],
      [KEYS.CAPACITY, "Capacidade"],
    ]),
  ]);

  const carregando = c.when(
    {
      type: "gauge",
      entity: c.id(KEYS.CHARGE_POWER),
      name: "Potência de carga",
      min: 0,
      max: 150,
      needle: true,
      severity: { green: 0, yellow: 11.5, red: 100 },
      grid_options: { columns: 12 },
    },
    KEYS.CHARGING,
    "on"
  );
  const ultima = c.entities("Última recarga", [
    c.id(KEYS.LAST_CHARGE) ? { entity: c.id(KEYS.LAST_CHARGE), name: "Energia (pack)" } : null,
    c.attr(KEYS.LAST_CHARGE, "kwh_byd", "Energia (BYD)", "kWh"),
    c.attr(KEYS.LAST_CHARGE, "soc_start", "SOC início", "%"),
    c.attr(KEYS.LAST_CHARGE, "soc_end", "SOC fim", "%"),
    c.attr(KEYS.LAST_CHARGE, "duration_min", "Duração", "min"),
    c.attr(KEYS.LAST_CHARGE, "type", "Tipo"),
    c.attr(KEYS.LAST_CHARGE, "peak_kw", "Pico", "kW"),
    c.attr(KEYS.LAST_CHARGE, "avg_kw", "Média", "kW"),
    c.attr(KEYS.LAST_CHARGE, "cell_delta_max_mv", "Diferença máx. células", "mV"),
    c.attr(KEYS.LAST_CHARGE, "result", "Resultado"),
    c.id(KEYS.CHARGE_EVENT) ? { entity: c.id(KEYS.CHARGE_EVENT), name: "Último evento" } : null,
  ]);
  const recarga = c.section("Recarga", "mdi:ev-station", [
    c.id(KEYS.CHARGE_POWER) ? carregando : null,
    c.when(
      c.glance(
        null,
        [
          [KEYS.SOC, "SOC"],
          [KEYS.LIMIT, "Limite"],
          [KEYS.FULL_H, "Faltam (h)"],
          [KEYS.FULL_MIN, "(min)"],
        ],
        { columns: 4 }
      ),
      KEYS.CHARGING,
      "on"
    ),
    c.tile(KEYS.CHARGING, "Carregando"),
    c.tile(KEYS.PLUG, "Plugue"),
    c.known(c.tile(KEYS.GUN, "Conector")),
    c.known(c.tile(KEYS.CHARGE_DISPLAY, "Estado no painel")),
    ultima,
  ]);

  const celulas = c.section("Células e temperaturas", "mdi:car-battery", [
    c.tile(KEYS.CAN_MIN, "Mínima"),
    c.tile(KEYS.CAN_MAX, "Máxima"),
    c.trend(KEYS.CAN_DELTA, "Diferença", 24, FULL),
    c.tile(KEYS.PACK_V, "Pack"),
    c.tile(KEYS.CAN_AVG, "Média"),
    c.entities(null, [
      [KEYS.CAN_MIN_NUM, "Nº da mínima"],
      [KEYS.CAN_MAX_NUM, "Nº da máxima"],
      [KEYS.BYD_DELTA, "Diferença (BYD)"],
      [KEYS.TEMP_MIN, "Temperatura mín."],
      [KEYS.TEMP_AVG, "Temperatura média"],
      [KEYS.TEMP_MAX, "Temperatura máx."],
    ]),
  ]);

  // linha 2: históricos (2 colunas) + BMS
  const historico = c.section(
    "Últimas 24 h",
    "mdi:chart-line",
    [
      c.history(
        "Células",
        24,
        [
          [KEYS.CELL_MIN, "Mínima"],
          [KEYS.CELL_MAX, "Máxima"],
        ],
        HALF
      ),
      c.history(
        "Temperatura da bateria",
        24,
        [
          [KEYS.TEMP_MIN, "Mín."],
          [KEYS.TEMP_MAX, "Máx."],
          [KEYS.OUT_TEMP, "Externa"],
        ],
        HALF
      ),
      c.history(
        "Recarga",
        24,
        [
          [KEYS.CHARGE_POWER, "Potência de carga"],
          [KEYS.SOC, "SOC"],
        ],
        FULL
      ),
    ],
    { column_span: 2 }
  );

  // leitura do BMS por UDS: chaves BMS_* (acumulados e balanceamento); entram todas as que existirem
  const bmsKeys = Object.keys(c.map)
    .filter((k) => k.startsWith("bms_"))
    .sort();
  const bms = bmsKeys.length
    ? c.section("BMS", "mdi:chip", [c.entities(null, bmsKeys.map((k) => ({ entity: c.map[k] })))])
    : null;

  return c.view("Energia", "energia", "mdi:battery-charging", [bateria, recarga, celulas, historico, bms]);
}

function viewConducao(c) {
  const modos = c.glance(
    null,
    [
      [KEYS.REGEN, "Regeneração", "mdi:battery-sync"],
      [KEYS.SNOW, "Modo neve", "mdi:snowflake"],
      [KEYS.ESC, "ESC", "mdi:car-traction-control"],
    ],
    { columns: 3 }
  );
  const conducao = c.section("Condução", "mdi:steering", [
    c.known(c.tile(KEYS.GEAR, "Marcha", { icon: "mdi:car-shift-pattern" })),
    c.known(c.tile(KEYS.SPEED, "Velocidade", { icon: "mdi:speedometer" })),
    c.known(c.tile(KEYS.DRIVE_MODE, "Modo", { icon: "mdi:car-cog", ...FULL })),
    modos,
    c.known(c.trend(KEYS.TRACTION, "Potência de tração", 1, FULL)),
    c.known(c.bar(KEYS.ACCEL, "Acelerador", 0, 100, { icon: "mdi:car-cruise-control" })),
    c.known(c.bar(KEYS.BRAKE, "Freio", 0, 100, { icon: "mdi:car-brake-alert" })),
    c.known(c.tile(KEYS.STEER, "Volante", { icon: "mdi:steering", ...FULL })),
    c.known(c.tile(KEYS.SLOPE, "Inclinação", { icon: "mdi:slope-uphill", ...FULL })),
  ]);

  // pneus na posição do carro: dianteiros em cima, esquerda à esquerda
  const pneus = c.section("Pneus", "mdi:car-tire-alert", [
    c.tile(KEYS.TP_LF, "Dianteiro E", { icon: "mdi:tire" }),
    c.tile(KEYS.TP_RF, "Dianteiro D", { icon: "mdi:tire" }),
    c.tile(KEYS.TP_LR, "Traseiro E", { icon: "mdi:tire" }),
    c.tile(KEYS.TP_RR, "Traseiro D", { icon: "mdi:tire" }),
    c.glance(
      "Temperatura",
      [
        [KEYS.TT_LF, "DE"],
        [KEYS.TT_RF, "DD"],
        [KEYS.TT_LR, "TE"],
        [KEYS.TT_RR, "TD"],
      ],
      { columns: 4 }
    ),
  ]);

  const viagem = c.section("Viagem", "mdi:map-marker-distance", [
    c.tile(KEYS.ODO, "Hodômetro", { icon: "mdi:counter" }),
    c.tile(KEYS.CONS50, "Últimos 50 km", { icon: "mdi:lightning-bolt" }),
    c.entities(null, [
      [KEYS.TRIP1, "Parcial 1", "mdi:map-marker-distance"],
      [KEYS.TRIP2, "Parcial 2", "mdi:map-marker-distance"],
      [KEYS.DRIVE_TIME, "Tempo dirigindo", "mdi:timer-outline"],
      [KEYS.CONS_TOTAL, "Consumo total", "mdi:lightning-bolt-outline"],
    ]),
  ]);

  // linha 2: motores lado a lado (2 colunas se tiver os dois) + gráfico de temperaturas (1 coluna)
  const traseiro = c.entities(
    "Traseiro (principal)",
    [
      [KEYS.M_REAR, "Motor"],
      [KEYS.IPM_REAR, "Inversor"],
      [KEYS.CAN_M_REAR, "Motor (CAN)"],
      [KEYS.CAN_INV_REAR, "Inversor (CAN)"],
      [KEYS.RPM_REAR, "Rotação", "mdi:rotate-right"],
      [KEYS.TQ_REAR, "Torque", "mdi:cog"],
      [KEYS.TQ_REAR_TARGET, "Torque alvo", "mdi:cog-outline"],
      [KEYS.I_REAR, "Corrente", "mdi:current-ac"],
      [KEYS.BUS_REAR, "Barramento", "mdi:current-dc"],
    ],
    FULL
  );
  const dianteiro = c.entities(
    "Dianteiro",
    [
      [KEYS.M_FRONT, "Motor"],
      [KEYS.IPM_FRONT, "Inversor"],
      [KEYS.CAN_M_FRONT, "Motor (CAN)"],
      [KEYS.CAN_INV_FRONT, "Inversor (CAN)"],
      [KEYS.RPM_FRONT, "Rotação", "mdi:rotate-right"],
      [KEYS.TQ_FRONT, "Torque", "mdi:cog"],
      [KEYS.I_FRONT, "Corrente", "mdi:current-ac"],
      [KEYS.BUS_FRONT, "Barramento", "mdi:current-dc"],
    ],
    FULL
  );
  const motores = c.section(
    "Motores",
    "mdi:engine",
    [traseiro, dianteiro],
    traseiro && dianteiro ? { column_span: 2 } : {}
  );

  const temperaturas = c.section("Temperaturas dos motores (24 h)", "mdi:thermometer", [
    c.history(null, 24, [
      [KEYS.M_REAR, "Motor T"],
      [KEYS.M_FRONT, "Motor D"],
      [KEYS.IPM_REAR, "Inversor T"],
      [KEYS.IPM_FRONT, "Inversor D"],
    ]),
  ]);

  return c.view("Condução", "conducao", "mdi:steering", [conducao, pneus, viagem, motores, temperaturas]);
}

function viewGraficos(c) {
  const change = (title, days, period, list, chart_type = "bar") =>
    c.stats(title, days, list, { stat_types: ["change"], period, chart_type });
  const uso = c.section("Uso", "mdi:chart-bar", [
    change("Percurso diário", 30, "day", [[KEYS.ODO, "km"]]),
    change("Energia consumida por dia", 30, "day", [[KEYS.CONS_TOTAL, "kWh"]]),
    c.stats("Consumo últimos 50 km (média diária)", 30, [[KEYS.CONS50]], { stat_types: ["mean"] }),
  ]);
  const bateria = c.section("Bateria", "mdi:chart-line", [
    c.stats("Diferença entre células (7 dias)", 7, [[KEYS.CAN_DELTA], [KEYS.BYD_DELTA]], {
      period: "hour",
      stat_types: ["max"],
    }),
    c.stats("SOC (30 dias)", 30, [[KEYS.SOC]]),
    c.stats("SOH (90 dias)", 90, [[KEYS.SOH], [KEYS.SOH_CALC]], { period: "week", stat_types: ["mean"] }),
  ]);
  const doze = c.section("12 V e motores", "mdi:car-battery", [
    c.stats("Bateria 12 V (14 dias)", 14, [[KEYS.V12]]),
    c.history("Motores (24 h)", 24, [
      [KEYS.M_REAR, "Motor T"],
      [KEYS.M_FRONT, "Motor D"],
      [KEYS.BUS_REAR, "Barramento T"],
      [KEYS.BUS_FRONT, "Barramento D"],
    ]),
  ]);
  return c.view("Gráficos", "graficos", "mdi:chart-line", [uso, bateria, doze]);
}

/** Todas as entidades do carro, por domínio: sensores novos do app aparecem aqui sem atualizar o pacote. */
function viewTodos(c) {
  const name = (entity) => c.hass.states[entity]?.attributes?.friendly_name || entity;
  const byDomain = {};
  for (const entity of Object.values(c.map)) {
    const domain = entity.split(".")[0];
    (byDomain[domain] = byDomain[domain] || []).push(entity);
  }
  const sections = Object.keys(byDomain)
    .sort((a, b) => (a === "sensor" ? -1 : b === "sensor" ? 1 : a.localeCompare(b)))
    .map((domain) =>
      c.section(
        DOMAIN_TITLES[domain] || domain,
        "mdi:format-list-bulleted",
        [
          c.entities(
            null,
            byDomain[domain].sort((a, b) => name(a).localeCompare(name(b), "pt-BR")).map((entity) => ({ entity }))
          ),
        ],
        domain === "sensor" ? { column_span: 2 } : {}
      )
    );
  return c.view("Todos", "todos", "mdi:format-list-bulleted", sections);
}

// ------------------------------------------------------------------------------------------------ strategy

function compareVersions(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function messageDashboard(title, text) {
  return {
    title,
    views: [{ title, path: "evmetrics", type: "panel", cards: [{ type: "markdown", content: text }] }],
  };
}

export async function generateDashboard(config, hass) {
  let vehicles;
  try {
    vehicles = await hass.callWS({
      type: "evmetrics/vehicles",
      ...(config && config.entry_id ? { entry_id: config.entry_id } : {}),
    });
  } catch (err) {
    return messageDashboard(
      "EvMetrics",
      "A integração **EvMetrics** não respondeu. Confira se ela está instalada e configurada em " +
        "Configurações › Dispositivos e serviços.\n\n`" +
        (err && err.message ? err.message : String(err)) +
        "`"
    );
  }
  if (!vehicles || !vehicles.length) {
    return messageDashboard(
      "EvMetrics",
      "Nenhum carro configurado. Adicione a integração **EvMetrics** em Configurações › Dispositivos e serviços " +
        "(ela aparece sozinha como descoberta quando o app conecta ao MQTT)."
    );
  }
  const vehicle = vehicles[0];
  if (!vehicle.entities || !Object.keys(vehicle.entities).length) {
    return messageDashboard(
      vehicle.title,
      "Ainda não há entidades deste carro. O app EvMetrics precisa estar conectado ao MQTT com o Discovery ligado."
    );
  }
  const c = new Ctx(vehicle, hass);
  return {
    title: vehicle.title,
    views: [viewCarro(c), viewSentinela(c), viewEnergia(c), viewConducao(c), viewGraficos(c), viewTodos(c)],
  };
}

if (typeof customElements !== "undefined") {
  class EvMetricsDashboardStrategy extends HTMLElement {
    static async generate(config, hass) {
      return generateDashboard(config, hass);
    }

    // refaz o dashboard quando entidades ou dispositivos mudam (sensor novo do app, entidade renomeada)
    static get registryDependencies() {
      return ["entities", "devices"];
    }
  }

  if (!customElements.get("ll-strategy-dashboard-evmetrics")) {
    customElements.define("ll-strategy-dashboard-evmetrics", EvMetricsDashboardStrategy);
  }

  // aparece em Configurações › Painéis › Adicionar painel (para quem quer um dashboard próprio, editável)
  window.customStrategies = window.customStrategies || [];
  if (!window.customStrategies.some((s) => s.type === "evmetrics")) {
    window.customStrategies.push({
      type: "evmetrics",
      strategyType: "dashboard",
      name: "EvMetrics (carro)",
      description: "Painel do carro do app EvMetrics: bateria, recarga, sentinela, condução e gráficos.",
      documentationURL: "https://github.com/julianohmaas/evmetrics-ha",
    });
  }
}

export { KEYS };
