RTWeb3D
=======

Contient le module GlobWeb pour SiTools2 

Installation :
 * Installer SiTools2
 * Récupérer le module et le placer dans SiTools2 :
    * cd %SITOOLS%/workspace/client-user/js/modules  
	* git clone https://github.com/TPZF/RTWeb3D.git globWebModule  
 * Copier %SITOOLS%/workspace/client-user/js/modules/globWebModule/install/int@10.xml vers %SITOOLS%/data/projects_modules  
 * Copier %SITOOLS%/workspace/client-user/js/modules/globWebModule/install/earth2.png vers %SITOOLS%/data/upload
 * Rendre visible le module sur le portail utilisateur
	* Aller sur l'interface d'admin : http://localhost:8182/sitools/client-admin/
	* Cliquer sur Access Managements/Projects/Projects 
	* Désactiver le projet, éditer le et activer la visibilité pour le module GlobWeb
 * Ajouter un proxy
	 * Aller dans application plugins (interface admin)
	 * Ajouter ProxyApp et configurer l'application comme ceci :
          * uri attachment :  /Alasky 
          * category : USER
          * useProxy : False
          * url client : http://alasky.u-strasbg.fr{rr}     // oui, il faut bien ajouter {rr}
          * mode : 6

	
Installation du résolveur de noms : 
	Mettre le Jar dans %SITOOLS%\workspace\fr.cnes.sitools.core\ext