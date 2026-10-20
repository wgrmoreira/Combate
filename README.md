# COMBATE 16 — Operação Horizonte

Reformulação do protótipo Combate em HTML5 Canvas, JavaScript e CSS3. Sem dependências, instalação, compilação, servidor de aplicação ou serviços externos.

## Jogar

Abra `index.html` em um navegador moderno. Todos os arquivos devem permanecer na mesma pasta. Há também uma versão independente `combate-16.html` na entrega, que reúne o jogo em um único arquivo.

- **Solo:** três soldados contra três soldados controlados pelo computador. Escolha Recruta, Soldado ou Veterano.
- **Duelo local:** duas pessoas no mesmo aparelho. Uma tela de passagem identifica o próximo comandante.
- **Objetivo:** eliminar todos os soldados rivais. Cada soldado tem 100 PV e dois tiros por turno.

## Controles

| Ação | Celular / mouse | Teclado |
| --- | --- | --- |
| Mirar | Arraste no campo, apontando na direção desejada | ↑ / ↓ ajustam a elevação |
| Ajustar ângulo | Controle ÂNGULO | ↑ / ↓ |
| Ajustar força | Controle FORÇA | + / − |
| Disparar | Botão DISPARAR | Espaço |
| Mover | Segure uma das setas | ← / → ou A / D |
| Recuperar mira anterior | MIRA ANTERIOR | — |
| Explorar o mapa | Toque / clique no minimapa | — |
| Pausar | Botão Ⅱ | P / Escape |
| Som | Botão ♪ | M |

Mirar nunca dispara automaticamente. O tiro exige confirmação. O segundo tiro conserva ângulo e força; a trajetória anterior permanece em cinza e a nova previsão aparece clara. O vento não muda entre os dois tiros. Ao mover o soldado, a previsão parte de sua nova posição.

O combustível de movimento é renovado por turno. Não é possível atravessar outro soldado ou escalar paredes abruptas. Explosões atingem aliados e inimigos. Caixas com uma cruz recuperam até 30 PV; caixas de munição reforçam o próximo projétil.

## O que foi reconstruído

- Soldados em pixel art com estética de 16 bits, paletas por equipe, animação de movimento, arma, identificação e vida.
- Quatro ambientes originais: Vale Esmeralda, Fronteira Âmbar, Serra Boreal e Dunas do Ocaso.
- Fundos em camadas, vegetação, neve, bunker, bandeira, solo texturizado e efeitos de impacto desenhados no Canvas.
- Terrenos procedurais novos por partida, plataformas iniciais suavizadas e crateras persistentes.
- Física em passos fixos de 1/120 s, independente da taxa de atualização da tela. A previsão e o tiro usam a mesma integração, gravidade e vento.
- Projéteis com velocidade de 316 a 660 pixels por segundo, conforme a força; rastro, indicação de voo acima da tela e acompanhamento de câmera.
- IA com cálculo balístico e três níveis de imprecisão.
- Câmera adaptativa, minimapa interativo e indicação de soldados fora da tela em celulares.
- Menu, manual, pausa, reinício, passagem de aparelho e resultado com estatísticas.
- Sons sintetizados, vibração opcional quando disponível, pausa ao perder foco e suporte à preferência de movimento reduzido.

As imagens são criadas pelo código: não há downloads de imagens, fontes remotas, anúncios, rastreamento ou conteúdo artístico do protótipo original. As preferências de modo e dificuldade são salvas apenas no armazenamento local do navegador.

## Publicar no GitHub Pages

1. Extraia o ZIP e envie **o conteúdo** da pasta do jogo para o repositório. O `index.html` deve ficar na raiz da pasta publicada, junto com `game.js`, `style.css` e `icon.svg`.
2. Configure o GitHub Pages para servir a pasta que contém esse `index.html`.
3. Acesse a URL do Pages após a publicação. Não há comando de build. Os caminhos são relativos e funcionam também em repositórios publicados em subpastas.

O arquivo `.nojekyll` já está incluído. A publicação em uma conta GitHub não foi realizada nesta entrega.

## Estrutura e personalização

- `index.html`: interface e textos em português.
- `style.css`: aparência e layouts de computador, celular e paisagem.
- `game.js`: jogo, arte procedural, sprites, física, IA e áudio.
- `icon.svg`: ícone original.
- `tests/engine.cjs`: testes do motor, executados com `node tests/engine.cjs` ou `npm test`.

Em `game.js`, `themes` define as cores dos ambientes, `sprite` define a matriz dos soldados, `roster` define seus nomes e `GRAVITY` define a gravidade. A velocidade é calculada em `launch`; o dano e a deformação do terreno ficam em `burst`.

## Verificação desta entrega

Foram verificados geração de 12 mapas distintos; igualdade entre previsão e trajetória real; conservação da mira do segundo tiro; troca de turno; ação da IA; avanço das rodadas; pausa; crateras; dano; passagem no duelo local; renderização e quatro partidas completas simuladas até vitória.

A interface foi conferida no navegador Chromium nas dimensões padrão de computador, 390 × 844, 320 × 568 e 844 × 390. Em telas muito baixas, a página pode exigir rolagem. Não houve erros de console nos testes do navegador. O toque usa Pointer Events, com tratamento de cancelamento e captura do ponteiro. A compatibilidade com Safari/iOS e outros aparelhos físicos ainda precisa de verificação nesses dispositivos; não foram executados testes em hardware real.

## Créditos

Conceito original: protótipo Combate fornecido pelo usuário. Reimplementação e arte procedural criadas para esta reformulação. A entrega não inclui bibliotecas ou artes de terceiros.
