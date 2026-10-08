$ErrorActionPreference = 'Stop'
$folder = $PSScriptRoot
New-Item -ItemType Directory -Path (Join-Path $folder 'logs') -Force | Out-Null
$node = (Get-Command node.exe -ErrorAction Stop).Source
try {
  $state = Invoke-RestMethod 'http://127.0.0.1:8080/__volts/health' -TimeoutSec 2
  if ($state.application -eq 'volts-cog-lan') { Start-Process $state.url; exit 0 }
} catch {}
Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $folder 'server/server.mjs') + '"') -WorkingDirectory $folder -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder 'logs/processo.log') -RedirectStandardError (Join-Path $folder 'logs/erros.log')
for ($i=0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try { $state=Invoke-RestMethod 'http://127.0.0.1:8080/__volts/health' -TimeoutSec 2; if($state.application -eq 'volts-cog-lan'){Start-Process $state.url; exit 0} } catch {}
}
throw 'O servidor nao iniciou. Confira a conexao Ethernet e o arquivo logs/erros.log.'
