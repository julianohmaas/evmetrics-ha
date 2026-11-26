# EvMetrics para Home Assistant

Dashboard e automações prontos para o carro que roda o app **EvMetrics** (BYD com central DiLink). O app manda a
telemetria do carro para o Home Assistant por MQTT (com Discovery); esta integração junta, num pacote só e
atualizado pelo Marketplace, o que antes se colava à mão:

- **Dashboard do carro**: bateria, recarga, sentinela, condução, pneus, motores e gráficos, montado sozinho a partir
  das entidades do carro. Usa só cartões padrão do Home Assistant.
- **Câmeras pela internet**: ao vivo sob pedido, flipbook do último alerta e o vídeo do alerta na Mídia do HA, com
  o carro no 4G (veja [Câmeras pela internet](#câmeras-pela-internet)).
- **Blueprints de automação**: movimento no sentinela (com a foto e o botão "Ver vídeo"), vídeo do sentinela, carro
  que não dormiu e fim da recarga.
- **Avisos em Reparações** quando o app no carro é mais antigo que o pacote, ou quando o carro sumiu do MQTT.

A integração não cria sensores: as entidades continuam vindo do MQTT Discovery do app.

<!-- ha-marketplace:exclude-start -->
## Requisitos

- Home Assistant **2026.11** ou mais novo (Marketplace embutido).
- Integração **MQTT** configurada, com o app EvMetrics publicando no mesmo broker e o Discovery ligado.
<!-- ha-marketplace:exclude-end -->

## Instalação

1. **Configurações › Marketplace › Adicionar a partir de link** e informe `julianohmaas/evmetrics-ha` (tipo
   Integração).
2. Instale. Não precisa reiniciar na primeira instalação.
3. Quando o app estiver conectado ao MQTT, o carro aparece em **Configurações › Dispositivos e serviços** como
   descoberto: confirme. (Se não aparecer, **Adicionar integração › EvMetrics** e escolha o dispositivo do carro.)
4. O dashboard aparece na barra lateral (por padrão em `/evmetrics-seal`, a partir do tópico base do app).

As atualizações chegam em **Configurações › Atualizações**, como qualquer item do Marketplace.

## Dashboard

O dashboard não fica gravado no seu HA: ele é gerado na hora pela *strategy* `custom:evmetrics`. Uma versão nova do
pacote muda o dashboard sozinha, e um sensor novo do app aparece pelo menos na aba **Todos**.

Abas: **Carro** (visão geral com a imagem do carro, mapa, portas e janelas, 12 V), **Sentinela**, **Energia**
(bateria, células, BMS, recarga), **Condução** (modos, motores, pneus, viagem), **Gráficos** e **Todos** (todas as
entidades do carro por sistema; o que o pacote ainda não conhece fica em **Outros**). No computador as abas usam 3
colunas de alturas parecidas; no celular viram uma coluna só, na mesma ordem.

Opções (**Configurar** na integração): título, mostrar ou não na barra lateral, imagem do carro (por exemplo
`/local/images/meu-carro.png`; vazio = o desenho do pacote) e câmeras ao vivo para a aba Sentinela (por exemplo as
câmeras MJPEG do app).

### Câmeras pela internet

Com as "câmeras pela internet" configuradas no app (EvMetrics 1.1 ou mais novo), a aba **Sentinela** ganha duas
seções: **Câmeras pela internet**, com a escolha da câmera ao vivo (Desligada / 360° / Frontal, 3 min por pedido), o
estado da transmissão com o consumo do 4G no mês e a imagem ao vivo (só enquanto o carro transmite); e **Último
alerta**, com o flipbook do alerta e o botão **Enviar vídeo do último alerta** (o MP4 vai para a Mídia do HA, em
`/media/evmetrics`).

As imagens vêm de duas câmeras **Push** que você cria no `configuration.yaml`, com estes nomes (o dashboard procura
`camera.seal_ao_vivo` e `camera.seal_alerta`; sem elas, a seção mostra só os controles):

```yaml
camera:
  - platform: push
    name: Seal ao vivo
    webhook_id: !secret seal_live_webhook
    timeout: 5
    buffer: 1
  - platform: push
    name: Seal alerta
    webhook_id: !secret seal_alert_webhook
    timeout: 15
    buffer: 12
```

Os ids dos webhooks, o endereço do HA e um token de administrador vão nos Ajustes do app; o passo a passo está no
`docs/CAMERAS.md` do app. Essas duas câmeras não precisam estar na opção "Câmeras ao vivo": se estiverem, aparecem só
na seção delas.

**Quer personalizar?** O dashboard da integração não é editável. Crie um seu em **Configurações › Painéis ›
Adicionar painel › EvMetrics (carro)** e use **Assumir o controle** para editar os cartões. Ou use a strategy em
YAML:

```yaml
strategy:
  type: custom:evmetrics
```

## Automações (blueprints)

Ficam em **Configurações › Automações › Blueprints** (pasta `evmetrics`). Crie uma automação a partir de cada um e
escolha os celulares (app do Home Assistant), outros notificadores (Telegram, e-mail) e, no sentinela, o chat do
Telegram que recebe a foto.

| Blueprint | O que faz |
|---|---|
| Movimento no sentinela | Notifica com a foto quando o carro vê pessoa ou veículo. Ignora os disparos "ignorado" e a continuação da mesma ronda. Mostra a hora real do disparo (o carro pode estar sem rede na hora). Opcional: botão "Ver vídeo" na notificação, que pede o MP4 do disparo ao carro (ligue em uma automação só). |
| Vídeo do sentinela | Avisa quando o vídeo pedido chegou na Mídia do HA ou falhou (sem rede, limite do 4G, token). |
| Carro não dormiu | Avisa quando o carro está desligado há um tempo e continua acordado (gasta bateria). |
| Fim da recarga | Avisa no fim da recarga com energia, SOC, duração e tipo; escolha entre concluída, interrompida e parou. |

Os arquivos dos blueprints são do pacote e são trocados a cada atualização: suas automações seguem a versão nova
depois do reinício. Não edite os arquivos; para mudar algo, use as entradas do blueprint (há "Ações extras") ou
**Assumir o controle** na automação.

## Como o pacote acha as entidades

O app publica cada entidade com `unique_id` = `<node_id>_<chave>`, em que a chave é a mesma do JSON do app (por
exemplo `STATISTIC_SOC_BATTERY_PERCENTAGE`). A integração monta o mapa **chave → entity_id** pelo registro de
entidades e entrega à strategy pelo websocket `evmetrics/vehicles`. Por isso renomear uma entidade no HA não quebra
nada, e o contrato entre o app e este pacote são as **chaves**, listadas em `KEYS` no
[`evmetrics-strategy.js`](custom_components/evmetrics/frontend/evmetrics-strategy.js).

<!-- ha-marketplace:exclude-start -->
## Desenvolvimento

- `python scripts/check.py`: blueprints (YAML, `!input`), traduções e manifest.
- `node --test tests/*.test.mjs`: gera o dashboard com um carro de exemplo e confere os cartões.
- CI: Marketplace (HACS action), hassfest e as duas checagens acima.

**Publicar uma versão:** mude `version` no `custom_components/evmetrics/manifest.json`, faça o commit e crie a tag com
o mesmo número (`git tag 0.2.0 && git push --tags`). O fluxo `release.yaml` confere o número e cria a release do
GitHub, que é o que o Marketplace oferece como atualização. Tags com `b`/`rc` saem como pré-lançamento.

Se o pacote passar a depender de uma chave nova do app, suba `MIN_APP_VERSION` em `const.py`: o HA avisa em
Reparações quem estiver com o app antigo.
<!-- ha-marketplace:exclude-end -->
