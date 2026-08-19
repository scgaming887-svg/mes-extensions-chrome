# ============================================================
#  Met la page de telechargement en ligne sur GitHub Pages
#  Lance-moi en double-cliquant sur publier.bat
# ============================================================

$ErrorActionPreference = "Stop"
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
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "  Une fenetre de navigateur va s'ouvrir. Choisis :" -ForegroundColor Yellow
  Write-Host "    GitHub.com  ->  HTTPS  ->  Login with a web browser" -ForegroundColor Yellow
  gh auth login
  if ($LASTEXITCODE -ne 0) { Write-Host "  Connexion echouee." -ForegroundColor Red; Read-Host "  Entree pour fermer"; exit }
}
$user = (gh api user -q .login).Trim()
Write-Host "  Connecte en tant que $user" -ForegroundColor Green

# ---- 2. depot ----
Write-Host ""
Write-Host "  [2/4] Creation du depot..." -ForegroundColor Cyan
git branch -M main
$exists = $false
gh repo view "$user/$repo" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $exists = $true }

if ($exists) {
  Write-Host "  Le depot existe deja, mise a jour." -ForegroundColor Yellow
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$user/$repo.git"
  git push -u origin main --force
} else {
  gh repo create $repo --public --source=. --remote=origin --push `
    --description "GameOpen, PageCustomer et PetPage - 3 extensions Chrome"
}
if ($LASTEXITCODE -ne 0) { Write-Host "  Echec de l'envoi." -ForegroundColor Red; Read-Host "  Entree pour fermer"; exit }

# ---- 3. GitHub Pages ----
Write-Host ""
Write-Host "  [3/4] Activation de GitHub Pages..." -ForegroundColor Cyan
$body = '{"source":{"branch":"main","path":"/docs"}}'
$body | gh api --method POST "repos/$user/$repo/pages" --input - 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  # deja active : on met juste a jour la source
  $body | gh api --method PUT "repos/$user/$repo/pages" --input - 2>$null | Out-Null
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
