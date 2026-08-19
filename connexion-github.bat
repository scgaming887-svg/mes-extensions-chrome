@echo off
title Connexion GitHub
color 0B
echo.
echo    ===========================================
echo      Connexion de l'outil gh a ton compte
echo    ===========================================
echo.
echo    Un code du type XXXX-XXXX va s'afficher.
echo.
echo      1. Note ce code
echo      2. Appuie sur Entree : le navigateur s'ouvre
echo      3. Colle le code, puis "Authorize github"
echo.
echo    -------------------------------------------
echo.
gh auth login --hostname github.com --git-protocol https --web
echo.
echo    -------------------------------------------
gh auth status
echo.
echo    Si tu lis "Logged in to github.com", c'est gagne.
echo    Ferme cette fenetre et reviens me le dire.
echo.
pause
