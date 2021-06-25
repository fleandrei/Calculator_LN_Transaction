const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const fs = require("fs");
const ByteBuffer = require('bytebuffer');
const http = require('http')
const io = require('socket.io')
const path = require("path");

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
let lndCert = fs.readFileSync("../../.lnd/tls.cert");
let sslCreds = grpc.credentials.createSsl(lndCert);

let credentials_Alice = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds_Alice);
let credentials_Bob = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds_Bob);
let lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
let lnrpc = lnrpcDescriptor.lnrpc;
let Alice = new lnrpc.Lightning('localhost:10001', credentials_Alice);
let Bob = new lnrpc.Lightning('localhost:10002', credentials_Bob);

let Bob_Pubkey=""
let Alice_Pubkey="";


const front_file_name = "/index.html"


var server = http.createServer(function(r, s){ handler(r,s); });
server.listen(8080);
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


/*Websocket channel for Lightning network handling*/
websocket.on('connection', function (socket) {
	console.log(`Connecté au client ${socket.id}`)
  socket.on('Send_Invoice', function (data) {
  	console.log("Send_Invoice received")
  	Invoice(websocket);
    //socket.broadcast.emit('message', data);
  });
});


function Invoice(websocket){
	Bob.addInvoice({value:2}, function(err, Invoice) {
	if(err){
		console.log("Err:",err);
	}
  	console.log("\nInvoice: ",Invoice);
  	let Invoice_Human_Readable = Object.assign({}, Invoice) ;
  	/*Invoice_Human_Readable.r_hash= ByteBuffer.fromBinary(Invoice.r_hash);
  	Invoice_Human_Readable.payment_addr= ByteBuffer.fromBinary(Invoice.payment_addr);*/
  	Invoice_Human_Readable.r_hash= Invoice.r_hash.toString("hex");
  	Invoice_Human_Readable.payment_addr= Invoice.payment_addr.toString("hex");
  	console.log("\n\nInvoice:",Invoice);
  	console.log("\n\nInvoice_Human_Readable:",Invoice_Human_Readable);
  	websocket.emit("Invoice_created", Invoice_Human_Readable);

  	/*let call = Alice.sendPayment({});
  	call.write({payment_request:Invoice.payment_request})
  	call.on('data', function(payment,err) {
		if(err){
			console.log("Error:"+err);
		}
	  	console.log("Invoice Payment sent:");
	  	console.log(payment);
	});*/
});
}


/*lightning.getInfo({}, function(err, response) {
  if (err) {
    console.log('Error: ' + err);
  }
  console.log('GetInfo:', response);
});*/

/*Bob.getInfo({}, function(err,response){
	if (err) {
    console.log('Error: ' + err);
  }
  Bob_Pubkey = response.identity_pubkey;
  let Bob_Pubkey_Bytes =  ByteBuffer.fromHex(Bob_Pubkey);
  Alice.openChannelSync({node_pubkey:Bob_Pubkey_Bytes, local_funding_amount:10000}, function(err, response) {
  	console.log("Channel oppened", response);
  })
})*/

/*Alice.listPeers({}, function(err,Peers){
	let Bob_Pubkey = Peers.peers[0].pub_key;
	console.log("Bob_Pubkey:",Bob_Pubkey);

	let call = Alice.sendPayment({});
	call.on('data', function(payment,err) {
		if(err){
			console.log("Error:"+err);
		}
	  console.log("Payment sent:");
	  console.log(payment);
	});
	call.on('end', function() {
	  // The server has finished
	  console.log("END");
	});

	let dest_pubkey = '0232cb91df69cefeb37c0bbf1fc6d87a1a65fcd4a84980d0ebac192efa0d2757dc';
	let dest_pubkey_bytes = ByteBuffer.fromHex(Bob_Pubkey);
	console.log("\ndest_pubkey_bytes:",dest_pubkey_bytes, ",  Type:",typeof dest_pubkey_bytes);

	// You can send single payments like this
	call.write({ dest: dest_pubkey_bytes.buffer, amt: 6969 });
	//call.write({ dest_string: Bob_Pubkey, amt: 6969 });
})*/

/*let Invoice_subscribed = Bob.subscribeInvoices({});

Invoice_subscribed.on("data",function(invoice) {
    console.log("Bob: Invoice receipte":,invoice);
})
.on('status', function(status) {
  // Process status
  console.log("Current status" + status);
});



Bob.addInvoice({value:2}, function(err, Invoice) {
	if(err){
		console.log("Err:",err);
	}
  //console.log("\nInvoice: ",Invoice);
  let call = Alice.sendPayment({});
  call.write({payment_request:Invoice.payment_request})
  call.on('data', function(payment,err) {
		if(err){
			console.log("Error:"+err);
		}
	  console.log("Invoice Payment sent:");
	  console.log(payment);

	});
});*/