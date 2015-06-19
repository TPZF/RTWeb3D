call "C:\Program Files\nodejs\nodejsvars.bat"
node r.js -o buildMizar.js
node r.js -o cssIn=../css/style.css out=../css/style.min.css
pause
