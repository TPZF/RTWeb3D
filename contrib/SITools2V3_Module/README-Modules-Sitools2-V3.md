## Mizar as a module in SITools2 V3

### SITools2 Installation
Follow installation guide : https://github.com/SITools2/SITools2-core/blob/master/README.md

### Plugin extension Installation
Follow installation guide : https://github.com/SITools2/Astronomy-Extension-Server/blob/master/README.md
 
### MIZAR Installation 	
	$ cd %SITOOLS%/workspace/client-user-3.0/app/controller/modules
	$ git clone https://github.com/SITools2/MIZAR.git mizarModule
	$ cd mizarModule
	$ git submodule init
	$ git submodule update

### Module Installation
	$ cp contrib/SITools2V3_Module/MizarModule.js ../../../modules
	$ cp contrib/SITools2V3_Module/MizarModuleModel.js ../../../model
	$ cp contrib/SITools2V3_Module/MizarModuleView.js ../../../view/modules/mizarModule/

### Module configuration
* Go to the SITools2 administration interface
* Click on Access Management/Projects/Project Modules
* Fill the form with the following ones in this way:
    	* iconClass: mizar
    	* xtype: sitools.user.modules.MizarModule


TODO
 * Ajouter un proxy pour l'affichage des données de base
   * Aller sur l'interface d'admin
   * Cliquer sur Access Management/Application plugins/Application plugins
   * Ajouter ProxyApp et configurer l'application comme ceci :
          * uri attachment :  /sitools/Alasky 
          * category : USER
          * useProxy : FALSE
          * url client : http://alasky.u-strasbg.fr{rr}     // oui, il faut bien ajouter {rr}
          * mode : 6

Ajouter les services dans le projet
 * Aller sur l'interface d'admin
 * Cliquer sur Access Management/Projects/Project services
 * Ajouter les services suivants
   * Name Resolver Service, qui permet de trouver l'objet céleste à partir de son nom
   * Reverse Name Resolver Service, qui permet de trouver le nom d'objet à partir de sa position
   * Solar Objects Service, qui permet de trouver les objets célestes qui se trouvent dans le système solaire
   * GlobWeb Server, qui permet de configurer le module Mizar à partir de SiTools2
      * Mettre dans le champ 'conf' la valeur `mizarConf.ftl`
      * Créer un fichier 'mizarConf.ftl' dans `%SiTools%/data/freemarker/`, ce fichier peut être initialisé à partir du contenu du fichier `js/conf.json`
      * Cliquer sur Access Managements/Projects/Projects, choisir votre projet, mettre `/sitools/%uri de votre projet%/plugin/globWeb` dans le champ "Module Parameters" de Mizar
   * Couverage Service, qui permet de visualiser les données qui répresentent la couverture du ciel(fichiers MOC)
   * VOTable2GeoJson, qui permet d'afficher les VOTables reçu via protocole SAMP

  TODO
  
  Run SiTools2 with the following command : `%SiTools2%/sitools.sh start` for Unix or `%SiTools2%/sitools.bat start` for Windows
  
  Configure the module
  
 * Initializer et mettre à jour le submodule [GlobWeb](https://github.com/TPZF/GlobWeb) qui assure le rendu:
  * `cd mizarModule`
  * `git submodule init`
  * `git submodule update`
 * Lancer SiTools2 avec la commande : `%SiTools2%/sitools.sh start` pour les OS de type Unix ou `%SiTools2%/sitools.bat start` pour Windows
 * Configurer le module :
  * Aller sur l'interface d'admin : http://localhost:8182/sitools/client-admin/* 
  * Loggez-vous avec `Login: admin`, `mot de passe: admin`
  * Cliquer sur Access Management/Projects/Project Modules
  * Créer le module avec les parametres dont vous souhaitez, sauf les suivants:
    * iconClass: mizar
    * Le xtype: sitools.component.mizarModule
    * Ajouter 2 dépendances: /sitools/client-user/js/modules/mizarModule/mizar.js et /sitools/common/res/css/mizar.css
  * Rendre visible le module sur le portail utilisateur
    * Cliquer sur Access Managements/Projects/Projects 
    * Désactiver le projet, éditer le et activer la visibilité pour le module Mizar
      * Dans le champ "Module parameters" mettre `undefined`
