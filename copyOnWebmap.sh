#!/bin/bash

# in developpment currently
#cp ./app/externals/GlobWeb/build/generated/GlobWeb.min.js ./app/js/
#sed -i s/"<script type=\"text/javascript\" src=\"externals/GlobWeb/src/GlobWeb.js\"></script>"/"<script type=\"text/javascript\" src=\"js/GlobWeb.min.js\"></script>/" ./app/index.html

tar -cf - ./app/externals/GlobWeb/build/generated/GlobWeb.min.js ./app/index.html ./app/js/ ./app/css/ | ssh -C webmap@172.27.20.26 'cd /home/webmap/Sitools2/workspace/client-user/js/modules/globWebModule && tar -xf -'



