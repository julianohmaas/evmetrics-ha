# AGENTS.md — evmetrics-ha

Arquivo **canônico** de contexto para qualquer agente de IA (Claude Code, Codex, Copilot, Cursor...) neste repositório.
`CLAUDE.md` e afins apenas apontam para cá.

**Mantenha este arquivo enxuto e vivo:** escreva em **português (pt-BR)**. Registre aqui só regras permanentes,
arquitetura atual e pegadinhas; o que é para o usuário final fica no `README.md`, e o que é do app fica no `AGENTS.md`
e nos `docs/` do app.

---

## O projeto

Integração do **Home Assistant** (instalável pelo Marketplace embutido, HA **2026.11+**) que acompanha o app Android
**EvMetrics** (repo **privado** [`julianohmaas/evmetrics`](https://github.com/julianohmaas/evmetrics), uso pessoal,
central DiLink de um BYD Seal). O app publica a telemetria por **MQTT com Discovery**; este pacote **não cria
sensores**: entrega o dashboard (strategy `custom:evmetrics`, só cartões nativos), os blueprints de automação e avisos
em Reparações.

- **App (projeto pai):** clonado, por exemplo, em `C:\byd-app\AndroidStudioProjects\EVMetrics` (no WSL:
  `/mnt/c/byd-app/AndroidStudioProjects/EVMetrics`). Antes de mexer no contrato, leia o `AGENTS.md` dele (regra 5) e o
  `docs/MQTT.md` (tópicos, conversões, eventos); para câmeras, `docs/CAMERAS.md`.
- **Repo público** (exigência do Marketplace), ao contrário do app. Nada do que segue entra aqui, nem em código, docs,
  testes, commits ou mensagens de release:
  - segredos: tokens do HA, ids de webhook, senhas e usuários do MQTT;
  - rede do dono: endereço do broker e do HA, IPs, domínios, portas e o túnel. **Não copie trechos dos `docs/` do
    app**, porque o `docs/MQTT.md` descreve essa topologia;
  - dados do carro: placa, VIN, coordenadas, fotos e vídeos do sentinela, logs e capturas (`lifecycle.log`, `.evcan`,
    `telemetry.db`);
  - nomes de pessoas e lugares da casa.

  Exemplos usam `!secret`, nomes genéricos e o carro de exemplo dos testes, como o README já faz.

---

## Regras inegociáveis

1. **Idioma:** código, comentários, docs, traduções pt-BR e commits em **pt-BR** (o `en.json` existe porque o
   hassfest exige).
2. **Só cartões nativos do HA** na strategy: nada de cartões de terceiros (HACS) nem recursos externos.
3. **Não criar entidades:** os sensores são do Discovery do app. Se faltar um dado, ele nasce no app
   (`SensorCatalog`/`HaDiscovery`), não aqui.
4. **Contrato com o app em sincronia** (seção abaixo): mudou chave, evento, atributo ou nome de câmera de um lado,
   propague no outro **no mesmo ciclo** e rode o `check_keys.py`.
5. **Versão do pacote:** `version` do `manifest.json` = tag do git (o `release.yaml` recusa diferente). A tag e o push
   são do dono.

---

## Contrato com o app EvMetrics

O app publica cada entidade com `unique_id` = `<node_id>_<chave em minúsculas>` (ex.:
`evmetrics_seal_statistic_soc_battery_percentage`; `node_id` vem do tópico base `evmetrics/seal`). O `vehicle.py`
monta o mapa **chave → entity_id** pelo registro de entidades e a strategy compara em minúsculas. O contrato são as
**chaves**, nunca os `entity_id` (o usuário pode renomear).

| O que | Aqui | No app |
|---|---|---|
| Chaves usadas no dashboard | `KEYS` em `frontend/evmetrics-strategy.js` (maiúsculas, como no JSON) | `sensors/SensorCatalog`, `mqtt/HaDiscovery` (chaves aposentadas em `HaDiscovery.RETIRED_SENSORS`) |
| Descoberta da integração | `"mqtt"` do `manifest.json`: `homeassistant/event/+/sentinel_motion/config` | chave `sentinel_motion` do evento "Movimento" no `HaDiscovery` |
| Versão mínima do app | `MIN_APP_VERSION` em `const.py` (comparado com o `sw_version` "EvMetrics X.Y") | `versionName` em `app/build.gradle` |
| Eventos dos blueprints | `event_type`: `movimento` (e `ignorado`), `concluida`/`interrompida`/`parou`, `pronto`/`falhou`; atributos `event`, `at`, `at_home`, `objects`, `follow_up`, `media_content_id` | `sentinel/`, `telemetry/ChargeTracker`, `camera/remote/` (descritos em `docs/MQTT.md` e `docs/CAMERAS.md`) |
| Entidades padrão dos blueprints | `default:` dos `!input` (ex. `event.byd_seal_movimento`, `event.byd_seal_recarga`) — só sugestão para instalação nova | nome do dispositivo ("BYD Seal") + nomes pt-BR do Discovery |
| Câmeras Push | `PUSH_LIVE`/`PUSH_ALERT` = `camera.seal_ao_vivo` / `camera.seal_alerta` (strategy e README) | webhooks configurados nos Ajustes; passo a passo em `docs/CAMERAS.md` |

**Checagem do contrato** (lê o `KEYS` daqui e procura cada chave nas fontes do app; não cobre eventos, atributos nem
blueprints):

```bash
python3 /mnt/c/byd-app/AndroidStudioProjects/EVMetrics/scripts/ha/check_keys.py .   # na raiz deste repo
```

Saída esperada: `N chaves no pacote, N encontradas no app`. `FALTA no app` ou `APOSENTADA` = o dashboard perde cartões.

### Fluxos de mudança

- **O pacote passa a usar uma chave nova:** confirme que ela existe no app (e em qual versão); adicione em `KEYS`; se
  o app precisou de versão nova, suba o `versionName` lá e o `MIN_APP_VERSION` aqui, com uma linha no comentário do
  `const.py` dizendo o que a versão trouxe. Rode o `check_keys.py`.
- **O app renomeia ou remove uma chave:** troque em `KEYS` (chave antiga continua funcionando para quem não atualizou o
  app? então mantenha as duas com fallback, como `SOC_FINE`/`SOC`), rode o `check_keys.py` e publique as duas pontas
  juntas.
- **O app muda `event_type`, atributos de evento ou nomes do Discovery:** atualize os blueprints (filtros, mensagens e
  `default:`) e o teste da strategy se for o caso. O `check_keys.py` não pega isso: confira à mão com `grep` nos
  blueprints.
- **Chave que o carro não publica** (opção desligada no app, versão antiga) **some do dashboard sem erro**: toda carta
  nova precisa tolerar a ausência (`c.id(key)` nulo → cartão omitido).

---

## Estrutura (`custom_components/evmetrics/`)

| Arquivo | Papel |
|---|---|
| `__init__.py` | Setup da entrada, websocket `evmetrics/vehicles`, avisos em Reparações (`app_outdated`, `device_not_found`, `dashboard_conflict`). |
| `config_flow.py` | Descoberta pelo MQTT (`async_step_mqtt`) e entrada manual escolhendo o dispositivo; opções (título, barra lateral, imagem, câmeras). |
| `vehicle.py` | Liga a entrada ao dispositivo do app, mapa chave → entity_id, versão do app (`sw_version`). |
| `dashboard.py` / `resources.py` | Registra o dashboard com a strategy e o recurso JS servido em `/evmetrics_static`. |
| `blueprints.py` | Copia os blueprints para `<config>/blueprints/automation/evmetrics/` a cada versão (o usuário não edita esses arquivos). |
| `images.py` | Imagem do carro enviada pelas opções (`<config>/evmetrics/`, servida em `/evmetrics_files`). |
| `frontend/evmetrics-strategy.js` | Gera o dashboard inteiro (abas Carro, Sentinela, Energia, Condução, Gráficos, Todos). |
| `blueprints/automation/*.yaml` | Movimento no sentinela, vídeo do sentinela, carro não dormiu, fim da recarga. `source_url` aponta para o próprio arquivo no `main`. |
| `translations/{en,pt-BR}.json` | Mesmas chaves nos dois (o `check.py` confere). |

---

## Checagens e publicação

- `python3 scripts/check.py` (precisa de PyYAML): blueprints (`!input` declarado e usado, `source_url`), traduções e
  manifest.
- `node --test tests/*.test.mjs`: gera o dashboard com um carro de exemplo e confere os cartões. Ao mudar a strategy,
  ajuste o teste junto.
- CI (`validate.yaml`): HACS action (com `ignore: license`, decisão do dono), hassfest, `compileall` e as duas
  checagens acima.
- **Publicar:** sobe `version` no `manifest.json` (`X.Y.Z`, `b`/`rc` = pré-lançamento), commit e tag igual. O
  `release.yaml` cria a release do GitHub, que é o que o Marketplace oferece. Commit, tag e push são do dono.

---

## Convenções

- Commits em **pt-BR**; nas versões, o padrão é `X.Y.Z: resumo do que mudou`.
- Mudanças pequenas; README atualizado quando muda algo visível ao usuário (o que está entre
  `ha-marketplace:exclude-start/end` não aparece no Marketplace).
- Sem dependências Python (`requirements: []`) e sem build no frontend: o JS é servido como está.
