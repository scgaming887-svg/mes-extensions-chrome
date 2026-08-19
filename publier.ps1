# ============================================================
#  Met la page de telechargement en ligne sur GitHub Pages
#  Lance-moi en double-cliquant sur publier.bat
# ============================================================
#  Note : on passe par "cmd /c ... >nul 2>&1" pour les tests
#  silencieux. Rediriger la sortie d'erreur d'un .exe directement
#  en PowerShell 5.1 la transforme en erreur fatale.
# ============================================================

$repo = "mes-extensions-chrome"
Set-Location "C:\Users\PC\WebExtensions"

Write-Host ""
Write-Host "  Publication de la page de telechargement" -ForegroundColor Cyan
Write-Host "  ----------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Ce script va :"
Write-Host "    1. te connecter a GitHub (si ce n'est pas deja fait)"
Write-Host "    2. creer un depot PUBLIC nomme '$repo'"
Write-Host "    3. y envoyer les extensions et la page"
Write-Host "    4. activer GitHub Pages pour obtenir ton lien"
Write-Host ""
Write-Host "  ATTENTION : le depot sera public, donc le code des extensions" -ForegroundColor Yellow
Write-Host "  sera visible par tout le monde. C'est la condition pour que" -ForegroundColor Yellow
Write-Host "  GitHub Pages soit gratuit." -ForegroundColor Yellow
Write-Host ""
$ok = Read-Host "  Continuer ? (o/n)"
if ($ok -ne "o" -and $ok -ne "O") { Write-Host "  Annule."; Read-Host "  Entree pour fermer"; exit }

# ---- 1. connexion ----
Write-Host ""
Write-Host "  [1/4] Connexion a GitHub..." -ForegroundColor Cyan
cmd /c "gh auth status >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  Un code du type XXXX-XXXX va s'afficher juste en dessous." -ForegroundColor Yellow
  Write-Host "  1. Note-le" -ForegroundColor Yellow
  Write-Host "  2. Appuie sur Entree : ton navigateur s'ouvre" -ForegroundColor Yellow
  Write-Host "  3. Colle le code, puis clique 'Authorize github'" -ForegroundColor Yellow
  Write-Host ""
  gh auth login --hostname github.com --git-protocol https --web
  cmd /c "gh auth status >nul 2>&1"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Connexion echouee." -ForegroundColor Red
    Read-Host "  Entree pour fermer"; exit
  }
}
$user = (gh api user -q .login)
if (-not $user) { Write-Host "  Impossible de lire le pseudo GitHub." -ForegroundColor Red; Read-Host; exit }
$user = $user.Trim()
Write-Host "  Connecte en tant que $user" -ForegroundColor Green

# ---- 2. depot ----
Write-Host ""
Write-Host "  [2/4] Creation du depot..." -ForegroundColor Cyan
git branch -M main

cmd /c "gh repo view $user/$repo >nul 2>&1"
if ($LASTEXITCODE -eq 0) {
  Write-Host "  Le depot existe deja, mise a jour." -ForegroundColor Yellow
  cmd /c "git remote remove origin >nul 2>&1"
  git remote add origin "https://github.com/$user/$repo.git"
  git push -u origin main --force
} else {
  gh repo create $repo --public --source=. --remote=origin --push --description "GameOpen, PageCustomer et PetPage - 3 extensions Chrome"
}
if ($LASTEXITCODE -ne 0) {
  Write-Host "  Echec de l'envoi des fichiers." -ForegroundColor Red
  Read-Host "  Entree pour fermer"; exit
}

# ---- 3. GitHub Pages ----
Write-Host ""
Write-Host "  [3/4] Activation de GitHub Pages..." -ForegroundColor Cyan
$tmp = Join-Path $env:TEMP "pages-source.json"
'{"source":{"branch":"main","path":"/docs"}}' | Out-File -FilePath $tmp -Encoding ascii -NoNewline
cmd /c "gh api --method POST repos/$user/$repo/pages --input `"$tmp`" >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
  cmd /c "gh api --method PUT repos/$user/$repo/pages --input `"$tmp`" >nul 2>&1"
}
if ($LASTEXITCODE -ne 0) {
  Write-Host "  Pages n'a pas pu etre active automatiquement." -ForegroundColor Yellow
  Write-Host "  Fais-le a la main : Settings > Pages > Branch: main, dossier /docs" -ForegroundColor Yellow
}

# ---- 4. resultat ----
$url = "https://$user.github.io/$repo/"
Write-Host ""
Write-Host "  [4/4] Termine !" -ForegroundColor Green
Write-Host ""
Write-Host "  Ton lien de telechargement :" -ForegroundColor Cyan
Write-Host "  $url" -ForegroundColor White
Write-Host ""
Write-Host "  Le premier deploiement prend 1 a 2 minutes." -ForegroundColor Yellow
Write-Host "  Si la page affiche une erreur 404, attends un peu et recharge."
Write-Host ""
Write-Host "  Depot : https://github.com/$user/$repo"
Write-Host ""
$open = Read-Host "  Ouvrir la page maintenant ? (o/n)"
if ($open -eq "o" -or $open -eq "O") { Start-Process $url }
Read-Host "  Entree pour fermer"
