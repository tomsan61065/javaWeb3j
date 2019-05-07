var express = require('express');
var router = express.Router();
const Proxy = require('braid-client').Proxy;
let ourNameAndOwningKey ;
let partyANameAndOwningKey;
let testReceipt = "test receipt";
let stx ;
let cordaRequestIndex = -1;
let exchangeTimeOut = 40;
let transferTimeOut = 20;
let loanStates = [];
let cordaIds = [];
let CANONICAL_CHAIN_LENGTH = 3 + 3;
// Connects to Braid running on the node.
let braid = new Proxy({
    //url: "http://140.119.164.162:3004/api/"
    url: "http://localhost:3004/api/"
}, onOpen, onClose, onError, { strictSSL: false });

/* <--------------------------------------------------------------------------------------------------> */
/* <--------------------------------------Ethereum Setting--------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
const Web3 = require('web3');
// const ethereumUri = 'http://140.119.164.28:8000';
const ethereumUri = 'http://140.119.101.130:7575';
let web3 = new Web3(new Web3.providers.HttpProvider(ethereumUri));
// let web3 = new Web3(new Web3.providers.WebsocketProvider(ethereumUri));

let NotaryAgent = '0x76ac34807210d52fcbfc0412cf4da5c672214752';

let AssetList_ABI = require("../../Contract/AssetList_ABI.js");
let AssetList_Address = '0x0bfd6d60bdadbbd3dfed87afbe505761708973c4';
var AssetList = new web3.eth.Contract(AssetList_ABI, AssetList_Address);

let RequestList_ABI = require("../../Contract/RequestList_ABI.js");
let RequestList_Address = '0x8e4d2082152a624ef441a3d425d62fba1711fe1d';
var RequestList = new web3.eth.Contract(RequestList_ABI, RequestList_Address);

let Validation_ABI = require("../../Contract/Validation_ABI.js");
let Validation_Address = '0x89bce2f68f18f087728917b9db91b69c89633968';
var Validation = new web3.eth.Contract(Validation_ABI, Validation_Address);

const AliceETH = '0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2';
const BobETH = '0xbe36543da0bc51f31cd3f915088d5d704572d047';
/* <--------------------------------------------------------------------------------------------------> */
/* <---------------------------------------Validation Setting--------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
const notary = "0xe6a31739cdda7a55ab7a1a62b719279c7c144df6";
const msgHash = "0xafecccaa184461341805019494d1d706dbdc4a89";

/* <--------------------------------------------------------------------------------------------------> */
/* <--------------------------------------Ethereum WebSite--------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
const myParser = require('body-parser');
const app = express();
const fs = require('fs');
app.use(myParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));
app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/Home.html');
});

// Store request from UI into RequestList smart contract on Ethereum.
app.post('/copy', function(req, res){
    if(req.body.Eth != "" && req.body.Corda != ""){
        // RequestList.methods.addCopyRequest(AssetList_Address, '0xe6a31739cdda7a55ab7a1a62b719279c7c144df6', req.body.Corda, req.body.AssetIndex).send({from: NotaryAgent, gas: 6721974})
        // .then(function(receipt){
        //     console.log("-----------------Add Copy Request-------------------");
        //     console.log("Ethereum Account: " + 'AliceETH');
        //     console.log("Corda Account: " + 'BobCORDA');
        //     // console.log(receipt.events.copy_event);
        // });
        var CopyRequestTxs = {
            table: []
        };
        let hash = "0x9e4a6f930d51fca5f9d8ce2df8fa79ada826457e8043612470e254e3c885c27e";
        web3.eth.personal.unlockAccount('0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2', "1234", 500)
        .then(function(){
            RequestList.methods.addCopyRequest(AssetList_Address, '0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2', 'Alice', 0).send({from:'0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2', gas: 6721974})
            .then(function(receipt){
                console.log("--------------- " + '0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2' + " send a copy request ---------------");
                console.log(receipt);

                web3.eth.getTransaction(receipt.transactionHash)
                .then(function(e){
                    CopyRequestTxs.table.push({
                        blockHash:e.blockHash, 
                        blockNumber:e.blockNumber, 
                        from:e.from, 
                        gas:e.gas, 
                        gasPrice:e.gasPrice, 
                        hash:e.hash, 
                        input:e.input,
                        nonce:e.nonce, 
                        to:e.to, 
                        tansactionIndex:e.trancsactionIndex,  
                        value:e.value, 
                        v:e.v, 
                        r:e.r, 
                        s:e.s,
                        Sender:'0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2',
                        Receiver:'BobCORDA',
                        AssetTx:hash
                    });
                    let filePath = 'notary-server/routes/CopyRequestTxs.json';
                    var jCopyRequest = JSON.stringify(CopyRequestTxs);
                    fs.writeFile(filePath, jCopyRequest, 'utf8', function(){
                        // console.log('New Copy Request!!!');
                    });

                    res.sendFile(__dirname + '/views/Done.html');
                });
            });
        });
    }
});
app.post('/transfer', function(req, res){
    if(req.body.Eth != "" && req.body.Corda != ""){
        RequestList.methods.addTransferRequest(AssetList_Address, '0xe6a31739cdda7a55ab7a1a62b719279c7c144df6', req.body.Corda, req.body.AssetIndex).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            console.log("-----------------Add Transfer Request-------------------");
            console.log("Ethereum Account: " + 'AliceETH');
            console.log("Corda Account: " + 'BobCORDA');
        });
    }

    // res.send("You sent a request!!");
    res.sendFile(__dirname + '/views/Done.html');
});
app.post('/exchange', function(req, res){
    if(req.body.Eth1 != "" && req.body.Corda1 != "" && req.body.Eth2 != "" && req.body.Corda2 != ""){
        RequestList.methods.addExchangeRequest(AssetList_Address, '0xe6a31739cdda7a55ab7a1a62b719279c7c144df6', req.body.Corda1, '0xBf3AA7d5ADAA5D2b110a71fcd9dE1E73faf23341', req.body.Corda2, req.body.USIndex, req.body.CarIndex).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            console.log("-----------------Add Exchange Request-------------------");
            console.log("Your Ethereum Account: " + 'AliceETH');
            console.log("Your Corda Account: " + 'AliceCORDA');
            console.log("Others Ethereum Account: " + 'BobETH');
            console.log("Others Corda Account: " + 'BobCORDA');
        });
    }

    // res.send("You sent a request!!");
    res.sendFile(__dirname + '/views/Done.html');
});
app.post('/newAsset', function(req, res){
    res.sendFile(__dirname + '/views/NewAsset.html');
});
var Health_Certificate = {
    table: []
};
app.post('/Newhealth', function(req, res){
    if(req.body.owner != "" && req.body.asset != ""){
        web3.eth.personal.unlockAccount('0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2', "1234", 600)
        .then(function(){
            AssetList.methods.addAsset_Health('0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2', '18').send({from: '0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2'})
            .then(function(e){
                console.log("--------------- " + '0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2' + " issue a health asset ---------------");
                console.log(e);

                web3.eth.getTransaction(e.transactionHash)
                .then(function(e){
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
                    let filePath = 'notary-server/routes/Health_Certificate.json';
                    var Health = JSON.stringify(Health_Certificate);
                    fs.writeFile(filePath, Health, 'utf8', function(){
                        // console.log('New Health Asset!!!');
                    });
                    res.sendFile(__dirname + '/views/Done.html');
                })
            })
        });
    }
});
function render(filename, params, callback){
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) return callback(err);
        for (var key in params) {
            data = data.replace('{' + key + '}', params[key]);
        }
        callback(null, data); // 用 callback 傳回結果
    });
}
app.post('/health', function(req, res){
    AssetList.methods.queryHealthAsset().call()
    .then(function(data){
        render(__dirname + '/views/Health.html', {
            a : data[0],
            b : data[1],
            c : data[2]
        }, function(err, data){
            res.send(data);
        });
    });
});
app.post('/car', function(req, res){
    AssetList.methods.queryCarAsset().call()
    .then(function(data){
        render(__dirname + '/views/Car.html', {
            a : data[0],
            b : data[1],
            c : data[2]
        }, function(err, data){
            res.send(data);
        });
    });
});
app.post('/us', function(req, res){
    AssetList.methods.queryUSdollarAsset().call()
    .then(function(data){
        render(__dirname + '/views/US.html', {
            a : data[0],
            b : data[1],
            c : data[2]
        }, function(err, data){
            res.send(data);
        });
    });
});
app.post('/land', function(req, res){
    AssetList.methods.queryLandAsset().call()
    .then(function(data){
        render(__dirname + '/views/Land.html', {
            a : data[0],
            b : data[1],
            c : data[2],
            d : data[3]
        }, function(err, data){
            res.send(data);
        });
    });
});
app.listen(1314, function(){
    console.log('\n--------------Welcome to Etheruem & Corda Platform---------------\n');
});

var ExchangeReqObj = [];
let TransferReqObj = [];

/* <--------------------------------------------------------------------------------------------------> */
/* <-------------------------------------------Ethereum-----------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
// Relayer get Blocks per 1 seconds
setInterval(getBlocksEth, 1000);

const blockPath = 'notary-server/routes/BlockNumber'
var blockNumber;
fs.access(blockPath, fs.F_OK, (err) => {
    if(err){
        web3.eth.getBlockNumber()
        .then(function(num){
            blockNumber = num;
        });
    }
    fs.readFile(blockPath, 'utf8', function(err, num){
        blockNumber = parseInt(num);
    });
});
var Blocks_Info = {
    table: []
};
function getBlocksEth(){
    web3.eth.getBlockNumber()
    .then(function(num){
        if(blockNumber <= num){
            web3.eth.getBlock(blockNumber)
            .then(function(e){
                // console.log(e);
                console.log("[Relayer] Get block #" + blockNumber +" from Ethereum.");
                Blocks_Info.table.push({
                    difficulty:e.difficulty, 
                    extraData:e.extraData, 
                    gasLimit:e.gasLimit, 
                    gasUsed:e.gasUsed, 
                    hash:e.hash,
                    logsBloom:e.logsBloom, 
                    miner:e.miner,
                    hash:e.hash,
                    nonce:e.nonce, 
                    number:e.number,  
                    parentHash:e.parentHash, 
                    receiptsRoot:e.receiptsRoot, 
                    sha3Uncles:e.sha3Uncles, 
                    size:e.size,
                    stateRoot:e.stateRoot,
                    timestamp:e.timestamp,
                    totalDifficulty:e.totalDifficulty,
                    transactions:e.transactions,
                    transactionsRoot:e.transactionsRoot,
                    uncles:e.uncles
                });
                let filePath = 'notary-server/routes/Blocks_Info.json';
                var jBlock = JSON.stringify(Blocks_Info);
                fs.writeFile(filePath, jBlock, 'utf8', function(){
                    //TODO: writeFile is slow than line242(blockNumber+=1), so this will print 13
                    // console.log("[Relayer] Write block #" + blockNumber +" into file.");
                });
                fs.writeFile(blockPath, blockNumber, 'utf8', function(){
                    // console.log(blockNumber);
                });
                blockNumber += 1;
            });
        }
    });
    // web3.eth.getBlock(blockNumber)
    // .then(function(e){
    //     // console.log(e);
    //     console.log("[Relayer] Get block #" + blockNumber +" from Ethereum.");
    //     Blocks_Info.table.push({
    //         difficulty:e.difficulty, 
    //         extraData:e.extraData, 
    //         gasLimit:e.gasLimit, 
    //         gasUsed:e.gasUsed, 
    //         hash:e.hash,
    //         logsBloom:e.logsBloom, 
    //         miner:e.miner,
    //         hash:e.hash,
    //         nonce:e.nonce, 
    //         number:e.number,  
    //         parentHash:e.parentHash, 
    //         receiptsRoot:e.receiptsRoot, 
    //         sha3Uncles:e.sha3Uncles, 
    //         size:e.size,
    //         stateRoot:e.stateRoot,
    //         timestamp:e.timestamp,
    //         totalDifficulty:e.totalDifficulty,
    //         transactions:e.transactions,
    //         transactionsRoot:e.transactionsRoot,
    //         uncles:e.uncles
    //     });
    //     let filePath = 'notary-server/routes/Blocks_Info.json';
    //     var jBlock = JSON.stringify(Blocks_Info);
    //     fs.writeFile(filePath, jBlock, 'utf8', function(){
    //         //TODO: writeFile is slow than line242(blockNumber+=1), so this will print 13
    //         // console.log("[Relayer] Write block #" + blockNumber +" into file.");
    //     });
    //     fs.writeFile(blockPath, blockNumber, 'utf8', function(){
    //         // console.log(blockNumber);
    //     });
    //     blockNumber += 1;
    // });
};

async function ValidationOnEth(msgHash, v, r, s, notary, NewOwner, Asset){
    web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    .then(function(){
        Validation.methods.verify(AssetList_Address, msgHash, v, r, s, notary, NewOwner, Asset).send({from: NotaryAgent})
        .then(function(e){
            console.log("--------------- " + 'Start Validation on Ethereum' + " ---------------");
            console.log("msgHash: " + msgHash);
            console.log("v: " + v);
            console.log("r: " + r);
            console.log("s: " + s);
            console.log("Corda notary" + notary);
            console.log("Receiver on ETH: " + NewOwner);
            console.log("Copy Asset: " + Asset);
            console.log(e);
            web3.eth.getTransaction(e.transactionHash)
            .then(function(e){
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
                let filePath = 'notary-server/routes/Health_Certificate.json';
                var Health = JSON.stringify(Health_Certificate);
                fs.writeFile(filePath, Health, 'utf8', function(){
                 // console.log('New Health Asset!!!');
                });
            });
        });
    });
};

async function FromCorda(Action, AssetOwner, NewOwner, Asset, AssetIndex, linearId, callback) {
    if(Action == 0 || Action == 1){ // Copy & Transfer
        if(Action == 0){
            console.log("----------CopyFromCorda(agent,src,dst)----------");
            console.log("agent: " + NotaryAgent);
            console.log("src: " + AssetOwner);
            console.log("dst: " + NewOwner);

            AssetList.methods.addAsset_Health(NewOwner, Asset).send({from: NotaryAgent, gas: 6721974})
            .then(function(receipt){
                console.log("-------------Finish Copy from Corda--------------");
                callback(receipt.transactionHash, linearId, Action); // Tell Corda if we're done
            })
        }
        else{
            console.log("----------TransferFromCorda(agent,src,dst)----------");
            console.log("agent: " + NotaryAgent);
            console.log("src: " + AssetOwner);
            console.log("dst: " + NewOwner);
            console.log("asset: " + Asset);

            AssetList.methods.addAsset_Car(NewOwner, Asset).send({from: NotaryAgent, gas: 6721974})
            .then(function(receipt){
                console.log("-------------Finish Transfer from Corda--------------");
                callback(receipt.transactionHash, linearId, Action); // Tell Corda if we're done
            })
        }
    }
}

// 0:pending, 1:reject, 2:success
async function updateStatusEth(Action, requestIndex, Status, Hash){
    if(Action == 0){
        RequestList.methods.changeCopyStatus(requestIndex, Status).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            console.log("-------------Change Ethereum Copy Request Status---------------");
            console.log("Copy Request: " + requestIndex);
            console.log("Status: " + Status);
        })
    }else if(Action == 1){
        RequestList.methods.changeTransferStatus(requestIndex, Status).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            removeTransferReq(0,requestIndex);
            console.log("-------------Change Ethereum Transfer Request Status---------------");
            console.log("Transfer Request: " + requestIndex);
            console.log("Status: " + Status);
        })
    }else if(Action == 2){
        RequestList.methods.changeExchangeStatus(requestIndex, Status).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            console.log("-------------Change Ethereum Exchange Request Status---------------");
            console.log("Exchange Request: " + requestIndex);
            console.log("Status: " + Status);
        })
    }else if(Action == 3){
        RequestList.methods.changeEncumbranceStatus(requestIndex, Status).send({from: NotaryAgent, gas: 6721974})
        .then(function(){
            console.log("-------------Change Encumbrance Request Status---------------");
            console.log("Encumbrance Request: " + requestIndex);
            console.log("Status: " + Status);
        })
    }
}

// Chain 0 is Eth, 1 is Corda
async function exchangeMatching(Chain, EthAsset, CordaAsset, EthA, CordaA, EthB, CordaB, EthRequestIndex, callback){
    console.log(Chain);
    console.log(EthA);
    console.log(CordaA);
    console.log(EthB);
    console.log(CordaB);
    console.log(EthAsset);
    console.log(CordaAsset);
    let lengthBeforePush = ExchangeReqObj.length
    if(Chain === 0){
        if(ExchangeReqObj.length !== 0){
            for(let i = 0; i < lengthBeforePush; i++){
                if(ExchangeReqObj[i].Cancel === "False" && ExchangeReqObj[i].EthAsset === EthAsset && ExchangeReqObj[i].CordaAsset === CordaAsset && ExchangeReqObj[i].EthA=== EthA && ExchangeReqObj[i].CordaA === CordaA && ExchangeReqObj[i].EthB === EthB && ExchangeReqObj[i].CordaB === CordaB){
                    ExchangeReqObj[i].Timeout = 0;
                    ExchangeReqObj[i].EthRequestIndex = EthRequestIndex;
                    // do exchange
                    callback(i);
                }
                else if (i === lengthBeforePush - 1) {
                    ExchangeReqObj.push({
                        EthAsset: EthAsset,
                        CordaAsset: CordaAsset,
                        EthA: EthA,
                        CordaA: CordaA,
                        EthB: EthB,
                        CordaB: CordaB,
                        EthRequestIndex: EthRequestIndex,
                        Cancel: "False",
                        Timeout: Math.floor(Date.now() / 1000) + exchangeTimeOut // 10 seconds
                    });
                    console.log("eth 1 push to ExchangeReqObj")
                }else{
                    //Nothing to do.
                }
            }
        }
        else{
            ExchangeReqObj.push({
                EthAsset: EthAsset,
                CordaAsset: CordaAsset,
                EthA: EthA,
                CordaA: CordaA,
                EthB: EthB,
                CordaB: CordaB,
                EthRequestIndex: EthRequestIndex,
                Cancel: "False",
                Timeout: Math.floor(Date.now() / 1000) + exchangeTimeOut // 10 seconds
            });
            console.log("eth 0 push to ExchangeReqObj")
        }
    }
    else{
        // Corda...
        if(ExchangeReqObj.length !== 0) {
            for (let i = 0; i < lengthBeforePush; i++) {
                // console.log("i: "+i)
                // console.log("ExchangeReqObj.length: "+ExchangeReqObj.length)
                if (ExchangeReqObj[i].Cancel === "False" && ExchangeReqObj[i].EthAsset === EthAsset && ExchangeReqObj[i].CordaAsset === CordaAsset && ExchangeReqObj[i].EthA=== EthA && ExchangeReqObj[i].CordaA === CordaA && ExchangeReqObj[i].EthB === EthB && ExchangeReqObj[i].CordaB === CordaB) {
                    console.log("Obj match!")
                    ExchangeReqObj[i].Timeout = 0;
                    //do exchange
                    callback(i);
                }else if(i === lengthBeforePush - 1) {
                    ExchangeReqObj.push({
                        EthAsset: EthAsset,
                        CordaAsset: CordaAsset,
                        EthA: EthA,
                        CordaA: CordaA,
                        EthB: EthB,
                        CordaB: CordaB,
                        Cancel: "False",
                        Timeout: Math.floor(Date.now() / 1000) + exchangeTimeOut	// 10 seconds
                    })
                    console.log("corda 1 push to ExchangeReqObj")
                }
                else{
                    //Nothing to do.
                }
            }
        }else{
            ExchangeReqObj.push({
                EthAsset: EthAsset,
                CordaAsset: CordaAsset,
                EthA: EthA,
                CordaA: CordaA,
                EthB: EthB,
                CordaB: CordaB,
                Cancel: "False",
                Timeout: Math.floor(Date.now() / 1000) + exchangeTimeOut	// 10 seconds
            })
            console.log("corda 0 push to ExchangeReqObj")
        }
    }
}

function doExchange(i){
    // on Eth
    AssetList.methods.ChangeOwnerOfUSdollar(ExchangeReqObj[i].EthAsset, ExchangeReqObj[i].EthA).send({from: NotaryAgent, gas: 6721974})
    .then(function(receipt){
       	// done
        console.log("Changing the US dollar owner to New Owner!")
    });
    //on Corda
    let id = ExchangeReqObj[i].CordaAsset
    console.log("----------exchangeToEthFinish(cordaId)----------")
    console.log("cordaId: " + id)
    braid.flows.exchangeToEthFinish(id).then(
        result => {
            id = result['coreTransaction']['outputs']['0']['data']['linearId']['id']
            console.log("Success!")
            //After Corda and Eth finish doExchange, request object will be remove.
            ExchangeReqObj.splice(i,1)
        }, err => {
            console.log("err on updateStatusCorda exchange: " + err)
        })
}

function requestCancel(){
	for(i = 0; i < ExchangeReqObj.length; i++){
		if(ExchangeReqObj[i].Cancel == "False" && ExchangeReqObj[i].Timeout !== 0){
			if(ExchangeReqObj[i].Timeout <= Date.now()/1000){
                if(ExchangeReqObj[i].EthRequestIndex != null){
				    ExchangeReqObj[i].Cancel = "True";
				    AssetList.methods.ChangeOwnerOfUSdollar(ExchangeReqObj[i].EthAsset, ExchangeReqObj[i].EthB).send({from: NotaryAgent, gas: 6721974})
    			    .then(function(receipt){
       				     // done
                        console.log("Changing the US dollar owner to Origin Owner!");
    			     });
                    updateStatusEth(2, ExchangeReqObj[i].EthRequestIndex, 1, "0");
                }
                else{
    			     // Corda function
                    //on Corda
                    let id = ExchangeReqObj[i].CordaAsset
                    braid.flows.rollback(id).then(
                        result => {
                            console.log("Rollback "+ id +" Success!")
                            //After Corda and Eth finish rollback, request object will be remove.
                            ExchangeReqObj = ExchangeReqObj.splice(i,1)
                        }, err => {
                            console.log("err on corda rollback exchange: " + err)
                        })
                }
			}
		}
	}

	//Rollback transfer
	for(let i = 0; i < TransferReqObj.length; i++){
        if(TransferReqObj[i].Timeout <= Date.now()/1000 && TransferReqObj[i].Timeout !== 0){
            if(TransferReqObj[i].chain === 0){
                //Ethereum function
                AssetList.methods.ChangeOwnerOfCar(TransferReqObj[i].asset, TransferReqObj[i].origOwner).send({from: NotaryAgent, gas: 6721974})
            	.then(function(result){
                	console.log("Changing the Car license owner to Origin Owner!");
            	});
                removeTransferReq(0,TransferReqObj[i].id)
            }
            else{
                // Corda function
                let id = TransferReqObj[i].id
                braid.flows.rollback(id).then(
                    result => {
                        console.log("Rollback "+ id +" Success!")
                        removeTransferReq(1,TransferReqObj[i].id)
                    }, err => {
                        console.log("err on corda rollback transfer: " + err)
                    })
            }
        }
    }
}

// Cancel the exchange request if timeout / per 8 seconds
//setInterval(function(){requestCancel()}, 8000);




/* <--------------------------------------------------------------------------------------------------> */
/* <--------------------------------------------Corda-------------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
function onOpen() {
    braid.network.myNodeInfo().then(result => {
        ourNameAndOwningKey = result['legalIdentities'][0];
        console.log('\n✔ Connected to corda node.\n');
        // console.log("I am Corda agent: ")
        // console.log(ourNameAndOwningKey);
    }, err => console.log(err))
    console.log('If we don\'t show the connecting msg, then you must restart corda shell.');
}
function onClose() { console.log('Disconnected from node.'); }
function onError(err) { console.error(err);}

async function getPayOffByCollateralId(cId){
    if (loanStates.length === 0){
        return "There is no loanState in list."
    }
    for(let i = 0 ;i < loanStates.length; i++){
        if (state.collateralId === cId){
            return state.isPayOff
        }
        else if (i === loanStates.length - 1){
            return "Cannot find match CollateralId."
        }else{
            // do nothing
        }

    }
}

async function updateLoanStates(cordaId,collateralId,loanId,isPayOff){
    if (loanStates.length === 0){
        loanStates.push({
            cordaId: cordaId,
            collateralId: collateralId,
            loanId: loanId,
            isPayOff: isPayOff
        })
        return "Push new Loanstate."
    }
    for(let i = 0; i<loanStates.length;i++){
        if(loanStates[i].loanId === loanId){
            //remove old version
            loanStates.splice(i,1)
            //push new version
            loanStates.push({
                cordaId: cordaId,
                collateralId: collateralId,
                loanId: loanId,
                isPayOff: isPayOff
            })
            return "Find duplicate Loanstate, will remove old one."
        }else if((i === loanStates.length - 1)){
            loanStates.push({
                cordaId: cordaId,
                collateralId: collateralId,
                loanId: loanId,
                isPayOff: isPayOff
            })
            return "Push new Loanstate."
        }else{
            //do nothing
        }
    }
}

function removeTransferReq(chainId,assetId){
    if (TransferReqObj.length === 0){
        console.log("Cannot find any Transfer Request.")
    }
    for (let i = 0;i<TransferReqObj.length;i++){
        if (TransferReqObj[i].chain === chainId && TransferReqObj[i].id === assetId){
            TransferReqObj.splice(i,1)
            return
        }else if (i === length - 1){
            console.log("There is no id in TransferReqObj")
        }
    }
}


// async function getCordaId1By0(older){
//     if(cordaIds.length === 0){
//         return "cordaIds has nothing."
//     }
//     for (let i = 0; i< cordaIds.length; i++){
//         if(cordaIds[i].older === older){
//             let rlt = cordaIds[i].newer
//             cordaIds.splice(i,1)
//             return rlt
//         }else if(i === cordaIds.length - 1){
//             return "Not found."
//         }else{
//             //do nothing
//         }
//     }
// }

async function getIsPayOffByLoanId(loanId){
    braid.flows.getIsPayOffByLoanId(loanId).then(
        result =>{
            console.log("----------getIsPayOffByLoanId("+loanId+")----------")
            let rlt = !result
            console.log("getIsPayOffByLoanId(loanId):"+rlt)
        }, err => {
            console.log("err on getIsPayOffByLoanId("+loanId+")")
            console.log(err)
            return "err"
        })
}

router.post('/test',(req,res)=>{
    console.log("----------test(a,b,c,d)----------")
    // console.log("a: "+req.body.a)
    // console.log("b: "+req.body.b)
    // console.log("c: "+req.body.c)
    // console.log("d: "+req.body.d)
    let a = req.body.a
    // let b = req.body.b
    // let c = req.body.c
    // let d = req.body.d
    // console.log("loanStates length before: "+loanStates.length)
    // updateLoanStates(a,b,c,d).then(rlt=>{
    //     console.log(rlt)
    //     console.log("loanStates length after: "+loanStates.length)
    // })
    braid.flows.getIsPayOffByLoanId(a).then(
        result =>{
            console.log("getIsPayOffByLoanId(loanId):"+result)
            console.log("getIsPayOffByLoanId(loanId) type: "+result.type)
            // return result
            res.send("true")
        }, err => res.status(500).send(err))
    // res.send(getIsPayOffByLoanId(req.body.a))

})

router.post('/loanStates',(req,res)=>{
    console.log("----------loanStates(cordaId,collateralId,loanId,isPayOff)----------")
    console.log("cordaId: "+req.body.cordaId)
    console.log("collateralId: "+req.body.collateralId)
    console.log("loanId: "+req.body.loanId)
    console.log("isPayOff: "+req.body.isPayOff)
    let cordaId = req.body.cordaId
    let collateralId = req.body.collateralId
    let loanId = req.body.loanId
    let isPayOff = req.body.isPayOff
    console.log("loanStates length before: "+loanStates.length)
    updateLoanStates(cordaId,collateralId,loanId,isPayOff).then(rlt=>{
        console.log("loanStates length after: "+loanStates.length)
    })
    res.send("loanState request received.")

})


router.post('/queryCollateral',(req,res)=>{
    console.log("----------queryCollateral(id)----------")
    console.log("collateral Id: "+req.body.id)
    let id = req.body.id

    //TODO: Query collateral value by it's id, return string.
    console.log("getAssetInfo_Land("+id+")")
    AssetList.methods.getAssetInfo_Land(id).call()
        .then(function(result){
            console.log("Land Value: " + result[1]);
            res.send(result[1])
        }, function (err) {
            console.log("err on getAssetInfo_Land: " + err);
        })
})


router.post('/ExchangeToEth',(req,res)=>{
    console.log("----------ExchangeToEth(ethId,cordaId,EthA,EthB,CordaA,CordaB)----------")
    console.log("ethId: "+req.body.ethId)
    console.log("cordaId0: "+req.body.cordaId0)
    // console.log("cordaId1: "+req.body.cordaId1)
    console.log("EthA: "+req.body.EthA)
    console.log("CordaA: "+req.body.CordaA)
    console.log("EthB: "+req.body.EthB)
    console.log("CordaB: "+req.body.CordaB)
    let ethId = req.body.ethId
    let cordaId0 = req.body.cordaId0
    let cordaId1 = req.body.cordaId1
    let EthA = req.body.EthA
    let EthB = req.body.EthB
    let CordaA = req.body.CordaA
    let CordaB = req.body.CordaB
    res.send("Exchange2Eth request received.")
    cordaIds.push({
        older:cordaId0,
        newer:cordaId1
    })
    //console.log(cordaIds[0].older+"  "+cordaIds[0].newer)
    // exchangeMatching(Chain, EthAsset, CordaAsset, EthA, CordaA, EthB, CordaB, EthRequestIndex, callback)
    exchangeMatching(1,ethId,cordaId0,EthA,CordaA,EthB,CordaB,"",doExchange)
})


router.post('/TransferToEth', (req, res) => {
    console.log("----------TransferToEth(asset,dst,src)----------")
    // console.log("asset: "+req.body.assets)
    // console.log("dst: "+req.body.dst)
    // //console.log("src: "+req.body.src)
    // console.log("Id: "+req.body.linearId)
    let assets = req.body.assets
    let dst = req.body.dst
    let src = req.body.src
    stx = JSON.parse(req.body.stx)
    let id = stx['coreTransaction']['outputs']['0']['data']['id']
    TransferReqObj.push({
        chain:1,
        id:id,
        Timeout: Math.floor(Date.now() / 1000) + transferTimeOut
    })
    res.send("Transfer2Ethereum request received.")
    FromCorda(1,"",dst,assets,"",id,updateStatusCorda)
});
//Action, AssetOwner, NewOwner, Asset, AssetIndex, linearId, callback

// request dst:ethereum account
router.post('/copyToEth', (req, res) => {
    console.log("----------copyToEth(asset,dst,src)----------")
    // console.log("asset: "+req.body.assets)
    // console.log("dst: "+req.body.dst)
    // //console.log("src: "+req.body.src)
    // console.log("Id: "+req.body.linearId)
    let assets = req.body.assets
    let dst = req.body.dst
    let src = req.body.src
    stx = JSON.parse(req.body.stx)
    let id = stx['coreTransaction']['outputs']['0']['data']['id']
    res.send("copy2Ethereum request received.")
    //FromCorda(0,"",dst,assets,"",id,updateStatusCorda)
});

//feature = 0:copy 1:transfer
async function updateStatusCorda(txHash,id,feature) {
    console.log("Wait seconds for the last corda flow finalised.")
    setTimeout(async function(){
        if(feature === 0) {
            console.log("----------copyToEthFinish(receipt,linearId)----------")
            console.log("receipt: " + txHash)
            console.log("id: " + id)
            braid.flows.copyToEthFinish(txHash, id).then(
                result => {
                    id = result['coreTransaction']['outputs']['0']['data']['linearId']['id'];
                    console.log("Success!")
                    //console.log("Id from Corda: " + JSON.stringify(id))
                }, err => {
                    console.log("err on updateStatusCorda copy: " + err)
                    //TODO: It will not notify corda party that copy is complete.
                })
        }
        if(feature === 1) {
            removeTransferReq(1,id)
            console.log("----------transferToEthFinish(receipt,id)----------")
            console.log("receipt: " + txHash)
            console.log("id: " + id)
            braid.flows.transferToEthFinish(txHash, id).then(
                result => {
                    id = result['coreTransaction']['outputs']['0']['data']['linearId']['id']
                    console.log("Success!")
                    //console.log("Id from Corda: " + id)
                }, err => {
                    console.log("err on updateStatusCorda transfer: " + err)
                })
        }
    },8000)
}

//Finish then call updateStatusEth(Action, requestIndex, Status, Hash)
//let cordaLock = false
async function copyFromEth(requestIndex,asset,dst,Action,callback) {
    // if(cordaLock){
    //     callback(Action,requestIndex,0,"")
    // }
    // cordaLock = true

    //dst -> Corda Party
    //remove unused space https://stackoverflow.com/questions/9932957/how-can-i-remove-a-character-from-a-string-using-javascript
    //name = name.match(/[a-zA-Z0-9]*/g)
    dst = dst.match(/[a-zA-Z0-9]*/g)[0]
    console.log("dst-->"+dst+"<--")
    await braid.myService.getPartyByName(dst).then(result =>{
        let rlt = result
        // console.log("result: ")
        // console.log(rlt)
        //console.log(rlt)
        let type = "health"
        if (isNaN(parseInt(asset, 10))){
            type = "car"
        }
        if (Action === 1){
            type = "car"
        }
        console.log("----------copyFromEth(asset,type,dst,src)----------")
        console.log("asset: "+asset)
        console.log("type: "+type)
        console.log("dst: "+rlt)
        console.log("src: "+"ethAccount")
        braid.flows.copyFromEth(asset,type,rlt,"ethAccount").then(
            result => {
                console.log("Success!")
                console.log("Id from Corda: "+result['coreTransaction']['outputs']['0']['data']['linearId']['id'])
                // console.log("txHash to Ethereum: "+txHash)
                callback(Action,requestIndex,2,result['coreTransaction']['outputs']['0']['data']['linearId']['id'])
                //cordaLock = false
            },err => {
                console.log("err on copyFromEth: "+err)
                callback(Action,requestIndex,1,"fail")
                //cordaLock = false
            })
    },err => {
        console.log("err on getPartyByName: "+err)
    })
}

// Corda Braid framework api
router.get('/whoami', (req, res) => {
    braid.myService.whoAmI(
        result => res.send("Hey, you're speaking to " + result + "!"),
        err => res.status(500).send(err));
});

router.get('/myNodeInfo',function (req,res) {
    braid.network.myNodeInfo().then(result =>{
        console.log(result)
        res.send(result)
    },err => res.status(500).send(err))
})

async function getLatestLinearId(oldLinearId){
    braid.myService.getLatestLinearId(oldLinearId).then(result =>{
        //console.log(result)
        return result
    },err => {
        console.log(err)
        return oldLinearId
    })
}

async function getTXHashByLinearId(linearId){
    braid.myService.getLatestLinearId(linearId).then(result =>{
        //console.log(result)
        return result
    },err => {
        console.log(err)
        return linearId
    })
}

async function getStateById(Id){
    console.log("----------getStateById(Id)----------")
    braid.myService.getStateById(Id).then(result =>{
        console.log(result)
        return result
    },err => {
        let e = err
        console.log(e)
        return "err"
    })
}

router.get('/getState',function (req,res) {
    braid.myService.getState().then(result =>{
        //console.log(result)
        res.send(result)
    },err => res.status(500).send(err))
})

function getId(){
    braid.myService.getState().then(result =>{
        console.log("getId: "+result['states']['0']['state']['data']['linearId']['id'])
        return result['states']['0']['state']['data']['linearId']['id']
    },err => {
        console.log(err)
        return err
    })
}
let ltx
router.get('/getLtx',function (req,res) {
    res.send(ltx)
})

app.post('/Corda2Relayer',function (req,res) {
    console.log("==================================================================================")
    console.log("C->E copy request")
    ltx = req.body.ltx
    let msgHash = req.body.msg
    console.log("msgHash: "+msgHash)
    let v = req.body.v
    let r = req.body.r
    let s = req.body.s
    console.log("Signature:[\nv: "+ v + ",\nr: "+ r + ",\ns: "+s+"\n]")
    let notary = req.body.notary
    // let newOwner = req.body.newOwner
    let newOwner = AliceETH
    console.log("New owner: "+newOwner)
    let asset = req.body.asset
    console.log("Asset: "+asset)
    res.send("Corda2Relayer success!")
    ValidationOnEth(msgHash,v,r,s,notary,newOwner,asset).then(function(rlt){
        console.log("Valid signature!")
        console.log("==================================================================================")
    })
})

async function updateEthBlocksToCorda(blocks){
    let input = blocks
    if (input === null){
        console.log("UpdateEthBlock input is empty.")
        return
    }
    braid.flows.UpdateEthBlock(blocks).then(
        result => {
            console.log("[Relayer] Send blocks to Corda Success! Current height: "+result)
        },err => {
            console.log("[Relayer] Error on UpdateEthBlock: "+err)
        })
}


// Buffer convert file to object, and avoid double read.
// Resolved save blocks that are sended to Corda. Avoid double send.
let blockBuffer = [],blockResolved = []
async function freadEthBlocks(){
    let fs = require('fs')
    let filePath = 'notary-server/routes/Blocks_Info.json';
    let file
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){
            throw err;
        }
        file = data
        let fixedFile = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
// 1. convert file to requestTXBuffer list
        let blocks = JSON.parse(fixedFile)
        for (let i=0;i<blocks.length;i++){
            if (blockBuffer.length === 0){
                blockBuffer.push(blocks[String(i)])
            } else{
                for (let j=0;j<blockBuffer.length;j++){
                    if (blockBuffer[String(j)]['hash'] === blocks[String(i)]['hash']){
                        break
                    }
                    if (j === blockBuffer.length-1){
                        blockBuffer.push(blocks[String(i)])
                    }
                }
            }
        }
//2. if blocks has not sended, send to Corda
        fixedFile = ""
        for (let i=0;i<blockBuffer.length;i++){
            if (blockHashHasResolved(blockBuffer[String(i)]['hash'])){
            }else{
                fixedFile = fixedFile + JSON.stringify(blockBuffer[String(i)]) + ","
                blockResolved.push(blockBuffer[String(i)])
            }
        }
        if (fixedFile === ""){
            return
        }
        fixedFile = "[".concat(fixedFile)
        fixedFile = fixedFile.substring(0,fixedFile.lastIndexOf(","))
        fixedFile += "]"
        updateEthBlocksToCorda(fixedFile)
    })
}


// check requestTX in requestTXResolved
function blockHashHasResolved(hash){
    for (let k=0;k<blockResolved.length;k++){
        if (hash === blockResolved[String(k)]['hash']){
            // console.log("request has sended.")
            return true
        }
        if (k===blockResolved.length-1){
            return false
        }
    }
    return false
}


// Buffer convert file to object, and avoid double read.
// Resolved save TXs that are sended to Corda. Avoid double send.
let requestTXBuffer = [],assetTXBuffer = []
let requestTXResolved = [],assetTXResolved = []
async function freadEthTXs(){
    // 1. convert file to requestTXBuffer list
    let fs = require('fs')
    let filePath = 'notary-server/routes/CopyRequestTxs.json';
    let file
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){// no request
            // console.log(err)
            return
        }
        file = data
        let fixedFile = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
        let requests = JSON.parse(fixedFile)
        for (let i=0;i<requests.length;i++){
            // console.log("requestTX "+i+": "+requests[String(i)]['AssetTx'])
            if (requestTXBuffer.length === 0){
                requestTXBuffer.push(requests[String(i)])
            } else{
                for (let j=0;j<requestTXBuffer.length;j++){
                    if (requestTXBuffer[String(j)]['AssetTx'] === requests[String(i)]['AssetTx']){
                        break
                    }
                    if (j === requestTXBuffer.length-1){
                        requestTXBuffer.push(requests[String(i)])
                    }
                }
            }
        }
// 2. convert file to assetTXBuffer list
        filePath = 'notary-server/routes/Health_Certificate.json';
        let file2
        fs.readFile(filePath,"utf8",function (err,data) {
            if (err){// no request
                // console.log(err)
                return
            }
            file2 = data
            let fixedFile2 = file2.substring(file2.indexOf("["),file2.lastIndexOf("]")+1)
            let assets = JSON.parse(fixedFile2)
            for (let i=0;i<assets.length;i++){
                // console.log("assetTX "+i+": "+assets[String(i)]['hash'])
                if (assetTXBuffer.length === 0){
                    assetTXBuffer.push(assets[String(i)])
                } else{
                    for (let j=0;j<assetTXBuffer.length;j++){
                        if (assetTXBuffer[String(j)]['hash'] === assets[String(i)]['hash']){
                            break
                        }
                        if (j === assetTXBuffer.length-1){
                            assetTXBuffer.push(assets[String(i)])
                        }
                    }
                }

            }


//3. if requestTX has not sended, send to Corda
            for (let i=0;i<requestTXBuffer.length;i++){
                if (requestTXHashHasResolved(requestTXBuffer[String(i)]['hash'])){
                    break
                }
                for (let j=0;j<assetTXBuffer.length;j++){
                    // console.log("1072line: "+requestTXBuffer[String(i)]['AssetTx'])
                    // console.log("1073line: "+assetTXBuffer[String(j)]['hash'])

                    if ((requestTXBuffer[String(i)]['AssetTx'] === assetTXBuffer[String(j)]['hash']) && blockNumber - CANONICAL_CHAIN_LENGTH > requestTXBuffer[String(i)]['blockNumber']) {
                        console.log("[Relayer] Send copy request ["+requestTXBuffer[String(i)]['hash']+"] to Corda.")
                        let fixedFile = JSON.stringify(requestTXBuffer[String(i)])
                        // console.log("1076line: "+fixedFile)
                        let fixedFile2 = JSON.stringify(assetTXBuffer[String(j)])
                        // console.log("1078line: "+fixedFile2)
                        requestTXResolved.push(requestTXBuffer[String(i)])
                        assetTXResolved.push(assetTXBuffer[String(j)])
                        updateEthTXToCorda(fixedFile,fixedFile2).then(rlt=>{})
                    }

                }
            }
        })
    })
}


// check requestTX in requestTXResolved
function requestTXHashHasResolved(hash){
    for (let k=0;k<requestTXResolved.length;k++){
        if (hash === requestTXResolved[String(k)]['hash']){
            // console.log("request has sended.")
            return true
        }
        if (k===requestTXResolved.length-1){
            return false
        }
    }
    return false
}

async function updateEthTXToCorda(requestTx,assetTx){
    let input = requestTx
    let input2 = assetTx

    if (input === null || input2 === null){
        return "UpdateEthTX inputs is empty."
    }
    braid.flows.UpdateEthTX(input,input2,false).then(
        result => {
            console.log("[Corda]"+result)
        },err => {
            console.log("[Relayer] Error on UpdateEthTX: "+err)
        })
}

setInterval(freadEthBlocks,2000)
setInterval(freadEthTXs,2000)


module.exports = router;
