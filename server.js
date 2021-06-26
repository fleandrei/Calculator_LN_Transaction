const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const fs = require("fs");
const ByteBuffer = require('bytebuffer');
const http = require('http')
const io = require('socket.io')
const path = require("path");


/*On récupère les paramètres du fichier de configuration App_config*/
var Config_file = fs.readFileSync("App_config").toString();
var Param = Config_file.split("\n");

const Listening_Port = parseInt(Param[0].split(":")[1], "10")
const TLS_Cert_Path =  Param[1].split(":")[1]


// Due to updated ECDSA generated tls.cert we need to let gprc know that
// we need to use that cipher suite otherwise there will be a handhsake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

// We need to give the proto loader some extra options, otherwise the code won't
// fully work with lnd.
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};
const packageDefinition = protoLoader.loadSync('rpc.proto', loaderOptions);

let macaroon_Alice = fs.readFileSync('../Alice/data/chain/bitcoin/simnet/admin.macaroon').toString('hex');

let metadata_Alice = new grpc.Metadata()
metadata_Alice.add('macaroon', macaroon_Alice)
let macaroonCreds_Alice = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
  callback(null, metadata_Alice);
});

let macaroon_Bob = fs.readFileSync('../Bob/data/chain/bitcoin/simnet/admin.macaroon').toString('hex');

let metadata_Bob = new grpc.Metadata()
metadata_Bob.add('macaroon', macaroon_Bob)
let macaroonCreds_Bob = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
  callback(null, metadata_Bob);
});


//  Lnd cert is at ~/.lnd/tls.cert on Linux and
//  ~/Library/Application Support/Lnd/tls.cert on Mac
let lndCert = fs.readFileSync(TLS_Cert_Path);
let sslCreds = grpc.credentials.createSsl(lndCert);

let credentials_Alice = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds_Alice);
let credentials_Bob = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds_Bob);
let lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
let lnrpc = lnrpcDescriptor.lnrpc;
let Alice = new lnrpc.Lightning('localhost:10001', credentials_Alice);
let Bob = new lnrpc.Lightning('localhost:10002', credentials_Bob);


/*Création d'un serveur HTTP et d'un listener Websocket*/
var server = http.createServer(function(r, s){ handler(r,s); });
server.listen(Listening_Port);
var websocket = io(server);

/*HTTP communications Handling*/
function handler(req, res)
{	

   if(req.url === "/"){
        fs.readFile(__dirname+"/index.html", "UTF-8", function(err, html){
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(html);
        });
    }else if(req.url.match("\.css$")){
        var cssPath = path.join(__dirname, req.url);
        var fileStream = fs.createReadStream(cssPath, "UTF-8");
        res.writeHead(200, {"Content-Type": "text/css"});
        fileStream.pipe(res);

    }else if(req.url.match("\.png$")){
        var imagePath = path.join(__dirname,  req.url);
        var fileStream = fs.createReadStream(imagePath);
        res.writeHead(200, {"Content-Type": "image/png"});
        fileStream.pipe(res);
    }else if(req.url.match("\.js")){
    	var jsPath= path.join(__dirname,  req.url);
    	var fileStream = fs.createReadStream(jsPath);
        res.writeHead(200, {"Content-Type": "text/javascript"});
        fileStream.pipe(res);
    }
}


/*Websocket channel pour recevoir la requète client demandant d'effectuer la transaction */
websocket.on('connection', function (socket) {
	socket.on('Send_Invoice', function (data) {
  	Invoice(websocket);
  });
});


/*Fonction chargée d'effectuer la transaction sur le Lightning Network entre Alice et Bob*/
function Invoice(websocket){
	Bob.addInvoice({value_msat:1000}, function(err, Invoice) { //Bob initie la transaction en créant une facture (Invoice)
	if(err){
		console.log("Err:",err);
	}

	/*On convertit les champs dont les valeurs sont binaire en string */
  	let Invoice_Human_Readable = Object.assign({}, Invoice) ;
  	Invoice_Human_Readable.r_hash= Invoice.r_hash.toString("hex");
  	Invoice_Human_Readable.payment_addr= Invoice.payment_addr.toString("hex");
  	
  	/*On envoie au client la facture ainsi initialisée*/
  	websocket.emit("Invoice_created", Invoice_Human_Readable);

  	/*Alice paie la facture*/
  	let call = Alice.sendPayment({});
  	call.write({payment_request:Invoice.payment_request})
  	call.on('data', function(Payment,err) {
		if(err){
			console.log("Error:"+err);
		}

		/*On convertit les champs dont les valeurs sont binaire en string */
		let Payment_Human_Readable = Object.assign({}, Payment);
		Payment_Human_Readable.payment_preimage= Payment.payment_preimage.toString("hex");
		Payment_Human_Readable.payment_hash= Payment.payment_hash.toString("hex");

		/*On envoie au client les résultats de la transaction*/
	  	websocket.emit("Invoice_Settled", Payment_Human_Readable);
	});
});
}



