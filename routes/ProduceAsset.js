const Web3 = require('web3');
const ethereumUri = 'http://140.119.101.130:7575';
// let web3 = new Web3(new Web3.providers.WebsocketProvider(ethereumUri));
let web3 = new Web3(new Web3.providers.HttpProvider(ethereumUri));

let NotaryAgent = '0x1f208c0da16e295421e7cce974ad27c1a8104725';

let AssetList_ABI = require("../../Contract/AssetList_ABI.js");
let AssetList_Address = '0xc0117220c91147c3a54388c680af05b366d04a59';
var AssetList = new web3.eth.Contract(AssetList_ABI, AssetList_Address);

var fs = require('fs');
var Health_Certificate = {
    table: []
};

let owner = "0x6e139978f86b16965c5b6ecb12c995bd475c5a17";
let asset = 1314;
web3.eth.personal.unlockAccount(owner, "1234", 600)
.then(function(){
	AssetList.methods.addAsset_Health(owner, asset).send({from: owner})
	.then(function(e){
		console.log(e);

		Health_Certificate.table.push({
    		blockHash:e.blockHash, 
			blockNumber:e.blockNumber, 
			from:e.from, 
			gas:e.gas, 
			gasPrice: e.gasPrice, 
			hash:e.hash, 
			input:e.input,
			nonce:e.nonce, 
			to:e.to, 
			tansactionIndex:e.trancsactionIndex,  
			value:e.value, 
			v:e.v, 
			r:e.r, 
			s:e.s
    	});
    	var Health = JSON.stringify(Health_Certificate);
    	fs.writeFile('Health_Certificate.json', Health, 'utf8', function(){
    		console.log('New Health Asset!!!');
    	});
	});
});
