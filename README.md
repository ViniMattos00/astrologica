# AstroLogica

AstroLogica é um jogo educativo web onde o jogador programa um rover para resgatar um astronauta perdido em uma missão espacial. Em vez de controlar o veículo diretamente, o jogador constrói um algoritmo visualmente, arrastando blocos de comandos e observando a execução passo a passo. O objetivo é estimular pensamento computacional, planejamento e otimização.

## ✨ Principais recursos

- Editor de programas com blocos (mover, virar, repetir, condicionais) e suporte a drag-and-drop hierárquico.
- Execução animada do rover em um grid 2D renderizado com Konva, com visual futurista minimalista.
- Sistema de fases progressivas que introduz gradualmente sequências, obstáculos, loops, condicionais e otimização.
- Avaliação de desempenho por estrelas e persistência local do melhor resultado de cada fase.
- Interface responsiva construída com React, TypeScript, Zustand, DnD Kit, Konva e TailwindCSS.

## 🧩 Estrutura das fases

| Fase | Conceito | Destaques |
| ---- | -------- | --------- |
| 1. Ponto de Partida | Sequências | Movimento simples até o astronauta |
| 2. Terreno Pedregoso | Condicionais iniciais | Análise de caminho livre e obstáculos |
| 3. Caminho Repetitivo | Loops | Incentivo à repetição e otimização |
| 4. Cavernas de Gelo | Condicionais avançadas | Introdução ao bloco `else` e eficiência |

Cada fase possui objetivos específicos, solução ótima estimada e desbloqueio progressivo de blocos. O progresso e as melhores execuções são armazenados no `localStorage`.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** TailwindCSS com tema customizado
- **Canvas:** Konva / react-konva
- **Estado:** Zustand com middleware Immer
- **Drag & Drop:** DnD Kit

## 📦 Como executar

```bash
# instalar dependências
npm install

# executar em modo desenvolvimento
npm run dev

# gerar build de produção
npm run build

# pré-visualizar build
npm run preview
```

O projeto foi testado com Node.js 20.17.0, porém o Vite recomenda Node 20.19+ ou 22.12+. Caso esteja utilizando uma versão anterior, considere atualizar.

## 🕹️ Como jogar

1. Escolha uma fase desbloqueada no painel esquerdo.
2. Monte o programa arrastando blocos no editor ou adicionando-os pelo painel de blocos disponíveis.
3. Utilize laços e condicionais dentro dos respectivos slots para comportamentos mais complexos.
4. Clique em **Executar** para ver o rover em ação, **Passo** para depurar ou **Resetar** para começar de novo.
5. Busque melhorar a solução reduzindo a quantidade de comandos — isso rende mais estrelas e desbloqueia novas fases.

## 🗂️ Organização do código

- `src/core/` – Tipagens, interpretador de comandos, motor de jogo, métricas e utilidades globais.
- `src/components/` – Componentes de UI (palette, editor, stage, controles).
- `src/state/` – Store global com Zustand para programa, fases e execução.
- `src/data/` – Definições das fases e utilitários de grid.
- `src/services/` – Persistência de progresso em `localStorage`.
- `src/theme/` – Tokens e configurações visuais.

## 🔭 Próximos passos sugeridos

- Adicionar mais fases com novas mecânicas (sensores, energia limitada, portais).
- Criar editor de fases para educadores.
- Salvar e compartilhar soluções com a comunidade.
- Incluir efeitos sonoros e narrativa contextual.
- Expandir suporte a diferentes resoluções e acessibilidade (narrativa e teclado).

## 📄 Licença

Este projeto foi desenvolvido como um MVP educativo. Adapte, expanda e compartilhe de acordo com as necessidades do seu curso ou laboratório.
