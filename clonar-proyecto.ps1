# Script PowerShell para clonar proyectos de Google Apps Script
# Uso: .\clonar-proyecto.ps1 <SCRIPT_ID>

param(
    [Parameter(Mandatory=$true)]
    [string]$ScriptId
)

Write-Host "Clonando proyecto con Script ID: $ScriptId" -ForegroundColor Green

# Ejecutar clasp clone
clasp clone $ScriptId

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡Proyecto clonado exitosamente!" -ForegroundColor Green
    Write-Host "Puedes editar los archivos y luego usar 'clasp push' para subir los cambios." -ForegroundColor Yellow
} else {
    Write-Host "`nError al clonar el proyecto. Verifica el Script ID." -ForegroundColor Red
}

