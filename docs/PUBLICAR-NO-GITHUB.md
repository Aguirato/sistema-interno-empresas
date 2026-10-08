# Manter o projeto no GitHub

O repositório público já existe: **[Aguirato/sistema-interno-empresas](https://github.com/Aguirato/sistema-interno-empresas)**. Ele reúne o portfólio e o código sob [licença proprietária](../LICENSE) de Lucas Cerbaro Aguiar. Este guia de manutenção destina-se ao titular e aos colaboradores autorizados.

Trabalhe em uma cópia de desenvolvimento, separada da instalação da empresa. Atualizar o GitHub não altera o servidor em uso e não transfere os dados operacionais. Não é necessário criar outro repositório.

## 1. Obter uma cópia com GitHub Desktop

1. Instale o [GitHub Desktop](https://desktop.github.com/) e entre na conta com permissão para enviar alterações ao repositório.
2. Escolha **File → Clone repository → URL**.
3. Informe `https://github.com/Aguirato/sistema-interno-empresas`.
4. Escolha uma pasta de desenvolvimento no computador, diferente da pasta do servidor, e clique em **Clone**.
5. Abra **Repository → Show in Explorer**. `README.md`, `LICENSE`, `frontend/`, `server/` e `public/` devem aparecer diretamente na pasta clonada.

Se você já tem essa cópia no Desktop, apenas selecione o repositório existente. Preserve sua pasta `.git`, que contém o histórico local. [Guia oficial de clonagem](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop).

## 2. Enviar uma atualização pelo Desktop

1. Comece com a cópia local sem alterações pendentes. Clique em **Fetch origin** e, quando disponível, em **Pull origin**.
2. Edite somente os arquivos do projeto nessa cópia. Para mudanças na interface, siga a compilação descrita em [Instalação](INSTALACAO.md#7-compilar-alterações-de-interface).
3. Em **Changes**, revise os arquivos e as diferenças antes de gravar. Preserve `LICENSE`, créditos e avisos de terceiros.
4. Não envie `data/`, `backups/`, `logs/`, `rede.json`, `PRIMEIRO-ACESSO.txt`, credenciais, bancos ou exportações de produção. O `.gitignore` ajuda, mas não retira arquivos já versionados.
5. Em **Summary**, descreva a mudança, clique em **Commit to main** e depois em **Push origin**.
6. Use **Repository → View on GitHub** para conferir o commit, o README e os arquivos alterados.

Se houver alterações locais ao sincronizar ou conflitos, preserve o trabalho e revise a divergência antes de continuar. Não use envio forçado para encobrir um conflito. [Sincronização no Desktop](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop).

## 3. Alternativa pelo Git no terminal

Para clonar o repositório existente, abra o PowerShell na pasta que receberá a cópia de desenvolvimento:

```powershell
git clone https://github.com/Aguirato/sistema-interno-empresas.git
Set-Location sistema-interno-empresas
```

Para atualizar uma cópia já clonada, comece sem alterações pendentes:

```powershell
git status --short
git pull --ff-only
```

Faça as alterações e verificações necessárias. Depois revise e envie:

```powershell
git status --short
git diff
git add .
git diff --cached --stat
git diff --cached
git commit -m "Descreva a alteração realizada"
git push origin main
```

Revise o conteúdo selecionado, não apenas os nomes. Se um arquivo privado aparecer, remova-o da seleção com `git restore --staged -- caminho/do/arquivo` e confira a regra de exclusão antes do commit. A autenticação deve ocorrer pelo fluxo normal do Git/Git Credential Manager, sem inserir senhas ou tokens em URLs ou arquivos.

Se `git pull --ff-only` falhar, revise a divergência; não descarte alterações nem use `--force`. Se o repositório passar a usar proteção de branch, envie uma branch de trabalho e abra um pull request conforme a regra configurada.

## 4. Conferência antes de publicar

- O destino é `Aguirato/sistema-interno-empresas`.
- O README, as imagens e os links locais continuam funcionando.
- O titular Lucas Cerbaro Aguiar e a licença proprietária foram preservados.
- O código contém apenas exemplos fictícios; dados e configurações da empresa ficaram fora.
- Alterações de interface foram compiladas para `public/` e verificadas.
- A cópia da instalação em produção e seus backups permanecem separados.

O repositório público permite visualização e forks nos limites dos termos do GitHub. As demais condições constam em [Licenciamento](LICENCIAMENTO.md). Não basta uma licença para impedir tecnicamente que um visitante copie o código.

## 5. Código, hospedagem e backup

O GitHub armazena o código e os commits enviados. Ele não substitui o backup do sistema: contas, cadastros e históricos ficam no banco da instalação. Para mudar o servidor sem perder dados, use [Backup e transferência](BACKUP-E-TRANSFERENCIA.md).

GitHub Pages atende conteúdo estático e não executa este backend Node.js com SQLite. Publicar o código não disponibiliza os logins, cadastros e relatórios da instalação pela internet. Consulte [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages).
