$ErrorActionPreference='Stop'
$state=Invoke-RestMethod 'http://127.0.0.1:8080/__volts/health' -TimeoutSec 3
if($state.application -ne 'volts-cog-lan'){throw 'Servidor VOLTS nao identificado.'}
$record=Get-Content (Join-Path $PSScriptRoot 'servidor.json') -Raw | ConvertFrom-Json
if($record.pid -ne $state.pid){throw 'Identidade do processo divergente.'}
$serverProcess=Get-Process -Id $state.pid -ErrorAction Stop
if($serverProcess.ProcessName -ne 'node'){throw 'O processo nao e o servidor Node.'}
Stop-Process -Id $state.pid -Force
Write-Output 'Servidor VOLTS encerrado.'
