# COMBATE 16 · versão 1.11

Jogo de artilharia tática em HTML5 Canvas, JavaScript e CSS. Direção de arte de arcade militar, inspirada nas referências gráficas enviadas: soldados expressivos, materiais desgastados, selva, ruínas, fumaça e fogo. Funciona como site estático no GitHub Pages, sem dependências ou compilação.

## Ajustes da versão 1.11

- Música de batalha reduzida para **15% do nível da versão 1.10** (aproximadamente 6% da amplitude dos MP3 originais). A redução está no próprio arquivo e funciona em celulares. Menu e encerramento mantêm seus volumes anteriores.
- Ganho dos efeitos duplicado: disparos, explosões, alertas, motores, helicópteros e chuva. Sons contínuos ainda iniciam em silêncio e não tocam nos menus.
- O botão ♫ e a tecla M **silenciam somente a música**. Efeitos continuam ativos; os rótulos passam a “Silenciar música” e “Ativar música”. A reprodução dos efeitos independe da preferência da música.
- Cada período de luz dura 50 segundos: manhã → dia → tarde → noite. Ciclo completo de **200 segundos**, com transições graduais de **14 segundos** (dobro da duração anterior). Pausa continua congelando o ciclo.

## Histórico: correções e cenários da versão 1.10

- Reprodução **nativa dos MP3**, independente do AudioContext dos efeitos. O roteamento por MediaElementAudioSource foi removido para evitar silêncio ao abrir o HTML em uma origem local opaca.
- As três faixas foram reencodadas com amplitude medida de **40% dos originais**; o player usa volume 1 para não atenuar duas vezes. Isso mantém o volume solicitado inclusive em celulares que ignoram element.volume. Os originais fornecidos pelo usuário permanecem intactos fora do projeto.
- Motores, rotor e chuva iniciam com ganho zero antes de qualquer reprodução; menus não possuem ruído contínuo. Chuva agora usa ruído marrom filtrado e suave, e os motores têm senoides baixas. A música é independente desses efeitos.
- Novos cenários em PNG: **Desértico**, **Montanhas** e **Cidade japonesa**. Escolha no menu de configuração entre eles, Selva fortificada, Cidade em ruínas ou Aleatório. A opção aleatória evita repetir o mesmo fundo imediatamente na fase seguinte; a opção fixa permanece durante a campanha. A seleção é salva no aparelho.
- Os fundos mantêm névoa, ciclo de luz, chuva e efeitos da batalha distante, sem mudar a física do primeiro plano.
- Validação: decodificação completa dos três MP3 e medição RMS antes/depois em tests/music-levels.json; teste de ganho inicial dos efeitos, reprodução independente do sintetizador, seleção dos cinco fundos e partidas completas.

## Recursos preservados da versão 1.9

- Trilha a 40%: Smooth Action nos menus e pausa; Arcade Assault na implantação e combate; Mission Failed no resultado. Uma faixa por vez. O som começa na primeira interação permitida pelo navegador. A opção de som silencia música e efeitos; a aba oculta fica silenciosa.
- Sons baixos sincronizados com cada traçante, tiro de artilharia, explosão distante e cogumelo; motores e rotor acompanham aeronaves visíveis; chuva possui ruído suave. Efeitos são sintetizados localmente com Web Audio.
- Treinamento inicial com três quadros de personagens e terreno ampliados, mostrando andar, puxar e soltar para atirar.
- Tela final ilustrada com o trio da capa tombado; o painel de pontuação e estatísticas surge após três segundos. O resultado mantém o botão de próxima fase quando houver vitória.
- Crateras sofrem metade da deformação anterior; dano normal nos soldados permanece igual.
- Cada voo de suprimentos tem 30% de chance de substituir **uma** das duas caixas por uma especial, com chances iguais entre Reviver e Bombardeio. Coleta funciona para ambas as equipes.
- **Reviver:** o avião solta um aliado de paraquedas em posição aleatória no campo do coletor. Recupera o primeiro aliado eliminado com 100 PV; quando todos estão vivos, adiciona um reforço.
- **Bombardeio:** avião lança cinco disparos verticais aleatórios no campo adversário, cada um com 50% do dano normal. Esses tiros entram nas estatísticas de precisão e eliminações, mas não no contador de seis disparos para suprimentos. A deformação também respeita a redução do terreno.
- A câmera acompanha a ação especial até o pouso/saída do avião e o fim dos impactos. A jogada fica suspensa e o jogador não consome seus dois tiros. Pausa congela toda a ação.

## Ajustes preservados da versão 1.8

- Névoa clara suave apenas no fundo, com intensidade reduzida à noite. Soldados recebem um contorno branco fino e nomes maiores.
- Menus, pausa, configuração, resultados, tutorial, botões e painel de jogo usam fontes maiores e botões escuros com moldura metálica, seguindo a referência de arcade.
- Segurar o dedo ou mouse à esquerda/direita do soldado ativo movimenta; soltar, cancelar o toque ou pausar interrompe. Os botões laterais foram removidos.
- O estilingue só começa sobre o soldado ativo. Um toque ao lado, sobre outro soldado ou no céu não arma um tiro. Puxar sobre o personagem também permite voltar da mira manual ao estilingue.
- Quanto maior a força, mais a indicação curta se afasta e sobe. Ela continua sem revelar o arco completo. O projétil agora tem núcleo claro, fogo laranja e rastro curto incandescente.
- A IA pode planejar uma mudança de posição no início de seu turno (55% de chance, quando há caminho livre). Prioriza altura, espaço e bônus próximos; anda antes de recalcular o tiro. Consome o mesmo combustível e respeita muro, outros soldados e pausa.
- Avião e helicóptero originais em pixel art, com hélices/rotor animados. O apoio alterna os modelos a cada passagem e continua sendo acionado a cada seis disparos. Aeronaves decorativas também variam.

## Regras preservadas da versão 1.7

- Terreno com ondas mais amplas e frequências variadas, entre 255 e 465 unidades de altura, com colinas e vales em ambos os lados.
- Muro de alvenaria e arame no limite entre os campos, em x=600. A barreira é permanente: intercepta tiros baixos, inclusive projéteis rápidos, e bloqueia o deslocamento de soldados. É necessário lançar por cima do arame. A simulação balística da IA considera a mesma colisão.
- Todo novo disparo começa no modo estilingue, inclusive o segundo tiro do soldado. Os controles de ângulo/força ativam a mira manual para aquele disparo. O botão de alternância foi removido.
- A textura da terra é desenhada com saturação reduzida, preservando as cores dos soldados e do cenário. Os controles ocupam menos altura.

## Arte de arcade militar

- Capa original com três combatentes, ruínas tropicais, helicóptero, traçantes e grandes explosões.
- Seis modelos de soldados em atlas PNG transparente, com uniformes aliados em verde-oliva e rivais em ferrugem. Capacetes, bandana, óculos, mochilas e rifles. Animações de respiração, deslocamento e recuo; contornos escuros e placas de nome para leitura em fundos detalhados.
- Dois cenários ilustrados: selva fortificada e cidade em ruínas. Quatro tratamentos de ambiente, paralaxe, variação procedural da elevação e textura de solo com pedra, cascalho e raízes.
- Novos quadros de explosão, cogumelo nuclear, fumaça, clarão de disparo, projétil, avião, artilharia, tanque distante e caixas de suprimentos. Os efeitos de fundo são decorativos; impactos reais abrem crateras e causam dano.
- Fantasma com volume e transparência, radar verde, placas de aço oliva, rebites, botões de latão e título com tratamento de arcade. A interface permanece compacta.

As dez imagens principais foram criadas com **image_gen**, a ferramenta integrada de geração de imagens. As especificações utilizadas estão em [assets/PROMPTS.md](assets/PROMPTS.md), com os três novos fundos em [assets/CENARIOS-PROMPTS.md](assets/CENARIOS-PROMPTS.md). Os efeitos e modelos de contingência possuem fontes editáveis no código.

## Jogar e publicar

Abra `index.html` mantendo os arquivos desta pasta juntos. A entrega também inclui `combate-16-v1.11.html`, com todo o código e as dez imagens e três músicas incorporadas, para jogar em um único arquivo.

Para publicar no GitHub Pages, extraia o ZIP e envie o conteúdo desta pasta para a raiz do repositório (ou pasta selecionada como origem do Pages). `index.html`, `style.css`, `arcade-art.js`, `war-assets.js`, `game.js`, `icon.svg`, `.nojekyll` e a pasta `assets` devem permanecer disponíveis. Configure o Pages para a branch e a pasta utilizadas. Não há backend nem chamadas a serviços externos durante a partida.

## Regras e controles

**Iniciar → treinamento gráfico → configuração → posicionamento → combate.** Escolha campanha ou duelo local e a dificuldade. Posicione os três soldados no seu lado, tocando no terreno ou usando a barra de posição, e confirme com **COMBATER**. A câmera acompanha o soldado escolhido; o radar permite navegar pelo mapa.

Cada soldado tem dois disparos por turno. No estilingue, toque sobre o soldado ativo, puxe para trás e para baixo e solte. A distância define a força; a direção define o ângulo. Um toque simples não dispara. Nenhum tiro mostra a trajetória completa.

Cada oportunidade de tiro começa no estilingue. Tocar nos controles de ângulo/força ativa a mira manual. Um gesto ao lado do personagem movimenta; puxar sobre ele seleciona o estilingue. Use **DISPARAR**; ao liberar o próximo tiro, o estilingue é reativado automaticamente. **MIRA ANTERIOR** restaura o ajuste do último disparo. Segure ao lado do soldado para mover e solte para parar, com combustível renovado por turno. As explosões atingem aliados e inimigos. O muro central impede passagem e disparos baixos; as explosões não o destroem.

Movimentação por toque ou mouse no campo. Teclado: ↑/↓ ajustam ângulo; +/− ajustam força; espaço dispara; P pausa; M alterna a música; Escape cancela a puxada ou pausa. O som vem ligado e é liberado pela primeira interação, conforme a política do navegador.

Na campanha, cada vitória abre uma fase com três inimigos adicionais: 3, 6, 9… O trio retorna completo na próxima fase. A IA começa com índice de precisão de 35%, 50% ou 65% conforme a dificuldade, e ganha 3 pontos percentuais por fase até 95%. Esse índice controla a dispersão da mira; não é uma garantia de taxa de acerto.

**Pontos = eliminações × 1.000 × (1 + precisão / 100).** Um disparo que causa dano a rivais conta como um acerto, mesmo quando atinge vários. Cada rival eliminado conta separadamente; dano a aliados não pontua. Pontos acumulam na campanha, e o recorde fica no armazenamento local. Estatísticas detalhadas aparecem no resultado; durante o jogo, o topo mostra somente fase e pontos das equipes.

O avião de suprimentos passa a cada seis disparos combinados e lança duas caixas de paraquedas. Aviões decorativos, artilharia e rajadas traçantes têm relógios independentes. O primeiro cogumelo aparece entre 32 e 48 segundos de atividade; os seguintes, a cada 55–90 segundos. O ciclo manhã/dia/tarde/noite dura 200 segundos; cada fase tem 35% de chance de chuva. O brilho das explosões aumenta à noite. Pausar congela os relógios. A câmera observa qualquer soldado atingido por três segundos, inclusive antes do resultado da última eliminação.

## Arquivos de arte

| Arquivo | Uso |
| --- | --- |
| `assets/capa-arcade.png` | Capa |
| `assets/cenario-arcade.png` | Selva e posto fortificado |
| `assets/cidade-arcade.png` | Cidade em ruínas |
| `assets/soldados-arcade.png` | Atlas transparente, 3 colunas × 2 linhas |
| `assets/aeronaves-arcade.png` | Avião e helicóptero, duas colunas transparentes |
| `assets/terreno-arcade.png` | Textura do terreno destrutível |
| `assets/guerra-16bits.png` e `.json` | Atlas de efeitos, células de 64 × 64 |
| `explosion`, `nuclear`, `smoke`, `plane`, `shell`, `battery`, `crate`, `muzzle`, `tank` (`.png`) | Faixas de quadros separadas |

`arcade-art.js` carrega os PNGs, organiza os personagens, cria seus contornos e prepara os materiais. `war-assets.js` mantém a fonte do atlas animado e sua contingência em Canvas. `game.js` reúne física, câmera, campanha e renderização; `style.css` define os menus e a interface.

## Validação

Execute `npm test` com Node.js, ou `node tests/assets.cjs` e `node tests/engine.cjs`. Os testes verificam seleção de gestos por região de toque, movimento por toque e cancelamento, indicação de potência, deslocamento da IA com pausa/combustível, ondulações nas duas áreas de posicionamento, colisão do muro e do arame nas duas direções, projéteis rápidos, bloqueio de movimento, reinício automático do estilingue, integridade dos PNGs, transparência e grade do atlas, ordem de carregamento, navegação de menus, partidas completas, pontuação, fases, mira, suprimentos, efeitos, pausa, clima e os três segundos da câmera.

`tests/responsive.html` mostra o jogo real em quadros de 390 × 844, 320 × 568 e 844 × 390 para conferir o layout. A versão foi verificada no Chromium em computador e nesses quadros responsivos. Safari/iOS e hardware móvel real não foram testados.



## Áudios fornecidos

Os três MP3 foram fornecidos pelo usuário e estão em `assets/music-menu.mp3`, `assets/music-game.mp3` e `assets/music-end.mp3`. As faixas do projeto foram reencodadas com nível medido de 40% dos originais, preservando música e duração; o player reproduz essas cópias diretamente.

No HTML independente, os fundos e a capa usam compressão WebP sem perdas (pixels decodificados conferidos contra os PNGs); os sprites transparentes mantêm PNG. Os MP3 não incluem as imagens de capa embutidas, reduzindo o tamanho do arquivo sem afetar a música.
