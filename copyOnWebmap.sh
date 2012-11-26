#!/bin/bash

rm -r app/release

mkdir app/release
mkdir app/release/externals
mkdir app/release/js
mkdir app/release/css

# Compile minified GlobWeb
python ./app/externals/GlobWeb/build/build.py 3 './app/externals/GlobWeb/build/'

# Copy minified version into js repertory
cp ./app/externals/GlobWeb/build/generated/GlobWeb.min.js app/release/externals/

# Replace developpment script include by minified one
sed -i 's/^<script type="text\/javascript" src="externals\/GlobWeb\/src\/GlobWeb.js"><\/script>/<script type="text\/javascript" src="externals\/GlobWeb.min.js"><\/script>/' ./app/index.html

# Compile minified modules
node app/build/r.js -o app/build/build.js

cp app/externals/*.js app/release/externals
cp -R app/build/generated/css/style.css app/css/images app/release/css
cp app/build/generated/js/main.js app/build/generated/js/require.min.js app/js/conf.json app/release/js
cp app/index.html app/release


# Create & copy the archive on webmap
tar -cf - ./app/release ./app/data | ssh -C webmap@172.27.20.26 'cd /home/webmap/Sitools2/workspace/client-user/js/modules/globWebModule && tar -xf -'

# Revert
sed -i 's/^<script type="text\/javascript" src="externals\/GlobWeb.min.js"><\/script>/<script type="text\/javascript" src="externals\/GlobWeb\/src\/GlobWeb.js"><\/script>/' ./app/index.html
#rm ./app/js/GlobWeb.min.js

