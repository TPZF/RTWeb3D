MIZAR
---

Installation de MIZAR comme un module de SITools2 VERSION 3 :
---

* copier le fichier client-user-3.0/app/modules/MizarModule.js dans client-user-3.0/app/modules/
* copier le fichier client-user-3.0/app/model/MizarModuleModel.js  dans client-user-3.0/app/model/
* copier le fichier client-user-3.0/app/view/modules/mizarModule/MizarModuleView.js dans client-user-3.0/app/view/modules/mizarModule/
* creer le dossier client-user-3.0/app/controller/mizarModule : `mkdir mizarModule`
* faire un : `git clone https://github.com/SITools2/MIZAR.git .`

Puis dans l'interface d'admin de Sitools2 :
* Cliquer sur Access Management/Projects/Project Modules
* Créer le module avec les parametres dont vous souhaitez, sauf les suivants:
    * iconClass: mizar
    * Le xtype: sitools.user.modules.MizarModule
