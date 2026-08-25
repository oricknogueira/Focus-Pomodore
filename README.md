# Focus — Pomodoro Dashboard

Timer Pomodoro minimalista com modo claro/escuro, sistema de XP, níveis, estrelas e histórico de sessões. Feito em **HTML + CSS + JavaScript puro** — sem build, sem dependências.

## Rodar localmente (VS Code)

1. Abra a pasta `pomodoro-app` no VS Code.
2. Instale a extensão **Live Server** (opcional, mas recomendado) e clique em "Go Live" no `index.html`.
   - Ou simplesmente abra o arquivo `index.html` direto no navegador.
3. Pronto — o app já funciona e salva seu progresso no navegador (`localStorage`).

## Funcionalidades

- Timer com 3 modos: Foco, Pausa Curta, Pausa Longa
- Configurações personalizáveis (duração de cada modo + intervalo até pausa longa)
- Sistema de XP e Níveis (+25 XP por pomodoro concluído)
- Estrelas acumuladas a cada pomodoro
- Estatísticas: pomodoros hoje, total, horas focadas, sequência de dias
- Histórico das últimas sessões
- Modo claro / escuro com preferência salva
- Progresso salvo automaticamente (localStorage) — some apenas se você limpar os dados do navegador ou clicar em "Zerar progresso"

## Subir no GitHub

```bash
cd pomodoro-app
git init
git add .
git commit -m "Primeiro commit: Focus Pomodoro Dashboard"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
git push -u origin main
```

> Crie o repositório vazio no GitHub antes (sem README/gitignore) para evitar conflito no primeiro push.

## Próximos passos (ideias)

- Publicar via GitHub Pages (Settings → Pages → branch `main` → pasta raiz)
- Notificações do navegador quando a sessão terminar
- Gráfico semanal/mensal de horas focadas
- Sincronizar progresso com uma conta (hoje é 100% local)
