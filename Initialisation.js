const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const fs = require("fs");
const ByteBuffer = require('bytebuffer');
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
const packageDefinition = protoLoader.loadSync(['rpc.proto', 'walletunlocker.proto'], loaderOptions);

let macaroon_Alice = fs.readFileSync('Alice/data/chain/bitcoin/simnet/admin.macaroon').toString('hex');

let metadata_Alice = new grpc.Metadata()
metadata_Alice.add('macaroon', macaroon_Alice)
let macaroonCreds_Alice = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
  callback(null, metadata_Alice);
});

let macaroon_Bob = fs.readFileSync('Bob/data/chain/bitcoin/simnet/admin.macaroon').toString('hex');

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

let Alice_walletUnlocker = new lnrpc.WalletUnlocker('localhost:10001', sslCreds);
let Bob_walletUnlocker = new lnrpc.WalletUnlocker('localhost:10002', sslCreds);


let Bob_Pubkey = ""

/*function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}*/


console.log("ByteBuffer:", ByteBuffer.fromHex("BBBBBBBB"))
Bob_walletUnlocker.unlockWallet({wallet_password:Buffer.from("BBBBBBBB", 'utf8')}, function(err, response) {
	//await Alice_walletUnlocker.unlockWallet({wallet_password:Buffer.from("AAAAAAAA", 'utf8')}, function(err, response) {} )
	if(err){
		console.log("Error unlock Bob:",err);
	}
  	console.log("\nBob Unlocked:",response);
  	//await sleep(10000)
  	let Bob = new lnrpc.Lightning('localhost:10002', credentials_Bob);
  	console.log("\n\nBob:",Bob)
  	Bob.getInfo({}, function(err, BobInfo) {
  		console.log("\nBobInfo:", BobInfo)
	  if (err) {
	    console.log('Error: ' + err);
	  }
	  Bob_Pubkey=BobInfo.identity_pubkey;

	  Alice.connectPeer({addr:Bob_Pubkey+"@localhost:10012"}, function(err, response) {
		  console.log("\nAlice connect: ",response);

		  Alice.openChannelSync({node_pubkey:Bob_Pubkey, local_funding_amount:100000}, function(err, response) {
			  console.log("\nAlice: Channel opened: ",response);
			});

		});
	});
});
