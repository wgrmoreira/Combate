# Combate 16 · versão 1.5

Interface redesenhada para priorizar o campo de batalha.

- Abertura ilustrada em pixel art, com soldados, bombas, aviões e explosões. O botão **INICIAR** abre a configuração de modo e dificuldade. A arte original também está em `assets/abertura-16bits.png`.
- Barra com o nome do jogo e estatísticas removidas da partida. O topo mostra fase, pontuação por equipe (verde / vermelho), som, ajuda e pausa. Eliminações e precisão continuam na tela de resultado.
- Campo flexível ocupa a altura disponível, com controles menores e soldados ampliados naturalmente nas telas verticais. A câmera acompanha o soldado escolhido no posicionamento.
- Notificações pequenas no canto inferior esquerdo, com duração máxima de 2,5 segundos. Menus, tutorial e botões simplificados.
- Paleta mais vibrante; chuva preserva mais as cores. Rajadas de traçantes sobem ao céu em intervalos de 1,7 a 3,2 segundos, sem interferir na física.
- Campanha, pontuação, modo manual/estilingue, apoio a cada seis disparos e foco de câmera de três segundos preservados.

Validação responsiva disponível em `tests/responsive.html` (390×844, 320×568 e 844×390).


Reformulação do protótipo Combate em HTML5 Canvas, JavaScript e CSS3. Sem dependências, instalação, compilação, servidor de aplicação ou serviços externos.

## Jogar

Abra `index.html` em um navegador moderno. Todos os arquivos devem permanecer na mesma pasta. Há também uma versão independente `combate-16.html` na entrega, que reúne o jogo em um único arquivo.

- **Campanha solo:** comece contra três inimigos; cada vitória abre uma fase com três inimigos a mais: 3, 6, 9, 12, 15… Escolha Recruta, Soldado ou Veterano.
- **Duelo local:** duas pessoas no mesmo aparelho. Uma tela de passagem identifica o próximo comandante.
- **Objetivo:** eliminar todos os rivais da fase. Cada soldado tem 100 PV e dois tiros por turno. Na próxima fase, o trio aliado retorna completo, com 100 PV por soldado, para um novo posicionamento.

## Prepare seu trio

Antes de começar, posicione seus três soldados no seu lado do campo. Selecione um nome e toque ou clique na posição desejada: o soldado será colocado sobre o terreno naquele ponto. A seleção avança para o próximo soldado automaticamente. Você também pode usar o controle **POSIÇÃO NO SEU LADO** e o botão **POSICIONAR** para jogar por teclado ou escolher uma posição com mais precisão.

É possível selecionar novamente qualquer soldado para reposicioná-lo antes de confirmar. O jogo impede posições na metade adversária ou com menos de 44 pixels entre aliados. O botão **PRONTO PARA O COMBATE** só é liberado quando os três estiverem colocados. No modo solo, a IA recebe suas posições automaticamente. No duelo local, os dois jogadores passam pela preparação, um de cada vez.

## Controles

| Ação | Celular / mouse | Teclado |
| --- | --- | --- |
| Mirar e disparar como estilingue | Toque em qualquer ponto do campo, puxe para trás e para baixo e solte | Controles de ângulo/força + espaço |
| Ajustar ângulo | Controle ÂNGULO | ↑ / ↓ |
| Ajustar força | Controle FORÇA | + / − |
| Disparar | Botão DISPARAR | Espaço |
| Mover | Segure uma das setas | ← / → ou A / D |
| Recuperar mira anterior | MIRA ANTERIOR | — |
| Explorar o mapa | Toque / clique no minimapa | — |
| Pausar | Botão Ⅱ | P / Escape |
| Som | Botão ♪ | M |
| Cancelar uma puxada | Cancele o toque ou volte à área inicial antes de soltar | Escape |

**Mira de estilingue:** toque em qualquer lugar do campo, fora do minimapa. Para lançar à direita e para cima, puxe para a esquerda e para baixo; para lançar à esquerda, puxe para a direita e para baixo. A distância puxada define a força e a inclinação define o ângulo. Uma faixa elástica e os números de força/ângulo acompanham o gesto. Soltar uma puxada válida dispara imediatamente. Um toque simples, um gesto cancelado ou uma puxada menor que 18 pixels não gastam munição. Escape cancela a puxada e restaura a mira anterior. A câmera fica fixa durante o gesto; girar a tela cancela a puxada para evitar disparos acidentais.

Os controles de força/ângulo e o botão DISPARAR continuam disponíveis como alternativa para mouse, teclado e acessibilidade. **Nenhum dos dois tiros revela a trajetória completa ou o ponto de impacto.** A mira exibe só três pontos de direção inicial. O segundo tiro mantém ângulo e força, sem mostrar o trajeto do anterior. Durante o voo, só há um rastro curto junto ao projétil. O vento não muda entre os dois tiros.

**Mira manual separada:** tocar ou alterar os controles inferiores de ângulo/força seleciona o modo manual. Nesse modo, arrastar e soltar sobre o campo não arma nem dispara o estilingue; o tiro exige o botão DISPARAR ou espaço. O botão **ESTILINGUE** reativa o gesto. A mira direcional ganhou pontos com contorno e uma cruz de 18 pixels de tela, mantendo a leitura no celular sem mostrar a trajetória.

**Câmera de impacto:** quando qualquer soldado recebe dano de um tiro, a câmera centraliza o atingido e permanece nele por três segundos. Nenhum novo disparo ou troca de turno acontece nesse intervalo. O contador congela com a pausa. Até a última eliminação da fase é exibida antes de abrir o resultado.

**Som:** inicia ligado e é liberado pelo navegador na primeira interação do jogador. O botão ♫ permite silenciar e reativar. O volume dos estrondos distantes é menor que o das ações principais.

## Placar e progressão

O painel acompanha **eliminações**, **precisão** e **pontos** de cada time. Na campanha, os valores se acumulam entre fases. O resultado também mostra os valores da fase encerrada.

- Um tiro é um acerto quando sua explosão causa dano a pelo menos um inimigo. Atingir vários inimigos com o mesmo tiro conta como um único acerto.
- Cada inimigo eliminado pelo seu projétil soma uma eliminação, inclusive se houver várias eliminações na mesma explosão.
- Dano em aliados e autoeliminação não melhoram sua precisão nem dão eliminações ao adversário.
- Precisão = tiros com acerto ÷ tiros disparados × 100. Tiros que saem do mapa contam como erros.
- **Pontos = eliminações × 1.000 × (1 + precisão ÷ 100)**, arredondados ao inteiro mais próximo. Três eliminações com 50% de precisão valem 4.500 pontos; com 100%, valem 6.000. Como a precisão acumulada entra no multiplicador, errar um tiro pode reduzir os pontos exibidos.
- O melhor placar da Vanguarda é salvo localmente ao encerrar a fase ou a campanha. Recomeçar a campanha zera os valores da partida e preserva esse recorde.

A campanha atual fica na memória da página; recarregar o navegador inicia uma nova campanha. O recorde continua salvo no aparelho quando o armazenamento local estiver disponível.

Depois de vencer, escolha **SEGUIR PARA A FASE…**. O terreno é gerado novamente, o trio volta com vida completa e o número de rivais aumenta em três. O mapa se amplia quando necessário; a área de posicionamento dos aliados permanece do lado esquerdo. A rotação inclui todos os inimigos vivos, não apenas os três modelos originais. O modo duelo local continua sendo uma partida entre dois trios, com placar para ambos.

**IA progressiva:** o índice de controle da mira começa em 35% no Recruta, 50% no Soldado e 65% no Veterano. Ele aumenta **3 pontos percentuais por fase**, até 95%. No Soldado, por exemplo: 50%, 53%, 56%, 59%… Esse índice reduz gradualmente a dispersão aplicada ao cálculo balístico; a taxa real de acertos depende também do terreno, da distância e do vento. O início da campanha usa mais dispersão que a versão anterior.

## Dia, noite e chuva

Cada fase começa de manhã e percorre **MANHÃ → DIA → TARDE → NOITE**, com 25 segundos por período e transições graduais. O ciclo completo leva 100 segundos e se repete enquanto a fase continuar. Céu, iluminação, montanhas, sol, lua e estrelas mudam ao longo do ciclo. O relógio começa novamente na fase seguinte e fica congelado durante pausas e troca de aparelho.

Cada novo mapa tem **35% de chance de chuva**. Gotas, nuvens, tons do céu e respingos mudam o cenário; o vento exibido continua regendo a física dos tiros. A preferência de movimento reduzido diminui os efeitos animados.

## Batalha ao fundo e assets em 16 bits

A paisagem possui explosões animadas, aviões distantes, tiros de artilharia antiaérea, fumaça e cogumelos nucleares ocasionais. Os efeitos ficam entre as camadas de montanhas, com paralaxe. O primeiro cogumelo aparece entre 32 e 48 segundos de atividade da fase; os seguintes têm intervalos de 55 a 90 segundos. Aviões ao fundo são decorativos e independentes do avião de suprimentos que passa a cada seis disparos.

O brilho das explosões acompanha continuamente o ciclo de iluminação: discreto de dia e mais intenso à noite. São halos em blocos de pixels, sem clarões de tela inteira. A preferência de movimento reduzido atenua esse brilho. Os efeitos decorativos não causam dano, não alteram a pontuação e não movem a câmera. Os limites de dez explosões e três aviões simultâneos mantêm o custo visual controlado; pausar congela a animação.

Os assets são originais e têm paletas reduzidas, sem imagens externas. O pacote inclui o atlas transparente **`assets/guerra-16bits.png`**, com células de 64 × 64 pixels, e o mapa de quadros **`assets/guerra-16bits.json`**. Há também faixas separadas: `explosion.png`, `nuclear.png`, `smoke.png`, `plane.png`, `shell.png` e `battery.png`. As explosões e o cogumelo possuem oito quadros cada.

Na versão em pasta, o jogo carrega o atlas PNG. `war-assets.js` contém a mesma arte desenhada pixel a pixel e serve como alternativa embutida, inclusive no HTML único. Assim, a versão independente continua sem arquivos auxiliares. Para modificar as imagens da versão em pasta, mantenha as posições e dimensões indicadas no JSON.

O combustível de movimento é renovado por turno. Não é possível atravessar outro soldado ou escalar paredes abruptas. Explosões atingem aliados e inimigos. Soldados eliminados viram um fantasminha com auréola, que sobe e desaparece. A troca de turno aguarda a animação inicial da morte.

**Apoio aéreo:** um avião passa a cada **seis disparos efetivamente feitos, somados entre os dois times**, ao longo da campanha: 6º, 12º, 18º e assim por diante. Não há avião acionado por tempo, movimentação ou posicionamento. Se um voo ainda estiver em andamento, a próxima passagem fica na fila. Cada avião lança duas caixas de paraquedas, alternando a direção de voo e a distribuição dos tipos entre os lados. O painel indica quantos tiros faltam para o próximo apoio. Na transição de fase, os suprimentos do mapa anterior são removidos.

As caixas descem com uma pequena deriva do vento e só podem ser recolhidas depois do pouso. A rosa com cruz recupera até 30 PV; a dourada reforça o próximo projétil. Elas acompanham o chão quando uma cratera se abre abaixo delas. Não há caixas previamente colocadas no terreno.

## O que foi reconstruído

- Soldados chibi minimalistas de 24 × 26 pixels, inspirados nas referências verde e vermelha fornecidas: capacete largo, cabeça grande, dois olhos simples, corpo pequeno e botas curtas. No campo, ocupam 30 × 33 pixels, menores que os modelos anteriores de 48 × 60 pixels.
- Posicionamento manual dos três aliados antes de cada partida, com reposicionamento e validação de território/espaçamento.
- Fantasminhas animados com auréola, subida, oscilação e desaparecimento gradual após cada morte.
- Avião de apoio, lançamento de suprimentos e paraquedas coloridos.
- Quatro ambientes originais: Vale Esmeralda, Fronteira Âmbar, Serra Boreal e Dunas do Ocaso.
- Fundos em camadas, vegetação, neve, bunker, bandeira, solo texturizado e efeitos de impacto desenhados no Canvas.
- Terrenos procedurais novos por partida, plataformas iniciais suavizadas e crateras persistentes.
- Física em passos fixos de 1/120 s, independente da taxa de atualização da tela. A previsão e o tiro usam a mesma integração, gravidade e vento.
- Projéteis com velocidade de 316 a 660 pixels por segundo, conforme a força; rastro, indicação de voo acima da tela e acompanhamento de câmera.
- IA com cálculo balístico e três níveis de imprecisão.
- Câmera adaptativa, minimapa interativo e indicação de soldados fora da tela em celulares.
- Menu com ilustração dos soldados, molduras de cartucho, botões em relevo, cores vivas e acabamento em estilo 16 bits; manual, pausa, reinício, passagem de aparelho e resultado com estatísticas no mesmo estilo.
- Sons sintetizados, vibração opcional quando disponível, pausa ao perder foco e suporte à preferência de movimento reduzido.

As imagens são criadas pelo código: não há downloads de imagens, fontes remotas, anúncios, rastreamento ou conteúdo artístico do protótipo original. As preferências de modo e dificuldade são salvas apenas no armazenamento local do navegador.

## Publicar no GitHub Pages

1. Extraia o ZIP e envie **o conteúdo** da pasta do jogo para o repositório. O `index.html` deve ficar na raiz da pasta publicada, junto com `game.js`, `war-assets.js`, `style.css`, `icon.svg` e a pasta `assets`.
2. Configure o GitHub Pages para servir a pasta que contém esse `index.html`.
3. Acesse a URL do Pages após a publicação. Não há comando de build. Os caminhos são relativos e funcionam também em repositórios publicados em subpastas.

O arquivo `.nojekyll` já está incluído. A publicação em uma conta GitHub não foi realizada nesta entrega.

## Estrutura e personalização

- `index.html`: interface e textos em português.
- `style.css`: aparência e layouts de computador, celular e paisagem.
- `game.js`: jogo, arte procedural, sprites, física, IA e áudio.
- `war-assets.js`: assets originais da batalha ao fundo e atlas embutido para uso no HTML independente.
- `icon.svg`: ícone original.
- `assets/soldados.png`: atlas transparente dos seis soldados chibi, com três colunas e duas linhas de 24 × 26 pixels. Exportado como referência; o jogo desenha os modelos pelo código e continua independente de downloads de imagens.
- `tests/engine.cjs`: testes do motor, executados com `node tests/engine.cjs` ou `npm test`.

Em `game.js`, `themes` define as cores dos ambientes, `sprites` desenha os soldados e `GRAVITY` define a gravidade. `placeSoldier` e `confirmDeployment` controlam a preparação; `nextStage` avança a campanha. `scoreFor` combina eliminações/precisão; `aiPrecision` define o índice progressivo da IA. `slingshotAim`, `moveSling` e `endSling` controlam o gesto de estilingue. `environment` e `drawWeather` controlam o ciclo e os efeitos climáticos. A velocidade fica em `launch`; dano, acertos, eliminações e crateras ficam em `burst`. `aimPreview` mostra somente a direção curta; o cálculo balístico completo é interno. `updateSupplies` controla voos e bônus; `drawGhost` desenha os fantasmas.

## Verificação desta entrega

Foram verificados posicionamento manual dos três aliados, limites de território, espaçamento e reposicionamento; preparação dos dois lados no duelo local; geração de 12 mapas distintos; mira curta sem previsão nos dois tiros; igualdade entre simulação balística interna e projétil real; conservação de ângulo/força no segundo tiro; troca de turno; ação da IA; avanço das rodadas; pausa; crateras; dano; nascimento de apenas um fantasma por morte, sua subida, pausa e expiração; ausência de aviões acionados por tempo; cadência exata nos disparos 6 e 12; lançamento, queda, pouso e coleta das caixas; renderização e quatro partidas completas simuladas até vitória.

Os testes adicionais cobrem atribuição de acertos e eliminações, explosões com múltiplos alvos, dano em aliados, fórmula de pontuação, placar acumulado, fases 1 a 5 com 3/6/9/12/15 inimigos, ampliação do mapa, rotação de inimigos além do terceiro, índice de IA e seu limite, ângulo/força do estilingue, disparo somente ao soltar, cancelamento e soltura duplicada, ciclo de 100 segundos, relógio pausado e geração de fases chuvosas/secas.

A versão 1.4 também verifica modo manual sem disparo por arrasto, áudio ligado por padrão, três segundos completos de foco em impactos, pausa desse contador, espera antes do resultado de uma eliminação final, renderização dos assets, aviões/artilharia/cogumelos ao fundo, limites de efeitos, aumento de brilho à noite e ausência de efeitos decorativos sobre vida e pontuação.

A versão 1.5 foi conferida no Chromium em tela de computador e em quadros responsivos de 390 × 844, 320 × 568 e 844 × 390. Os quadros usam o jogo real dentro de um iframe com essas dimensões, disponível em tests/responsive.html. O toque usa Pointer Events, com cancelamento e captura do ponteiro. Safari/iOS e aparelhos físicos não foram testados.

## Créditos

Conceito original: protótipo Combate fornecido pelo usuário. Reimplementação e arte procedural criadas para esta reformulação. A entrega não inclui bibliotecas ou artes de terceiros.
