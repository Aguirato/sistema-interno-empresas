# Instalação — Projeto Sistema Interno para Empresas

Este procedimento destina-se ao titular e às pessoas ou organizações autorizadas pela [licença proprietária](../LICENSE). Ele cria uma **instalação nova**, com exemplos fictícios de usinas e sem contas, credenciais ou histórico operacional da empresa. Para mudar o sistema existente de computador mantendo os dados, use [Backup e transferência](BACKUP-E-TRANSFERENCIA.md).

O pacote inclui a interface compilada em `public/`. Não é necessário compilar a interface para começar a usar essa versão.

## 1. Prepare o computador servidor

Escolha um computador Windows conectado à rede interna e que possa permanecer ligado enquanto outras pessoas usam o sistema. Essa máquina armazena o banco e executa o servidor; os demais computadores acessam a aplicação pelo navegador.

1. Instale a versão **24.x do Node.js**, compatível com o `package.json` deste projeto, pelo [site oficial do Node.js](https://nodejs.org/en/download).
2. Abra uma nova janela do PowerShell e confira:

```powershell
node --version
npm --version
```

O primeiro comando deve mostrar uma versão que começa com `v24.`. O backend desta entrega utiliza o módulo `node:sqlite` do Node.js.

3. Extraia o projeto em uma pasta nova no disco local, por exemplo `C:\Sistemas\Sistema-Interno-Empresas`. Esse caminho é apenas uma sugestão.
4. Confirme que `INICIAR.cmd`, `PARAR.cmd`, `server/`, `public/` e `rede.exemplo.json` estão diretamente nessa pasta.

Mantenha a instalação operacional separada da cópia de desenvolvimento usada para enviar código ao GitHub. Não execute o banco por uma pasta sincronizada ou compartilhada entre diferentes computadores.

## 2. Configure a interface de rede

1. Copie `rede.exemplo.json` para um novo arquivo chamado **`rede.json`**, na mesma pasta. Preserve o arquivo de exemplo.
2. Descubra a interface da rede interna do computador. Os comandos abaixo apenas consultam as informações:

```powershell
Get-NetAdapter | Select-Object Name, Status, MacAddress
Get-NetIPConfiguration
Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress, PrefixLength
```

3. Use a placa conectada à rede da empresa. Confira o endereço MAC, o IPv4 e a máscara dessa interface. Se houver diversas placas ou VPN, peça ao responsável pela rede que confirme a interface correta.
4. Edite `rede.json` no Bloco de Notas, mantendo um JSON válido.

**Exemplo fictício — substitua pelos dados do novo servidor e da sua rede:**

```json
{
  "port": 8080,
  "adapterMac": "00:11:22:33:44:55",
  "network": "192.168.10.0",
  "netmask": "255.255.255.0"
}
```

| Campo | Como preencher |
| --- | --- |
| `port` | Mantenha `8080`. Os scripts de iniciar e parar desta versão utilizam essa porta. |
| `adapterMac` | MAC da placa selecionada, com **dois-pontos**. Se o Windows exibir `00-11-22-33-44-55`, escreva `00:11:22:33:44:55`. |
| `network` | Endereço da sub-rede, não o endereço individual do computador. No exemplo fictício com máscara `/24`, a rede é `192.168.10.0`. |
| `netmask` | Máscara real da interface, em formato decimal. `255.255.255.0` corresponde a `/24`; outras redes podem usar outra máscara. |

O servidor confere MAC, máscara e pertencimento à sub-rede. Se não encontrar uma interface correspondente, não inicia o atendimento. Não use os números fictícios sem conferir a configuração real.

## 3. Inicie e faça o primeiro login

1. Clique duas vezes em **`INICIAR.cmd`**.
2. Aguarde o navegador abrir. O processo do servidor fica em segundo plano.
3. Em uma instalação sem usuários, abra o arquivo **`PRIMEIRO-ACESSO.txt`** criado na pasta do sistema.
4. Use o usuário **`admin`** e a **senha temporária aleatória** informada nesse arquivo.
5. Troque a senha quando solicitado. A nova senha deve ter de **10 a 128 caracteres** e ser diferente da temporária.
6. Entre novamente com a nova senha. O arquivo de primeiro acesso é removido após a troca.

Não existe uma senha fixa de administrador no repositório. Guarde a nova senha em local apropriado; não a inclua em commits, prints ou documentação pública.

Depois do primeiro login, configure os cadastros necessários e crie as contas dos usuários em **Administração**. Consulte o [guia de uso](../GUIA-DE-USO.md) para as funcionalidades.

## 4. Acesse em outros computadores

Após iniciar, o sistema cria o atalho **`ABRIR.url`** com o endereço da instalação. O formato é `http://ENDERECO_DO_SERVIDOR:8080/`, substituindo o texto pelo IPv4 real do servidor.

1. No computador servidor, confira o endereço que o navegador abriu.
2. Em outro computador da mesma rede configurada, abra esse endereço no navegador.
3. Faça login com uma conta cadastrada no sistema.

Se funcionar no servidor, mas não nas outras estações, confira se ambas estão na mesma sub-rede e se existe isolamento entre dispositivos. Se necessário, o administrador da rede deve permitir a entrada **TCP 8080 somente no perfil Privado e para a sub-rede local autorizada**. Não é necessário desativar o firewall nem abrir portas no roteador.

Esta instalação não configura túnel, publicação na internet ou acesso externo. Para manter o endereço estável, o responsável pela rede pode reservar o IPv4 do servidor no DHCP. Se o endereço da interface mudar durante a execução, o servidor encerra o atendimento e precisa ser iniciado novamente após conferir a configuração.

## 5. Rotina de iniciar e parar

- Para iniciar, execute **`INICIAR.cmd`** no computador servidor.
- Para encerrar antes de manutenção ou backup, execute **`PARAR.cmd`** na pasta da instalação em funcionamento.
- Fechar o navegador não encerra o servidor.
- Desligar ou suspender o computador impede o acesso pelas outras estações.
- Este pacote não instala um serviço nem configura inicialização automática com o Windows. Depois de reiniciar o computador, execute `INICIAR.cmd` novamente.

O script de parada confere a identidade do processo antes de encerrá-lo. Se informar divergência, não encerre todos os processos Node indiscriminadamente: confirme a pasta e a instância em uso.

## 6. E-mail de suporte

Em **Administração → E-mail**, configure a conta de envio SMTP e ative o envio. A conta e a credencial de envio são configurações privadas da instalação. O destinatário do suporte não substitui essas credenciais.

Defina o destinatário pela variável de ambiente **`VOLTS_SUPPORT_EMAIL`** no computador servidor antes de iniciar o sistema. O valor padrão é `suporte@example.invalid`, um marcador que não recebe mensagens. Use o endereço autorizado para a sua instalação; o repositório não inclui o endereço real da empresa.

No PowerShell, este exemplo define o destinatário para o processo iniciado na mesma janela. Substitua o valor de exemplo pelo endereço real, mantendo a configuração fora do Git:

```powershell
$env:VOLTS_SUPPORT_EMAIL = 'suporte@exemplo.com'
.\INICIAR.cmd
```

Para persistir a configuração no Windows, adicione `VOLTS_SUPPORT_EMAIL` às variáveis de ambiente da conta que inicia o servidor e reabra a sessão ou o terminal de inicialização. Reinicie o servidor após mudanças no destinatário. Alterar a variável de uma janela já aberta não muda um processo que está em execução.

Confira o destinatário e o SMTP antes de habilitar envios. O guia demonstra a configuração; não realiza envio de e-mail por si só.

Consulte o guia de uso para o comportamento da fila. A chave local em `data/email.key`, quando criada, precisa acompanhar o banco em backups e transferências para preservar o acesso às configurações cifradas.

## 7. Compilar alterações de interface

Esta etapa é para desenvolvimento ou atualização do código pelo titular ou por colaboradores autorizados. Execute os comandos na **raiz da cópia de desenvolvimento**, onde está o `package.json` principal:

```powershell
npm --prefix frontend ci
npm run typecheck
npm run build
npm run verificar
```

O primeiro comando instala as dependências do frontend e requer acesso ao registro npm. O build grava a interface compilada em `public/`. O backend JavaScript não precisa de compilação. `npm run verificar` executa a verificação de entrega definida em `scripts/verificar-repositorio.mjs`; isso não substitui testes funcionais do sistema.

Antes de colocar uma versão modificada em uso, siga [Backup e transferência](BACKUP-E-TRANSFERENCIA.md). Não sobrescreva a instalação ativa com a cópia limpa do repositório.

## 8. Problemas comuns

| Sintoma | Conferência |
| --- | --- |
| `node` não é reconhecido | Instale Node.js 24.x, feche e reabra o terminal. Confira a instalação no PATH. |
| Servidor não inicia | Consulte `logs/erros.log` e `logs/processo.log`. Confira `rede.json`, conexão da interface e disponibilidade da porta 8080. |
| Rede configurada não encontrada | Confira MAC com dois-pontos, máscara e rede. A interface precisa estar ativa. |
| Script bloqueado por política do Windows | Solicite ao administrador a liberação dos scripts revisados conforme a política da empresa; não desative controles globalmente. |
| Funciona somente no próprio servidor | Confira sub-rede, isolamento entre estações e a regra restrita do firewall. |
| Login antigo não funciona em instalação nova | Uma cópia limpa gera uma senha nova em `PRIMEIRO-ACESSO.txt`; contas anteriores só existem no backup do banco original. |
| Dados antigos não aparecem | Pare e confira a origem da instalação. Clonar o GitHub não transfere o banco da empresa. |

Não compartilhe logs ou arquivos de configuração sem revisar se contêm dados privados. Para preservar a instalação existente, mantenha o backup anterior até concluir as verificações.
