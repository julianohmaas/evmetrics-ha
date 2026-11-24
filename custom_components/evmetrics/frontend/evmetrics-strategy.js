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
};

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

  /** Linhas {entity, name} das chaves que existem. */
  rows(list) {
    return list
      .map(([key, name]) => {
        const entity = this.id(key);
        return entity ? (name ? { entity, name } : { entity }) : null;
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
  section(heading, icon, cards, extra = {}) {
    const list = cards.flat().filter(Boolean);
    if (!list.length) return null;
    return { type: "grid", cards: [{ type: "heading", heading, icon }, ...list], ...extra };
  }

  view(title, path, icon, sections, extra = {}) {
    return {
      title,
      path,
      icon,
      type: "sections",
      max_columns: 3,
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
          style: { top: "90%", left, "--mdc-icon-size": "26px" },
          ...extra,
        }
      : null;
  const soc = c.has(KEYS.SOC_FINE) ? KEYS.SOC_FINE : KEYS.SOC;
  const bigText = { "font-size": "28px", "font-weight": "600", color: "var(--primary-text-color)" };
  const smallText = { "font-size": "14px", color: "var(--secondary-text-color)" };
  const elements = [
    label(soc, { top: "11%", left: "5%", transform: "translate(0,-50%)", ...bigText }),
    label(KEYS.ENERGY, { top: "24%", left: "5%", transform: "translate(0,-50%)", ...smallText }),
    label(KEYS.RANGE, { top: "11%", right: "5%", transform: "translate(0,-50%)", ...bigText }),
    label(KEYS.CONS50, { top: "24%", right: "5%", transform: "translate(0,-50%)", ...smallText }),
    icon(KEYS.LOCK, "8%"),
    icon(KEYS.CHARGING, "20%"),
    icon(KEYS.CONNECTED, "32%"),
    icon(KEYS.SENTINEL_SWITCH, "44%", { tap_action: { action: "more-info" } }),
    icon(KEYS.AC, "56%"),
    label(KEYS.POWER_LEVEL, { top: "90%", right: "5%", transform: "translate(0,-50%)", ...smallText }),
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
          style: { top: "11%", left: "50%", ...bigText, color: "var(--success-color, #4caf50)" },
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
    grid_options: { columns: 6 },
  };
}

// ------------------------------------------------------------------------------------------------ views

function viewCarro(c) {
  const v = c.v;
  const warning =
    v.app_version && v.min_app_version && compareVersions(v.app_version, v.min_app_version) < 0
      ? {
          type: "markdown",
          content: `⚠️ O app no carro está na versão **${v.app_version}**; este dashboard espera a **${v.min_app_version}** ou mais nova. Algumas informações podem faltar.`,
        }
      : null;

  const visao = c.section("Visão geral", "mdi:car-electric", [
    warning,
    vehicleCard(c),
    socGauge(c),
    c.tile(KEYS.RANGE, "Autonomia"),
    c.tile(KEYS.GEAR, "Marcha"),
    c.tile(KEYS.SPEED, "Velocidade"),
    c.tile(KEYS.OUT_TEMP, "Externa"),
    c.tile(KEYS.AC_TEMP, "Ar ajustado"),
    c.tile(KEYS.V12, "Bateria 12 V"),
    c.tile(KEYS.DRIVE_MODE, "Modo"),
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
            default_zoom: 14,
            theme_mode: "auto",
            grid_options: { columns: "full", rows: 8 },
          },
        ],
      }
    : null;

  const aberturas = [
    [KEYS.DOOR_LF, "Porta E"],
    [KEYS.DOOR_RF, "Porta D"],
    [KEYS.TRUNK, "Porta-malas"],
    [KEYS.WIN_LF, "Janela DE"],
    [KEYS.WIN_RF, "Janela DD"],
    [KEYS.WIN_LR, "Janela TE"],
    [KEYS.WIN_RR, "Janela TD"],
  ];
  const abertoAgora = c.rows([[KEYS.LOCK, "Destrancado"], ...aberturas]);
  const carro = c.section("Carro", "mdi:car-door", [
    abertoAgora.length
      ? {
          type: "entity-filter",
          entities: abertoAgora,
          conditions: [{ state: "on" }],
          show_empty: false,
          card: { type: "entities", title: "⚠️ Aberto agora", state_color: true },
        }
      : null,
    c.glance("Portas e janelas", [[KEYS.LOCK, "Trava"], ...aberturas], { columns: 4 }),
    c.glance(
      "Luzes",
      [
        [KEYS.LOW_BEAM, "Farol"],
        [KEYS.FOG, "Neblina"],
        [KEYS.HAZARD, "Alerta"],
        [KEYS.TURN, "Setas"],
        [KEYS.PARK, "Freio de mão"],
        [KEYS.AC, "Ar"],
      ],
      { columns: 3 }
    ),
    c.tile(KEYS.CONNECTED, "App conectado"),
    c.tile(KEYS.LAST_SENT, "Último envio"),
    c.history(null, 48, [
      [KEYS.CONNECTED, "Conectado"],
      [KEYS.POWER_LEVEL, "Energia"],
      [KEYS.CHARGING, "Carregando"],
    ]),
  ]);

  const repouso = c.section("12 V e repouso", "mdi:car-battery", [
    c.tile(KEYS.V12, "12 V"),
    c.tile(KEYS.DCDC, "DC-DC"),
    c.tile(KEYS.AWAKE, "Tempo acordado"),
    c.tile(KEYS.CURRENT, "Corrente do pack"),
    c.history("12 V, DC-DC e tempo acordado (48 h)", 48, [
      [KEYS.V12, "12 V"],
      [KEYS.DCDC, "DC-DC"],
      [KEYS.AWAKE, "Tempo acordado"],
    ]),
    c.history("SOC em repouso (48 h)", 48, [[KEYS.SOC_FINE, "SOC"]]),
  ]);

  return c.view(v.title, "carro", "mdi:car-electric", [visao, mapa, carro, repouso]);
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
  const foto = c.id(KEYS.SENTINEL_PHOTO)
    ? {
        type: "picture-entity",
        entity: c.id(KEYS.SENTINEL_PHOTO),
        name: "Último disparo",
        show_state: false,
        camera_view: "auto",
      }
    : null;
  const sentinela = c.section("Sentinela", "mdi:cctv", [
    c.tile(KEYS.SENTINEL_STATE, "Sentinela"),
    c.tile(KEYS.SENTINEL_SWITCH, "Ativo", {
      features: [{ type: "toggle" }],
      features_position: "inline",
    }),
    foto,
    evento,
  ]);

  const logbookTargets = [c.id(KEYS.SENTINEL_EVENT), c.id(KEYS.SENTINEL_STATE)].filter(Boolean);
  const historico = logbookTargets.length
    ? c.section("Disparos", "mdi:history", [
        { type: "logbook", hours_to_show: 72, target: { entity_id: logbookTargets } },
      ])
    : null;

  const cameras = (c.v.cameras || []).map((entity) => ({
    type: "picture-entity",
    entity,
    show_state: false,
    camera_view: "live",
  }));
  const aoVivo = cameras.length ? c.section("Ao vivo", "mdi:video", cameras) : null;

  return c.view("Sentinela", "sentinela", "mdi:cctv", [sentinela, aoVivo, historico]);
}

function viewEnergia(c) {
  const bateria = c.section("Bateria", "mdi:battery-high", [
    socGauge(c),
    c.tile(KEYS.ENERGY, "Energia restante"),
    c.tile(KEYS.RANGE, "Autonomia"),
    c.tile(KEYS.CURRENT, "Corrente"),
    c.tile(KEYS.DISCH_MAX, "Descarga máx."),
    c.tile(KEYS.CHG_MAX, "Recarga máx."),
    c.entities("Saúde", [
      [KEYS.SOH, "SOH (BYD)"],
      [KEYS.SOH_CALC, "SOH calculado"],
      [KEYS.CAPACITY, "Capacidade"],
    ]),
  ]);

  const celulas = c.section("Células e temperaturas", "mdi:car-battery", [
    c.tile(KEYS.CAN_MIN, "Mínima"),
    c.tile(KEYS.CAN_MAX, "Máxima"),
    c.tile(KEYS.CAN_DELTA, "Diferença"),
    c.tile(KEYS.PACK_V, "Pack"),
    c.entities(null, [
      [KEYS.CAN_AVG, "Média"],
      [KEYS.CAN_MIN_NUM, "Nº da mínima"],
      [KEYS.CAN_MAX_NUM, "Nº da máxima"],
      [KEYS.BYD_DELTA, "Diferença (BYD)"],
      [KEYS.TEMP_MIN, "Temperatura mín."],
      [KEYS.TEMP_AVG, "Temperatura média"],
      [KEYS.TEMP_MAX, "Temperatura máx."],
    ]),
    c.history("Células (24 h)", 24, [
      [KEYS.CELL_MIN, "Mínima"],
      [KEYS.CELL_MAX, "Máxima"],
    ]),
    c.history("Temperatura da bateria (24 h)", 24, [
      [KEYS.TEMP_MIN, "Mín."],
      [KEYS.TEMP_MAX, "Máx."],
      [KEYS.OUT_TEMP, "Externa"],
    ]),
  ]);

  // leitura do BMS por UDS: chaves BMS_* (acumulados e balanceamento); entram todas as que existirem
  const bmsKeys = Object.keys(c.map)
    .filter((k) => k.startsWith("bms_"))
    .sort();
  const bms = bmsKeys.length
    ? c.section("BMS", "mdi:chip", [c.entities(null, bmsKeys.map((k) => ({ entity: c.map[k] })))])
    : null;

  const carregando = c.when(
    {
      type: "gauge",
      entity: c.id(KEYS.CHARGE_POWER),
      name: "Potência de carga",
      min: 0,
      max: 150,
      needle: true,
      severity: { green: 0, yellow: 11.5, red: 100 },
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
    c.tile(KEYS.GUN, "Conector"),
    c.tile(KEYS.CHARGE_DISPLAY, "Estado no painel"),
    ultima,
    c.history(null, 24, [
      [KEYS.CHARGE_POWER, "Potência de carga"],
      [KEYS.SOC, "SOC"],
    ]),
  ]);

  return c.view("Energia", "energia", "mdi:battery-charging", [bateria, recarga, celulas, bms]);
}

function viewConducao(c) {
  const conducao = c.section("Condução", "mdi:steering", [
    c.tile(KEYS.DRIVE_MODE, "Modo"),
    c.tile(KEYS.REGEN, "Regeneração"),
    c.tile(KEYS.SNOW, "Modo neve"),
    c.tile(KEYS.ESC, "ESC"),
    c.tile(KEYS.TRACTION, "Potência de tração"),
    c.tile(KEYS.SPEED, "Velocidade"),
    c.tile(KEYS.ACCEL, "Acelerador"),
    c.tile(KEYS.BRAKE, "Freio"),
    c.tile(KEYS.STEER, "Volante"),
    c.tile(KEYS.SLOPE, "Inclinação"),
  ]);

  const motores = c.section("Motores", "mdi:engine", [
    c.entities("Traseiro (principal)", [
      [KEYS.M_REAR, "Motor"],
      [KEYS.IPM_REAR, "Inversor"],
      [KEYS.CAN_M_REAR, "Motor (CAN)"],
      [KEYS.CAN_INV_REAR, "Inversor (CAN)"],
      [KEYS.RPM_REAR, "Rotação"],
      [KEYS.TQ_REAR, "Torque"],
      [KEYS.TQ_REAR_TARGET, "Torque alvo"],
      [KEYS.I_REAR, "Corrente"],
      [KEYS.BUS_REAR, "Barramento"],
    ]),
    c.entities("Dianteiro", [
      [KEYS.M_FRONT, "Motor"],
      [KEYS.IPM_FRONT, "Inversor"],
      [KEYS.CAN_M_FRONT, "Motor (CAN)"],
      [KEYS.CAN_INV_FRONT, "Inversor (CAN)"],
      [KEYS.RPM_FRONT, "Rotação"],
      [KEYS.TQ_FRONT, "Torque"],
      [KEYS.I_FRONT, "Corrente"],
      [KEYS.BUS_FRONT, "Barramento"],
    ]),
    c.history("Temperaturas (24 h)", 24, [
      [KEYS.M_REAR, "Motor T"],
      [KEYS.M_FRONT, "Motor D"],
      [KEYS.IPM_REAR, "Inversor T"],
      [KEYS.IPM_FRONT, "Inversor D"],
    ]),
  ]);

  const pneus = c.section("Pneus", "mdi:car-tire-alert", [
    c.tile(KEYS.TP_LF, "Dianteiro E"),
    c.tile(KEYS.TP_RF, "Dianteiro D"),
    c.tile(KEYS.TP_LR, "Traseiro E"),
    c.tile(KEYS.TP_RR, "Traseiro D"),
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
    c.tile(KEYS.ODO, "Hodômetro"),
    c.tile(KEYS.CONS50, "Últimos 50 km"),
    c.entities(null, [
      [KEYS.TRIP1, "Parcial 1"],
      [KEYS.TRIP2, "Parcial 2"],
      [KEYS.DRIVE_TIME, "Tempo dirigindo"],
      [KEYS.CONS_TOTAL, "Consumo total"],
    ]),
    c.glance(
      "Janelas (%)",
      [
        [KEYS.WINP_LF, "DE"],
        [KEYS.WINP_RF, "DD"],
        [KEYS.WINP_LR, "TE"],
        [KEYS.WINP_RR, "TD"],
      ],
      { columns: 4 }
    ),
  ]);

  return c.view("Condução", "conducao", "mdi:steering", [conducao, motores, pneus, viagem]);
}

function viewGraficos(c) {
  const change = (title, days, period, list, chart_type = "bar") => {
    const card = c.stats(title, days, list, { stat_types: ["change"], period, chart_type });
    return card;
  };
  const uso = c.section("Uso", "mdi:chart-bar", [
    change("Percurso diário", 30, "day", [[KEYS.ODO, "km"]]),
    change("Energia consumida por dia", 30, "day", [[KEYS.CONS_TOTAL, "kWh"]]),
    c.stats("Consumo últimos 50 km (média diária)", 30, [[KEYS.CONS50]], { stat_types: ["mean"] }),
    c.stats("SOC (30 dias)", 30, [[KEYS.SOC]]),
  ]);
  const bateria = c.section("Bateria", "mdi:chart-line", [
    c.stats("Diferença entre células (7 dias)", 7, [[KEYS.CAN_DELTA], [KEYS.BYD_DELTA]], {
      period: "hour",
      stat_types: ["max"],
    }),
    c.stats("Bateria 12 V (14 dias)", 14, [[KEYS.V12]]),
    c.stats("SOH (90 dias)", 90, [[KEYS.SOH], [KEYS.SOH_CALC]], { period: "week", stat_types: ["mean"] }),
    c.history("Motores (24 h)", 24, [
      [KEYS.M_REAR, "Motor T"],
      [KEYS.M_FRONT, "Motor D"],
      [KEYS.BUS_REAR, "Barramento T"],
      [KEYS.BUS_FRONT, "Barramento D"],
    ]),
  ]);
  return c.view("Gráficos", "graficos", "mdi:chart-line", [uso, bateria]);
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
