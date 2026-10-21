# COMBATE 16 · versão 1.6

Jogo de artilharia tática em HTML5 Canvas, JavaScript e CSS. Direção de arte de arcade militar, inspirada nas referências gráficas enviadas: soldados expressivos, materiais desgastados, selva, ruínas, fumaça e fogo. Funciona como site estático no GitHub Pages, sem dependências ou compilação.

## O que mudou na arte

- Capa original com três combatentes, ruínas tropicais, helicóptero, traçantes e grandes explosões.
- Seis modelos de soldados em atlas PNG transparente, com uniformes aliados em verde-oliva e rivais em ferrugem. Capacetes, bandana, óculos, mochilas e rifles. Animações de respiração, deslocamento e recuo; contornos escuros e placas de nome para leitura em fundos detalhados.
- Dois cenários ilustrados: selva fortificada e cidade em ruínas. Quatro tratamentos de ambiente, paralaxe, variação procedural da elevação e textura de solo com pedra, cascalho e raízes.
- Novos quadros de explosão, cogumelo nuclear, fumaça, clarão de disparo, projétil, avião, artilharia, tanque distante e caixas de suprimentos. Os efeitos de fundo são decorativos; impactos reais abrem crateras e causam dano.
- Fantasma com volume e transparência, radar verde, placas de aço oliva, rebites, botões de latão e título com tratamento de arcade. A interface permanece compacta.

As cinco imagens principais foram criadas com **image_gen**, a ferramenta integrada de geração de imagens. As especificações utilizadas estão em [assets/PROMPTS.md](assets/PROMPTS.md). Os efeitos e modelos de contingência possuem fontes editáveis no código.

## Jogar e publicar

Abra `index.html` mantendo os arquivos desta pasta juntos. A entrega também inclui `combate-16-v1.6.html`, com todo o código e as cinco imagens incorporados, para jogar em um único arquivo.

Para publicar no GitHub Pages, extraia o ZIP e envie o conteúdo desta pasta para a raiz do repositório (ou pasta selecionada como origem do Pages). `index.html`, `style.css`, `arcade-art.js`, `war-assets.js`, `game.js`, `icon.svg`, `.nojekyll` e a pasta `assets` devem permanecer disponíveis. Configure o Pages para a branch e a pasta utilizadas. Não há backend nem chamadas a serviços externos durante a partida.

## Regras e controles

**Iniciar → configuração → posicionamento → combate.** Escolha campanha ou duelo local e a dificuldade. Posicione os três soldados no seu lado, tocando no terreno ou usando a barra de posição, e confirme com **COMBATER**. A câmera acompanha o soldado escolhido; o radar permite navegar pelo mapa.

Cada soldado tem dois disparos por turno. No estilingue, puxe para trás e para baixo e solte. A distância define a força; a direção define o ângulo. Um toque simples não dispara. Nenhum tiro mostra a trajetória completa.

Tocar nos controles de ângulo/força ativa a mira manual: arrastar o campo não dispara nesse modo. Use **DISPARAR**; o botão **ESTILINGUE** reativa o gesto. **MIRA ANTERIOR** restaura o ajuste do último disparo. Use as setas para mover, com combustível renovado por turno. As explosões atingem aliados e inimigos.

Teclado: setas laterais movem; ↑/↓ ajustam ângulo; +/− ajustam força; espaço dispara; P pausa; M alterna som; Escape cancela a puxada ou pausa. O som vem ligado e é liberado pela primeira interação, conforme a política do navegador.

Na campanha, cada vitória abre uma fase com três inimigos adicionais: 3, 6, 9… O trio retorna completo na próxima fase. A IA começa com índice de precisão de 35%, 50% ou 65% conforme a dificuldade, e ganha 3 pontos percentuais por fase até 95%. Esse índice controla a dispersão da mira; não é uma garantia de taxa de acerto.

**Pontos = eliminações × 1.000 × (1 + precisão / 100).** Um disparo que causa dano a rivais conta como um acerto, mesmo quando atinge vários. Cada rival eliminado conta separadamente; dano a aliados não pontua. Pontos acumulam na campanha, e o recorde fica no armazenamento local. Estatísticas detalhadas aparecem no resultado; durante o jogo, o topo mostra somente fase e pontos das equipes.

O avião de suprimentos passa a cada seis disparos combinados e lança duas caixas de paraquedas. Aviões decorativos, artilharia e rajadas traçantes têm relógios independentes. O primeiro cogumelo aparece entre 32 e 48 segundos de atividade; os seguintes, a cada 55–90 segundos. O ciclo manhã/dia/tarde/noite dura 100 segundos; cada fase tem 35% de chance de chuva. O brilho das explosões aumenta à noite. Pausar congela os relógios. A câmera observa qualquer soldado atingido por três segundos, inclusive antes do resultado da última eliminação.

## Arquivos de arte

| Arquivo | Uso |
| --- | --- |
| `assets/capa-arcade.png` | Capa |
| `assets/cenario-arcade.png` | Selva e posto fortificado |
| `assets/cidade-arcade.png` | Cidade em ruínas |
| `assets/soldados-arcade.png` | Atlas transparente, 3 colunas × 2 linhas |
| `assets/terreno-arcade.png` | Textura do terreno destrutível |
| `assets/guerra-16bits.png` e `.json` | Atlas de efeitos, células de 64 × 64 |
| `explosion`, `nuclear`, `smoke`, `plane`, `shell`, `battery`, `crate`, `muzzle`, `tank` (`.png`) | Faixas de quadros separadas |

`arcade-art.js` carrega os PNGs, organiza os personagens, cria seus contornos e prepara os materiais. `war-assets.js` mantém a fonte do atlas animado e sua contingência em Canvas. `game.js` reúne física, câmera, campanha e renderização; `style.css` define os menus e a interface.

## Validação

Execute `npm test` com Node.js, ou `node tests/assets.cjs` e `node tests/engine.cjs`. Os testes verificam integridade dos PNGs, transparência e grade do atlas, ordem de carregamento, navegação de menus, partidas completas, pontuação, fases, mira, suprimentos, efeitos, pausa, clima e os três segundos da câmera.

`tests/responsive.html` mostra o jogo real em quadros de 390 × 844, 320 × 568 e 844 × 390 para conferir o layout. A versão foi verificada no Chromium em computador e nesses quadros responsivos. Safari/iOS e hardware móvel real não foram testados.
