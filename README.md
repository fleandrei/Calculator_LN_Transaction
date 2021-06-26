# Calculator_LN_Transaction: Rapport test technique

## L'application

Ce Repo est un fork du projet open source [Simple-JavaScript-Calculator](https://github.com/harsh98trivedi/Simple-JavaScript-Calculator) réalisé par [Harsh Trivedi](https://harsh98trivedi.github.io)
Il s'agit d'une caluclatrice online à laquelle on a rajouté la possibilité d'effectuer des transactions via un canal de paiement entre deux noeuds *lnd* Alice et Bob. 
Les transactions se font sur le réseau de test privé et local __simnet__ (équivalent de _Regnet_ sur __btcd__).




## Instalation des clients Bitcoin et Lightning network

On s'inspire de ce [Tuto](https://dev.lightning.community/guides/installation/).
Notons que pour pouvoir utiliser dans n'importe quel répertoire les outils que nous allons installer, il faut ajouter _$GOPATH/bin_ dans _$PATH_.

### Client Lightning Network

On installe le client __lnd__ ainsi que son gestionnaire en ligne de commande __lncli__:

`$ go get -d github.com/lightningnetwork/lnd`

`$ cd $GOPATH/src/github.com/lightningnetwork/lnd`

`$ make && make install`


### Client bitcoin

On installe le client bitcoin __btcd__ ainsi que son gestionnaire en ligne de commande __btcctl__. Pour cela on reste dans le répertoire _$GOPATH/src/github.com/lightningnetwork/lnd_ et on rentre:

`$ make btcd`

`$ cd $GOPATH/src/github.com/btcsuite/btcd`

`$ GO111MODULE=on go install -v . ./cmd/...`




## Processus pour instaurer un canal de paiement entre Alice et Bob

### Démarer le noeud Bitcoin

Pour lancer un noeud btcd:

`$ btcd --txindex --simnet --rpcuser=kek --rpcpass=kek`

On utilise le réseau privé local __simnet__ qui est l'équivalent sur btcd de __regnet__ sur Bitcoin core.


### Démarer les noeuds Lightning Network

Nous allons lancer 2 noeuds lnd qui vont se connecter au noeud btcd que nous vennons de créer.
Nous avons dans le répertoir deux sous-dossiers, Alice et Bob, correspondant aux deux noeuds lnd.
Ces dossiers contiennent chacun un fichier _ldn.conf_ contenant les paramètres de configuration relatifs au noeud lnd.
Dans chaqun de ces deux dossiers, lancez:

`$ lnd --configfile=./lnd.conf`

On peut voir que ces commandes ont crée dans chaqun des dossiers, deux repertoire _data_ et _log_ permettant de stocker respectivement les données relatifs aux noeud et les logs.


### Création de wallet et Authentification

L'interface en ligne de commande lncli permet de gérer les noeuds lnd. La connexion au serveur RPC des noeuds lnd est soumis à authentification via la méthode des [Macaroons](https://github.com/lightningnetwork/lnd/issues/20).
Pour créer un wallet, lncli doit créer un fichier _admin.macaroon_ (option _--macaroonpath_ pour renseigner le chemin du fichier) et se connecter sur le port du serveur RPC (champ _rpclisten_ du fichier lnd.conf) du noeud lnd via l'option _--rpcserver_:

`$ lncli --rpcserver=localhost:<rpclisten> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon create`

Il nous faut alors rentrer un mot de passe d'au moins 8 caractères. Il nous est également proposé de rentrer une passphrase pour chiffrer la seed (optionnel).


Si nous avons déjà crée un wallet, on peut directement le débloquer avec:

`$ lncli --rpcserver=localhost:<rpclisten> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon unlock`

Il nous faudra alors entrer le mot de passe que nous avons crée à l'étape précédente.


### Fournir des bitcoin aux adresses

Créer des adresses pour Alice et Bob via lnd:

`$ lncli --rpcserver=localhost:<rpclisten> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon newaddress np2wkh`

Nous allons redémarer le noeud btcd en lui spécifiant d'attribuer les récompensses du minnage à l'adresse d'Alice (ou de Bob):

`btcd --simnet --txindex --rpcuser=kek --rpcpass=kek --miningaddr=<ALICE_ADDRESS>`


Nous pouvons maintenant utilise l'interface en ligne de commande __btcctl__ pour demander au noeud btcd de minner 400 blocks afin de fournir des fonds à Alice:

`btcctl --simnet --rpcuser=kek --rpcpass=kek generate 400`

Il faut minner au moins 400 block car les récompensses ne peuvent être dépenssées qu'après 100 blocks et il faut encore attendre 300 block avant que SegWit soit activé.


### Connecter Alice et Bob

Il faut tout d'abord récupérer la clée publique de Bob (ou Alice) <BOB_PUBKEY> via:

`$ lncli --rpcserver=localhost:<rpclisten_Bob> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon getinfo`

La clée publique se trouve dans le champs _identity_pubkey_ du recipient retourné par cette commande.
On peut maintenant connecter Alice à Bob:

`$ lncli --rpcserver=localhost:<rpclisten_Alice> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon connect <BOB_PUBKEY>@localhost:<listen_Bob>`

La valeur <listen_Bob> correspond au port sur lequel le lnd de Bob écoute les messages relatifs au protocole lightning network provenant d'autres noeuds lnd. Il correspond au champs _listen_ du fichier ldn.conf.


### Créer un canal de paiement entre ALice et Bob.

Maintenant qu'Alice et Bob sont connectés, ils peuvent générer un canal de paiement pour effectuer des transactions entre eux:

`$ lncli --rpcserver=localhost:<rpclisten_Alice> --macaroonpath=data/chain/bitcoin/simnet/admin.macaroon openchannel  --node_key=<BOB_PUBKEY> --local_amt=1000000`

L'option --local_amt permet de placer des fonds (en satoshi) sur le canal.
On aurrait aussi pu utiliser l'option --push_amt pour placer des fonds sur le canal et les envoyer directement à l'autre partie.

L'ouverture d'un canal de paiement est une action réalisée sur la blockchain. Il faut donc la valider en minant 6 blocs:

`$ btcctl --simnet --rpcuser=kek --rpcpass=kek generate 6`


## Interaction avec la partie front

Maintenant que nous avons un canal de paiement entre Alice et Bob, l'utilisateur, via la partie front pourra effectuer des transactions d'un satoshi. En effet, après plusieurs tentatives et recherches, il semble que lnd n'accepte pas les transaction de moins de 1 sat (999 msat et en dessous). 
Il aurrait été possible de contourner ce problème en demandant à Alice d'envoyer 2 sat à Bob et en demandant à ce dernier de lui retourner 1999 msat. Cela reviendrait à effectuer une transaction de 1 msat d'Alice vers Bob. Cependant cela aurrait nécéssité d'effectuer 2 transactions (et donc deux factures) au lieu d'une, ce qui ne semblait pas en accord avec les conssignes.

### Implémentation

Pour permettre à l'utilisateur d'interagir avec le réseau local Alice-Bob, nous utilisons un serveur node.js (__serveur.js__ dans le répertoire) communiquant avec un client front dont le code a été reprit depuis un projet open source (fichier: __index.html__, __stryle.css__ et __calc.js__) et a été légèrement modifié afin de répondre à nos besoins.
Sur demande du front, le serveur va effectuer une transaction de 1 sat d'Alice vers Bob. Il interagit avec les deux noeuds lnd via l'API [gRPC](https://api.lightning.community/?javascript#lnd-grpc-api-reference).
En plus de la connexion HTTP, le serveur entretient une communication websocket avec le front. Cela lui permet d'envoyer de lui même vers le front, les résultats de la transaction lorsque la facture a été payée.


### Lancer l'application
Pour utiliser l'application, on doit:

* __Editer le fichier App_config__: L'application utilise le fichier de configuration __App_config__ qui définit le port sur lequel le serveur node.js va écouter ainsi que la chemin vers le certificat _tls.cert_ qui est nécéssaire pour l'interaction avec lnd. Sur Mac ce dernier se trouve normalement à "~/Library/Application Support/Lnd/tls.cert". On doit donc editer le fichhier App_config selon nos besoins.
* __Lancer le serveur__ via la commande *node server*
* __Lancer le front sur le browser__: Tapper dans la barre de recherche du navigateur: *localhost:PortNum* où portNum correspond au numéro de port définit dans la fichier App_config. On obtient alors une calculatrice online.
* __Appuyer sur la touche =__: Pour lancer la transaction de 1 sat, appuyer sur la touche __=__ de la calculatrice. En dessous de cette dernière s'afiche allors un tableau contenant les informations relatives à la facture (invoice) qui a été crée par Bob (Exercice 1). Peu (très peu) de temps après, un deuxième tableau apparaît en dessous du premier affichant le resultat de la transaction (exercice 2).
	

## Sources

* https://medium.com/lightwork/lightning-network-development-for-modern-applications-e4dd012dac82 
* https://dev.lightning.community/guides/
* https://api.lightning.community/?javascript#lnd-grpc-api-reference


## Notes

J'ai commencé rapidement un code __Initialisation.js__ permettant d'automatiser l'authentification aux ldn, la génération d'adresses, la connexion et la création de canneaux de paiement entre Alice et Bob.
Ce code n'est pas terminé mais je ne souhaite pas y conssacrer plus de temps pour le moment. 

Par ailleurs, je n'ai pas le temps de faire les execices 3 et 4. 
Si il avait fallu y passer plus de temps, j'aurrait regardé plus en détail le tuto [Working with LND and Docker](https://dev.lightning.community/guides/docker/) pour gérer les noeuds btcd et lnd avec docker. J'aurrai également fait des recherches pour trouver une library node.js permettant d'intéragir avec le btcd (dans le style de  BitcoinJS pour bitcoind) afin notamment de pourvoir passer du simnet au mainnet. Ou alors j'aurrai abandonné btcd au profit de bitcoind afin de pouvoir utiliser BitcoinJS et de bénéficier d'une communauté et d'une documentation plus importante.




