# Lebot Desk

## Desenvolvimento

```powershell
npm start
```

## Build local

```powershell
npm run build
```

Gera o instalador Windows x64 em `dist`, sem enviar ao GitHub.

## Release no GitHub

Configure `GH_TOKEN` no ambiente do terminal.

```powershell
npm run release
```

Gera o instalador Windows x64 e publica os arquivos na release correspondente a versao do `package.json` no repositorio `eliasportela/lebot-electron`. A release fica publicada, nao em rascunho. Incremente a versao antes de preparar uma nova release. Nunca inclua o token nos arquivos do projeto.
