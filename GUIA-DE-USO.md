# Guia de uso — VOLTS COG 2.3.0

Entre pelo endereço criado no arquivo **ABRIR.url** da instalação. O computador servidor deve permanecer ligado e conectado à rede local configurada. As estações usam o mesmo banco no servidor; não precisam de uma instalação própria.

## Primeiro acesso

1. Em uma instalação nova, execute **INICIAR.cmd** no servidor.
2. Abra **PRIMEIRO-ACESSO.txt** nessa pasta e consulte a senha temporária do usuário **admin**.
3. Entre e escolha uma nova senha com pelo menos 10 caracteres. A troca inicial é obrigatória.
4. Entre novamente com a nova senha. O arquivo de primeiro acesso é removido após a troca.

Uma instalação transferida com seu banco mantém os usuários e senhas existentes. Este pacote de código não contém essas contas.

## Usuários e administradores

Em **Administração → Usuários → Novo usuário**, informe nome, usuário de login, tipo (Operador ou Sócio) e senha temporária. A opção **Permitir administrar usuários, usinas e configurações** concede a permissão administrativa a qualquer um dos tipos.

Usuários operacionais consultam e cadastram registros, leituras, solicitações, atualizações, recados, chaves e veículos. Administradores também gerenciam usuários, usinas e e-mail e arquivam registros operacionais. O sistema impede a desativação ou retirada de permissão do último administrador ativo.

Redefinir senha, desativar conta ou alterar a permissão administrativa encerra as sessões da conta afetada. Para mudar a própria senha, use o ícone de chave ao lado do nome. As sessões duram no máximo oito horas.

## Diário de operação e recados

Em **Diário de operação**, registre rotina ou anormalidade, selecione a usina e informe a data/hora e a descrição. O autor é vinculado ao usuário conectado. Use os filtros para localizar registros por período, pessoa ou conteúdo. Administradores podem arquivar registros; isso preserva sua identificação no banco.

O mural de recados apresenta mensagens da operação na visão geral.

## Leituras manuais

1. Abra **Leituras**. A consulta inicial traz somente as últimas 24 horas.
2. Ajuste usina, UG, início, fim, pessoa ou observação.
3. Clique em **Consultar** para aplicar os filtros. Há até 30 registros por página.
4. Use **Últimas 24h** para retornar ao período recente.
5. Clique em **Nova leitura**, selecione a usina e a UG e preencha as medições do modelo correspondente.
6. Revise a data/hora, acrescente observações e salve.

Campos vazios significam ausência de informação; zero é uma medição válida. A mesma UG não pode ter duas leituras ativas no mesmo instante. Ao trocar usina/UG no formulário, as medições ainda não salvas são limpas.

As novas leituras guardam uma cópia do modelo usado. Modelos históricos não são reinterpretados automaticamente. Rótulos e unidades do modelo são preservados; não há conversão implícita de medições.

O cadastro administrativo de uma nova usina/UG não cria por si só um modelo de leitura. Se não houver um modelo confirmado no código, a unidade não recebe campos de outra usina. Os modelos ficam em **server/reading-profile-templates.json** e são associados pelas regras de **server/reading-profiles.mjs**.

## Relatórios e gráficos de leituras

1. Abra **Relatórios → Leituras manuais**.
2. Selecione o período e, se necessário, usina, UG, autor e observação.
3. Clique em **Consultar**. Os resultados não são carregados automaticamente ao abrir essa tela.
4. Em **Relatórios**, selecione a combinação de usina/UG/modelo desejada.
5. Use as páginas da tabela, o CSV do grupo, **CSV consolidado** ou **Imprimir relatório completo / PDF**.
6. Em **Gráficos**, selecione a unidade/modelo e a visualização desejada.

Cada usina/UG/modelo tem uma tabela própria, com até quatro leituras por bloco. A tela apresenta um bloco por vez para reduzir o uso de memória; a impressão completa prepara todos os blocos da consulta.

As três visualizações são:

- **Potência no tempo:** potência ativa em kW ao longo do período.
- **Temperaturas e potência:** potência e até quatro temperaturas, com eixos separados em kW e °C.
- **Temperatura × potência:** pares de valores registrados na mesma leitura.

Temperaturas sem unidade confirmada não são tratadas como °C nos gráficos; permanecem nos relatórios com a identificação original. Ausências não são transformadas em zero. Séries extensas podem ser resumidas para exibição, com indicação na tela; os relatórios e CSV preservam as leituras retornadas pela consulta.

Os horários são apresentados no horário de Brasília. O início do período é inclusivo; o fim é exclusivo. Para um dia completo, escolha de 00:00 desse dia até 00:00 do dia seguinte. Uma consulta de relatório aceita até 5.000 leituras; se ultrapassar, reduza o período ou filtre usina/UG.

**Imprimir gráficos / PDF** imprime a visualização selecionada. Escolha **Salvar como PDF** no diálogo do navegador para gerar o arquivo.

## Frota

Em **Frota → Novo veículo**, informe modelo e placa e, quando disponível, responsável, situação de manutenção, previsão e observações. É possível editar depois.

As abas de frota e manutenção ajudam a localizar veículos por modelo, placa, responsável ou situação. Use os comandos do próprio sistema para excluir; não apague registros diretamente do banco.

Em **Frota → Relatórios**, filtre período, pessoa e demais campos disponíveis. Os relatórios usam os históricos registrados no sistema e oferecem CSV e impressão/PDF.

Nesta entrega para instalação nova, nenhum veículo ou histórico está preenchido.

## Registro de chaves

1. Abra **Registro de chaves → Cadastrar chave**.
2. Informe nome, local e tipo (obra, usina, apartamento/alojamento ou outro). Código/etiqueta e observações são opcionais.
3. Para cadastrar uma chave que está saindo, mantenha a opção de registrar a retirada e informe pessoa, data/hora e, se desejar, previsão de devolução.
4. Para uma chave que continua na empresa, desmarque a retirada.
5. Nas próximas saídas, use **Registrar retirada** no cadastro existente.
6. Na devolução, use **Registrar devolução** e informe data/hora e observações.

Cada cadastro representa uma chave física ou um molho. Use códigos diferentes para cópias do mesmo local. A pessoa que retira não precisa ter conta no COG.

Uma chave não pode ter duas retiradas abertas. A devolução não pode ser anterior à saída. Atraso indica previsão vencida de uma retirada ainda aberta.

O **Histórico** preserva retiradas, devoluções, responsáveis e identificação da chave na época. Administradores podem arquivar chaves disponíveis e restaurá-las.

Em **Registro de chaves → Relatórios**, filtre período, pessoa, local, chave e situação. O período inclui retiradas que passaram pelos dias escolhidos, mesmo iniciadas antes. A situação exibida é a atual. Exporte CSV ou use **Imprimir / PDF**.

## Suporte técnico e e-mail

Cadastre a solicitação indicando usina, tipo, descrição e responsáveis. Acompanhe as situações **Aberta**, **Em andamento** e **Finalizada**, com histórico das atualizações.

Cada solicitação cria um aviso para o destinatário definido na variável de ambiente `VOLTS_SUPPORT_EMAIL` do servidor. O exemplo `suporte@example.invalid` não permite ativar o envio; configure seu próprio destinatário antes de habilitar o SMTP. Falhas de envio não apagam a solicitação. Em uma instalação nova, configure o SMTP para habilitar a entrega:

1. Acesse **Administração → E-mail**.
2. Informe servidor SMTP, porta, segurança, conta de envio e credencial exigida pelo provedor.
3. Salve e use **Verificar conexão salva** para conferir a autenticação.
4. Ative o envio automático e salve. Avisos pendentes também podem ser enviados.

A verificação de conexão não manda e-mail de teste. A fila tenta novamente após falhas, até cinco tentativas; depois, use **Tentar novamente** após corrigir a configuração. “Enviado” indica aceitação pelo servidor SMTP, não confirmação de leitura ou chegada à caixa de entrada.

A senha SMTP fica criptografada no banco e depende de **data/email.key**. Nunca publique essa chave ou o banco. Consulte [Backup e transferência](docs/BACKUP-E-TRANSFERENCIA.md).

Para Gmail, consulte as condições de [senhas de aplicativo do Google](https://support.google.com/accounts/answer/185833?hl=pt-BR). Para opções do transporte, consulte [Nodemailer SMTP](https://nodemailer.com/smtp).

## Instalação, parada e backup

Use **INICIAR.cmd** para ligar o servidor e **PARAR.cmd** para desligá-lo. Fechar o navegador não para o servidor. Erros de inicialização ficam em **logs/erros.log**.

O banco fica em **data/frota.sqlite**. Não o substitua pelo conteúdo de um ZIP de código. Siga [Instalação](docs/INSTALACAO.md) e [Backup e transferência](docs/BACKUP-E-TRANSFERENCIA.md) para os procedimentos completos.
