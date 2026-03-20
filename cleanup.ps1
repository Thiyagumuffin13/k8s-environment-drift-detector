# cleanup.ps1 - Run this ONCE to remove old root-level .NET files
# These files have been moved to the backend/ folder. This script deletes the originals.

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Cleaning up old root-level .NET files..." -ForegroundColor Cyan

$dirToRemove = @("Controllers", "Data", "Migrations", "Models", "Properties", "Repositories", "Services", "bin", "obj")
foreach ($dir in $dirToRemove) {
    $path = Join-Path $rootDir $dir
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "  Removed: $dir/" -ForegroundColor Green
    }
}

$filesToRemove = @("Program.cs", "appsettings.json", "appsettings.Development.json", "Dockerfile", "EnvironmentDriftDetector.http", "EnvironmentDriftDetector.csproj")
foreach ($file in $filesToRemove) {
    $path = Join-Path $rootDir $file
    if (Test-Path $path) {
        Remove-Item -Force $path
        Write-Host "  Removed: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Cleanup complete! Root folder now only contains:" -ForegroundColor Cyan
Write-Host "  backend/  frontend/  docker-compose.yml  EnvironmentDriftDetector.sln  README.md  .gitignore  .vscode/" -ForegroundColor White
Write-Host ""
Write-Host "To verify backend builds:" -ForegroundColor Yellow
Write-Host "  cd backend; dotnet clean; dotnet build"
Write-Host ""
Write-Host "To run Angular frontend:" -ForegroundColor Yellow
Write-Host "  cd frontend; npm install --legacy-peer-deps; npm start"
