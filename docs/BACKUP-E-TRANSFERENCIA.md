# Backup e transferência — Projeto Sistema Interno para Empresas

Para mudar o sistema de computador mantendo os registros, leve uma **cópia completa da instalação operacional, com o servidor parado**. O repositório GitHub e o ZIP de código não contêm os dados da empresa e não substituem esse backup.

Este documento orienta o procedimento; publicar o código no GitHub não executa uma transferência nem altera o servidor atual.

## 1. O que deve ser preservado

| Item da instalação | Motivo |
| --- | --- |
| `data/` inteira | Banco de dados, contas, registros, configurações e arquivos privados da aplicação. |
| `data/frota.sqlite` | Banco principal desta versão. |
| Arquivos `-wal` e `-shm`, se presentes | Arquivos auxiliares associados ao SQLite; não descarte nem copie de momentos diferentes. |
| `data/email.key`, se presente | Chave necessária às configurações de e-mail cifradas. |
| `rede.json` | Configuração da interface e da rede; deve ser adaptada no novo computador. |
| `server/`, `public/`, scripts e demais arquivos da instalação | Código efetivamente em uso, inclusive adaptações locais e dependências. |
| `backups/` e `logs/` | Cópias anteriores e informações de diagnóstico. |

O modo WAL do SQLite pode manter transações confirmadas fora do arquivo principal até o checkpoint. Por isso, copiar somente `frota.sqlite` enquanto a aplicação funciona pode deixar registros de fora. A orientação aqui é parar a aplicação e copiar a pasta completa, incluindo os arquivos auxiliares que restarem. [Documentação SQLite sobre WAL](https://sqlite.org/wal.html).

As cópias automáticas do banco feitas pelo aplicativo ao iniciar ou antes de migrações são uma proteção adicional. Elas não incluem necessariamente todas as configurações e chaves da instalação e não substituem um backup completo externo.

## 2. Fazer um backup completo

1. Avise os usuários sobre a breve parada e peça que concluam os lançamentos em andamento.
2. Identifique a **pasta realmente utilizada pelo servidor atual**. Não use como origem uma cópia antiga de desenvolvimento ou o pacote limpo preparado para GitHub.
3. No servidor, execute **`PARAR.cmd`** dessa instalação.
4. Confirme a mensagem de encerramento. Atualize a página do sistema: novas consultas ao servidor devem falhar. Uma página já carregada pode continuar visível no navegador mesmo com o servidor parado.
5. Se a parada falhar, resolva o motivo antes de copiar. Não apague o banco nem encerre processos sem identificar a instância correta.
6. Copie a **pasta completa da instalação** para um destino separado, com data e hora no nome. Exemplo fictício: `Sistema-Interno-backup-AAAA-MM-DD-HHMM`.
7. Confirme que a cópia contém `data/`, o banco, a chave de e-mail quando existente, `rede.json`, `server/`, `public/` e os demais arquivos. Não aceite avisos de cópia incompleta ou arquivos ignorados.
8. Se for apenas um backup, execute **`INICIAR.cmd`** na instalação original e confira o acesso.
9. Guarde também uma cópia do backup em outro dispositivo ou armazenamento controlado pela empresa, com acesso restrito.

Mantenha o backup fora da própria pasta que está copiando para evitar cópias recursivas. Não envie esse material ao repositório: ele contém dados e configurações privadas. Preserve versões anteriores suficientes para recuperar erros percebidos depois.

Uma cópia feita com o banco em operação exige um mecanismo próprio, como a API de backup do SQLite ou `VACUUM INTO`. O procedimento manual acima usa uma parada para simplificar a cópia completa e consistente. [Técnicas oficiais de backup do SQLite](https://sqlite.org/backup.html).

## 3. Transferir definitivamente para outro computador

### 3.1 Prepare o destino

1. Verifique a versão do Node.js usada no servidor original com `node --version`.
2. Instale no novo computador um ambiente compatível com a instalação original. A versão limpa deste repositório exige **Node.js 24.x**; instalações que receberam outro driver SQLite ou dependências nativas devem preservar também a compatibilidade dessas adaptações.
3. Escolha uma pasta nova no disco local do destino. Não sobreponha uma instalação diferente que contenha dados.
4. Confira se o destino está conectado à rede autorizada e se a porta 8080 está disponível.

### 3.2 Faça a cópia final

1. Defina o horário de troca com os usuários.
2. Registre, pela interface, alguns dados de conferência: quantidade de registros usando o mesmo período e filtros, últimos lançamentos, usuários, veículos e chaves em circulação.
3. Faça o backup completo seguindo a seção 2, **mantendo o servidor antigo parado depois da cópia**.
4. Transfira essa cópia final inteira para a nova pasta no destino.
5. Confira se todos os arquivos foram transferidos. Preserve o backup original sem modificá-lo.

Durante a troca, não deixe dois servidores recebendo lançamentos. Bancos que passam a receber registros em paralelo deixam de representar o mesmo histórico.

### 3.3 Ajuste a rede e inicie

1. No destino, edite somente a cópia de `rede.json` da nova instalação para indicar a placa, a sub-rede e a máscara corretas. O MAC da placa antiga não identifica a placa do computador novo.
2. Mantenha a porta **8080**, usada pelos scripts fornecidos. Consulte [Instalação](INSTALACAO.md#2-configure-a-interface-de-rede) para descobrir os dados e formatar o MAC com dois-pontos.
3. Se necessário, o administrador deve permitir TCP 8080 apenas no perfil Privado, limitado à sub-rede autorizada. Preserve as demais regras de segurança da rede.
4. Confirme que a instalação antiga continua parada.
5. Execute **`INICIAR.cmd`** no novo computador.
6. Abra o endereço criado em **`ABRIR.url`**. O endereço provavelmente será diferente do antigo, a menos que o responsável pela rede preserve ou reserve o mesmo IPv4.

Uma transferência correta do banco mantém os usuários e suas senhas existentes. Se surgir uma instalação vazia ou um novo primeiro acesso quando você esperava os dados antigos, pare: confira se copiou a pasta certa e se o banco está no local correto. Não comece a cadastrar tudo novamente antes dessa verificação.

### 3.4 Confira antes de liberar

- Entre com uma conta que já existia.
- Confira usuários e permissões, veículos, responsabilidades, manutenções, chaves e movimentações.
- Nas leituras, use os **mesmos filtros e período** registrados antes da troca; a tela inicia nas últimas 24 horas e não mostra todo o histórico automaticamente.
- Confira os últimos diários, solicitações de suporte e observações.
- Gere um relatório e confira os gráficos de leituras.
- Verifique as configurações e a situação da fila de e-mail. Se precisar realizar um envio de teste, combine o teste com o responsável e use um recurso previsto pela aplicação; não crie solicitações fictícias sem necessidade.
- Acesse o novo endereço em uma estação da rede.
- Confira `logs/erros.log` se houver qualquer falha.

Somente depois da conferência, informe o novo endereço aos usuários e atualize os atalhos. Mantenha a instalação antiga desligada e o backup guardado até confirmar que a operação está normal.

## 4. Atualizar o código sem perder dados

O pacote para GitHub é uma base limpa para versionamento e instalação nova. **Não copie todos os arquivos do repositório por cima de uma instalação em produção.**

1. Compare a versão de código em uso com a atualização desejada.
2. Identifique adaptações locais, especialmente driver SQLite, runtime, dependências, envio de e-mail e scripts de inicialização. Preserve-as ou integre explicitamente as mudanças.
3. Teste a atualização em ambiente separado antes de aplicar no servidor. Evite que uma cópia de teste envie e-mails reais ou receba lançamentos dos usuários.
4. Faça o backup completo da instalação atual com o servidor parado.
5. Aplique somente os arquivos da atualização compatível e revisada, usando o atualizador da versão quando houver um. Preserve banco, chaves, configurações e backups.
6. Inicie uma única instância, aguarde eventuais migrações e repita a conferência funcional.

O código aplica migrações pendentes no banco ao iniciar e cria uma cópia SQLite antes de alterações de esquema. Ainda assim, mantenha o backup completo anterior; voltar somente o código pode ser incompatível com um banco que já recebeu migrações.

## 5. Restaurar ou desfazer uma transferência

Se for necessário voltar ao estado do backup:

1. Pare a instalação com problema e interrompa novos lançamentos.
2. Faça uma cópia separada dessa instalação para preservar os registros feitos depois do backup.
3. Restaure o backup completo em uma pasta adequada, preservando a relação entre código, banco, arquivos auxiliares e chave de e-mail.
4. Ajuste `rede.json` caso o computador ou a rede tenham mudado.
5. Confirme que apenas uma instalação será iniciada e faça a conferência funcional.

Restaurar um backup retorna o banco ao momento em que ele foi feito. Registros posteriores precisam ser recuperados e conciliados antes da retomada; não os descarte para resolver uma falha de atualização.

Se o novo servidor já recebeu lançamentos após a transferência, não basta ligar o antigo: ele não terá esses novos registros. Mantenha ambos parados enquanto define qual banco é o mais recente e como preservar as alterações.

## 6. Checklist de transferência

- [ ] Identifiquei a instalação realmente utilizada e seu ambiente de execução.
- [ ] Os usuários concluíram os lançamentos antes da parada.
- [ ] Fiz a cópia completa com o servidor antigo parado.
- [ ] Banco, arquivos auxiliares existentes, chave de e-mail e adaptações locais acompanharam a cópia.
- [ ] Ajustei a rede para o computador novo e mantive a porta 8080.
- [ ] Apenas uma instância está recebendo lançamentos.
- [ ] Conferi usuários, registros recentes, relatórios e acesso pela rede.
- [ ] Guardei o backup anterior e atualizei os atalhos dos usuários.

Para publicar apenas o código, consulte [Publicar no GitHub](PUBLICAR-NO-GITHUB.md).
