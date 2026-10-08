# Segurança e informações internas

Este é um sistema de uso interno, executado na rede local configurada. A instalação padrão usa HTTP e não deve ser exposta diretamente à internet.

O repositório de código é público; a instalação e os dados da empresa permanecem privados. Informe problemas ao titular, Lucas Cerbaro Aguiar, por um canal privado já conhecido. Não publique senhas, tokens, dados de usuários, históricos, bancos ou detalhes de falhas em issues públicas.

Nunca versione `data/`, `backups/`, `logs/`, `rede.json`, `PRIMEIRO-ACESSO.txt` ou `data/email.key`. O `.gitignore` auxilia nessa separação; não remove arquivos que já tenham sido enviados ao Git.

Se uma credencial for publicada acidentalmente, revogue-a ou troque-a no serviço de origem. Remover somente o arquivo do commit mais recente não apaga versões anteriores.

Os exemplos de usinas e as capturas deste repositório são fictícios. Uma instalação nova gera uma senha temporária aleatória para o administrador. O destinatário de suporte usa `VOLTS_SUPPORT_EMAIL`; o padrão `suporte@example.invalid` deve ser substituído na configuração local antes de ativar notificações. Nenhuma conta SMTP ou senha real deve ser incluída no código.

Atualizações de dependências devem ser testadas antes de chegar ao servidor. Mantenha o Windows e a versão compatível do Node.js atualizados e faça backups separados do repositório, conforme [o guia](docs/BACKUP-E-TRANSFERENCIA.md).
