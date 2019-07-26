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
// const ethereumUri = 'http://140.119.101.130:7576';
// let web3 = new Web3(new Web3.providers.HttpProvider(ethereumUri));
const ethereumUri = 'ws://140.119.101.130:7576';
let web3 = new Web3(new Web3.providers.WebsocketProvider(ethereumUri));

let NotaryAgent = '0x76ac34807210d52fcbfc0412cf4da5c672214752';

let AssetList_ABI = require("../../Contract/AssetList_ABI.js");
let AssetList_Address = '0xfe41eb5337bd127ec171b24ebed1ee88d2c641d1';
var AssetList = new web3.eth.Contract(AssetList_ABI, AssetList_Address);

let RequestList_ABI = require("../../Contract/RequestList_ABI.js");
let RequestList_Address = '0x8ee1b13652c8695c22a7e4372cf781fa5a540b2a';
var RequestList = new web3.eth.Contract(RequestList_ABI, RequestList_Address);

let Validation_ABI = require("../../Contract/Validation_ABI.js");
let Validation_Address = '0xbf9ec3840043132efdfea54eb1850297f7fc879f';
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


/* <--------------------------------------------------------------------------------------------------> */
//Log file
// const logTime = new Date().toLocaleTimeString()
let stream = fs.createWriteStream("relayer-server/routes/log.txt", {flags:'a'});
function writeToLog(obj){
    stream.write(obj + "\n");
}



app.use(myParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));
app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/Home.html');
});

var healthTx = "";
// Store request from UI into RequestList smart contract on Ethereum.
app.post('/copy', function(req, res){
    if(req.body.Eth != "" && req.body.Corda != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 500)
        .then(function(){
            RequestList.methods.addCopyRequest(AssetList_Address, AliceETH, 'BobCORDA', req.body.AssetIndex).send({from:AliceETH, gas: 6721974})
            .then(function(receipt){
                console.log("[user] AliceETH" + " send a copy request");
                writeToLog("[user] AliceETH" + " send a copy request")

                RequestList.methods.emitCopyEvent(healthTx, receipt.transactionHash).send({from:AliceETH, gas: 6721974})
                .then(function(){
                    console.log("[relayer] send 2 Transactions receipt for Copy");
                    writeToLog("[relayer] send 2 Transactions receipt for Copy")

                    res.sendFile(__dirname + '/views/Done.html');
                });
            });
        });
    }
});
RequestList.events.copy_event(function(error, event){
    var Health_Certificate = {
        table: []
    };
    var Health_Receipt = {
        table: []
    };
    var CopyRequestTxs = {
        table: []
    };
    var CopyReceipt = {
        table: []
    };
    if(!error){
        let assetTx = event['returnValues']['assetTx'];
        let requestTx = event['returnValues']['requestTx'];
        console.log('[relayer] get copy event');

        web3.eth.getTransaction(assetTx)
        .then(function(e){
            Health_Certificate.table.push({
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
                s:e.s
            });
            let filePath = 'relayer-server/routes/Health_Certificate.json';
            var Health = JSON.stringify(Health_Certificate);
            fs.writeFile(filePath, Health, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
        web3.eth.getTransactionReceipt(assetTx)
        .then(function(e){
            Health_Receipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/Health_Receipt.json';
            var Receipt = JSON.stringify(Health_Receipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })

        web3.eth.getTransaction(requestTx)
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
                AssetTx:assetTx
            });
            let filePath = 'relayer-server/routes/CopyRequestTxs.json';
            var Request = JSON.stringify(CopyRequestTxs);
            fs.writeFile(filePath, Request, 'utf8', function(){
                // console.log('New Copy Request!!!');
            });
        });
        web3.eth.getTransactionReceipt(requestTx)
        .then(function(e){
            CopyReceipt.table.push({
                status:e.status,
                transactionHash:e.transactionHash,
                transactionIndex:e.transactionIndex,
                blockHash:e.blockHash,
                blockNumber:e.blockNumber,
                contractAddress:e.contractAddress,
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/CopyReceipt.json';
            var Receipt = JSON.stringify(CopyReceipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
    }else{
        console.log(error);
    }
})
let carTx = "";
app.post('/transfer', function(req, res){
    if(req.body.Eth != "" && req.body.Corda != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 500)
        .then(function(){
            RequestList.methods.addTransferRequest(AssetList_Address, AliceETH, 'BobCORDA', req.body.AssetIndex).send({from:AliceETH, gas: 6721974})
            .then(function(receipt){
                console.log("[user] AliceETH" + " send a transfer request");
                writeToLog("[user] AliceETH" + " send a transfer request")

                RequestList.methods.emitTransferEvent(carTx, receipt.transactionHash).send({from:AliceETH, gas: 6721974})
                .then(function(){
                    console.log("[relayer] send 2 Transactions receipt for Transfer");
                    writeToLog("[relayer] send 2 Transactions receipt for Transfer")
                    res.sendFile(__dirname + '/views/Done.html');
                });
            });
        });
    }
});
RequestList.events.transfer_event(function(error, event){
    var Car_Certificate = {
        table: []
    };
    var Car_Receipt = {
        table: []
    };
    var TransferRequestTxs = {
        table: []
    };
    var TransferReceipt = {
        table: []
    };
    if(!error){
        let assetTx = event['returnValues']['assetTx'];
        let requestTx = event['returnValues']['requestTx'];
        console.log('[relayer] get transfer event');

        web3.eth.getTransaction(assetTx)
        .then(function(e){
            Car_Certificate.table.push({
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
            let filePath = 'relayer-server/routes/Car_Certificate.json';
            var Health = JSON.stringify(Car_Certificate);
            fs.writeFile(filePath, Health, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
        web3.eth.getTransactionReceipt(assetTx)
        .then(function(e){
            Car_Receipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/Car_Receipt.json';
            var Receipt = JSON.stringify(Car_Receipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })

        web3.eth.getTransaction(requestTx)
        .then(function(e){
            TransferRequestTxs.table.push({
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
                AssetTx:assetTx
            });
            let filePath = 'relayer-server/routes/TransferRequestTxs.json';
            var Request = JSON.stringify(TransferRequestTxs);
            fs.writeFile(filePath, Request, 'utf8', function(){
                // console.log('New Copy Request!!!');
            });

            // res.sendFile(__dirname + '/views/Done.html');
        });
        web3.eth.getTransactionReceipt(requestTx)
        .then(function(e){
            TransferReceipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/TransferReceipt.json';
            var Receipt = JSON.stringify(TransferReceipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
    }else{
        console.log(error);
    }
})
let usTx = "";
app.post('/exchange', function(req, res){
    if(req.body.Eth1 != "" && req.body.Corda1 != "" && req.body.Eth2 != "" && req.body.Corda2 != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 500)
        .then(function(){
            RequestList.methods.addExchangeRequest(AssetList_Address, AliceETH, BobETH, req.body.USIndex, req.body.CarIndex).send({from:AliceETH, gas: 6721974})
            .then(function(receipt){
                console.log("[user] AliceETH" + " send a exchange request");
                writeToLog("[user] AliceETH" + " send a exchange request")

                RequestList.methods.emitExchangeEvent(usTx, receipt.transactionHash).send({from:AliceETH, gas: 6721974})
                .then(function(){
                    console.log("[relayer] send 2 Transactions receipt for Exchange");
                    writeToLog("[relayer] send 2 Transactions receipt for Exchange")

                    res.sendFile(__dirname + '/views/Done.html');
                });
            });
        });
    }
});
RequestList.events.exchange_event(function(error, event){
    var US_Certificate = {
        table: []
    };
    var US_Receipt = {
        table: []
    };
    var ExchangeRequestTxs = {
        table: []
    };
    var ExchangeReceipt = {
        table: []
    };
    if(!error){
        let assetTx = event['returnValues']['assetTx'];
        let requestTx = event['returnValues']['requestTx'];
        console.log('[relayer] get exchange event');

        web3.eth.getTransaction(assetTx)
        .then(function(e){
            US_Certificate.table.push({
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
            let filePath = 'relayer-server/routes/US_Certificate.json';
            var US = JSON.stringify(US_Certificate);
            fs.writeFile(filePath, US, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
        web3.eth.getTransactionReceipt(assetTx)
        .then(function(e){
            US_Receipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/US_Receipt.json';
            var Receipt = JSON.stringify(US_Receipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })

        web3.eth.getTransaction(requestTx)
        .then(function(e){
            ExchangeRequestTxs.table.push({
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
                AssetTx:assetTx
            });
            let filePath = 'relayer-server/routes/ExchangeRequestTxs.json';
            var Request = JSON.stringify(ExchangeRequestTxs);
            fs.writeFile(filePath, Request, 'utf8', function(){
                // console.log('New Copy Request!!!');
            });

            // res.sendFile(__dirname + '/views/Done.html');
        });
        web3.eth.getTransactionReceipt(requestTx)
        .then(function(e){
            ExchangeReceipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/ExchangeReceipt.json';
            var Receipt = JSON.stringify(ExchangeReceipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){
                // console.log('New Health Asset!!!');
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
    }else{
        console.log(error);
    }
})
RequestList.events.noticeMsg(function(error, event){
    console.log('[user] Alice get notice message');
    let index = event['returnValues']['index']
    web3.eth.personal.unlockAccount(AliceETH, "1234", 500)
    .then(function(){
        RequestList.methods.askingCordaMsg(index).send({from: AliceETH, gas: 6721974})
        .then(function (receipt) {
            // console.log("[TimeOracle] Rollback asset.")
            RequestList.methods.emitEncumbranceEvent(receipt.transactionHash).send({from: AliceETH, gas: 6721974})
            .then(function(e){
                        
            })
        })
    })
})
var asking_Certificate = {
    table: []
};
var asking_Receipt = {
    table: []
};
RequestList.events.encumbrance_event(function(error, event){
    console.log('[relayer] get Alice notice event');
    writeToLog('[relayer] get Alice notice event')
    if(!error){
        let Tx = event['returnValues']['Tx'];

        web3.eth.getTransaction(Tx)
        .then(function(e){
            asking_Certificate.table.push({
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
            let filePath = 'relayer-server/routes/asking_Certificate.json';
            var asking = JSON.stringify(asking_Certificate);
            fs.writeFile(filePath, asking, 'utf8', function(){
                
            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
        web3.eth.getTransactionReceipt(Tx)
        .then(function(e){
            asking_Receipt.table.push({
                status:e.status, 
                transactionHash:e.transactionHash, 
                transactionIndex:e.transactionIndex, 
                blockHash:e.blockHash, 
                blockNumber:e.blockNumber, 
                contractAddress:e.contractAddress, 
                cumulativeGasUsed:e.cumulativeGasUsed,
                logs:e.logs
            });
            let filePath = 'relayer-server/routes/asking_Receipt.json';
            var Receipt = JSON.stringify(asking_Receipt);
            fs.writeFile(filePath, Receipt, 'utf8', function(){

            });
            // res.sendFile(__dirname + '/views/Done.html');
        })
    }else{
        console.log(error);
    }
})
app.post('/newAsset', function(req, res){
    res.sendFile(__dirname + '/views/NewAsset.html');
});
app.post('/Newhealth', function(req, res){
    if(req.body.owner != "" && req.body.asset != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 600)
        .then(function(){
            AssetList.methods.addAsset_Health(AliceETH, req.body.asset).send({from: AliceETH})
            .then(function(e){
                healthTx = e.transactionHash;
                console.log("[user] AliceETH issues a Health asset");
                writeToLog("[user] AliceETH issues a Health asset")
                res.sendFile(__dirname + '/views/Done.html');
            })
        });
    }
});
app.post('/Newcar', function(req, res){
    if(req.body.owner != "" && req.body.asset != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 600)
        .then(function(){
            AssetList.methods.addAsset_Car(AliceETH, req.body.asset).send({from: AliceETH})
            .then(function(e){
                carTx = e.transactionHash;
                console.log("[user] AliceETH issues a Car asset");
                writeToLog("[user] AliceETH issues a Car asset")
                res.sendFile(__dirname + '/views/Done.html');
            })
        });
    }
});
app.post('/Newus', function(req, res){
    if(req.body.owner != "" && req.body.asset != ""){
        web3.eth.personal.unlockAccount(AliceETH, "1234", 600)
        .then(function(){
            AssetList.methods.addAsset_USdollar(AliceETH, req.body.asset).send({from: AliceETH})
            .then(function(e){
                usTx = e.transactionHash;
                console.log("[user] AliceETH issues a USDollar asset");
                writeToLog("[user] AliceETH issues a USDollar asset")
                res.sendFile(__dirname + '/views/Done.html');
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
            c : data[2],
            d : data[3]
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
            c : data[2],
            d : data[3]
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

//JAVA 檢查 file 存在與否
//https://stackoverflow.com/questions/1816673/how-do-i-check-if-a-file-exists-in-java
const blockPath = 'relayer-server/routes/BlockNumber'
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
const BLOCKS_INFO_TABLE_MAX_LENGTH = 5
function getBlocksEth(){
    web3.eth.getBlockNumber()
    .then(function(num){
        var Blocks_Info = {
            table: []
        };
        if(blockNumber <= num){
            web3.eth.getBlock(blockNumber)
            .then(function(e){
                // console.log(e);
                console.log("[Relayer] Get block #" + blockNumber +" from Ethereum.");
                writeToLog("[Relayer] Get block #" + blockNumber +" from Ethereum.")
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
                /***
                 * 2019.6.13 Fix the interrupt of file read by limiting the writing json size.
                 *  1. fs.writeFile() does not hava writing bound.
                 *  2. May have something to do with RAM. => https://stackoverflow.com/questions/24153996/is-there-a-limit-on-the-size-of-a-string-in-json-with-node-js
                 */
                // console.log("[DEBUG]buffer length: "+Blocks_Info.table.length)
                let filePath = 'relayer-server/routes/Blocks_Info.json';
                var jBlock = JSON.stringify(Blocks_Info);
                // console.log("[DEBUG]JSON length: "+jBlock.length)
                fs.writeFile(filePath, jBlock, 'utf8', function(){
                    if (Blocks_Info.table.length > BLOCKS_INFO_TABLE_MAX_LENGTH){
                        Blocks_Info.table.splice(0,BLOCKS_INFO_TABLE_MAX_LENGTH)
                    }

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
};

async function ValidationOnEth(msgHash, v, r, s, notary, NewOwner, Asset, Action, CordaIndex){
    web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    .then(function(){
        Validation.methods.verify(AssetList_Address, msgHash, v, r, s, notary, NewOwner, Asset, Action, CordaIndex).send({from: NotaryAgent, gas: 6721974})
        .then(function(e){
            console.log("[relayer] Validating Corda  request transaction");
            writeToLog("[relayer] Validating Corda  request transaction")

            Validation.methods.emitValidationEvent(e.transactionHash, Action).send({from: NotaryAgent})
            .then(function(e){

            });
        });
    });
};
Validation.events.validation_event(function(error, event){
    if(!error){
        if(event['returnValues']['Action'] == 1){
            var transferRes = {
                table: []
            };
            var transferRes_Receipt = {
                table: []
            };
            web3.eth.getTransaction(event['returnValues']['validationTx'])
            .then(function(e){
                transferRes.table.push({
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
                let filePath = 'relayer-server/routes/transferRes.json';
                var jTranserRes = JSON.stringify(transferRes);
                fs.writeFile(filePath, jTranserRes, 'utf8', function(){
                    // console.log('New Health Asset!!!');
                });
                // res.sendFile(__dirname + '/views/Done.html');
            })
            web3.eth.getTransactionReceipt(event['returnValues']['validationTx'])
            .then(function(e){
                transferRes_Receipt.table.push({
                    status:e.status, 
                    transactionHash:e.transactionHash, 
                    transactionIndex:e.transactionIndex, 
                    blockHash:e.blockHash, 
                    blockNumber:e.blockNumber, 
                    contractAddress:e.contractAddress, 
                    cumulativeGasUsed:e.cumulativeGasUsed,
                    logs:e.logs
                });
                let filePath = 'relayer-server/routes/transferRes_Receipt.json';
                var jtransferRes_Receipt = JSON.stringify(transferRes_Receipt);
                fs.writeFile(filePath, jtransferRes_Receipt, 'utf8', function(){
                    // console.log('New Health Asset!!!');
                });
                // res.sendFile(__dirname + '/views/Done.html');
            })
        }
        else if(event['returnValues']['Action'] == 2){

        }
        else if(event['returnValues']['Action'] == 3){
            var landValue = {
                table: []
            };
            var landValue_Receipt = {
                table: []
            };
            web3.eth.getTransaction(event['returnValues']['validationTx'])
            .then(function(e){
                landValue.table.push({
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
                let filePath = 'relayer-server/routes/landValue.json';
                var jlandValue = JSON.stringify(landValue);
                fs.writeFile(filePath, jlandValue, 'utf8', function(){

                });
                // res.sendFile(__dirname + '/views/Done.html');
            })
            web3.eth.getTransactionReceipt(event['returnValues']['validationTx'])
            .then(function(e){
                landValue_Receipt.table.push({
                    status:e.status, 
                    transactionHash:e.transactionHash, 
                    transactionIndex:e.transactionIndex, 
                    blockHash:e.blockHash, 
                    blockNumber:e.blockNumber, 
                    contractAddress:e.contractAddress, 
                    cumulativeGasUsed:e.cumulativeGasUsed,
                    logs:e.logs
                });
                let filePath = 'relayer-server/routes/landValue_Receipt.json';
                var jlandValue_Receipt = JSON.stringify(landValue_Receipt);
                fs.writeFile(filePath, jlandValue_Receipt, 'utf8', function(){
                    
                });
                // res.sendFile(__dirname + '/views/Done.html');
            })
        }
    }
});
async function ResponseValidationOnEth(msgHash, v, r, s, notary, EthIndex, Action, Status){
    // if(Action == 1){
    //     web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    //     .then(function(){
    //         Validation.methods.verifyResponse(AssetList_Address, RequestList_Address, msgHash, v, r, s, notary, EthIndex, Action, Status).send({from: NotaryAgent, gas: 6721974})
    //         .then(function(e){
    //             console.log("[relayer] Validating Corda response transaction");
    //         });
    //     });
    // }
    // else if(Action == 2){
    //     web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    //     .then(function(){
    //         Validation.methods.verifyResponse(AssetList_Address, RequestList_Address, msgHash, v, r, s, notary, EthIndex, Action, Status).send({from: NotaryAgent, gas: 6721974})
    //         .then(function(e){
    //             console.log("[relayer] Validating Corda response transaction");
    //         });
    //     });
    // }
    // else if(Action == 3){
    //     web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    //     .then(function(){
    //         Validation.methods.verifyResponse(AssetList_Address, RequestList_Address, msgHash, v, r, s, notary, EthIndex, Action, Status).send({from: NotaryAgent, gas: 6721974})
    //         .then(function(e){
    //             console.log("[relayer] Validating Corda response transaction");
    //         });
    //     });
    // }
    web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
    .then(function(){
        Validation.methods.verifyResponse(AssetList_Address, RequestList_Address, msgHash, v, r, s, notary, EthIndex, Action, Status).send({from: NotaryAgent, gas: 6721974})
        .then(function(e){
            console.log("[relayer] Validating Corda response transaction");
            writeToLog("[relayer] Validating Corda response transaction")
        });
    });
}

// async function QueryLandValueOnEth(index){
//     web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
//     .then(function(){
//         AssetList.methods.getAssetInfo_Land(index).send({from:NotaryAgent})
//         .then(function(e){
//             var landValue = {
//                 table: []
//             };
//             var landValue_Receipt = {
//                 table: []
//             };
//             landValue.table.push({
//                 blockHash:e.blockHash, 
//                 blockNumber:e.blockNumber, 
//                 from:e.from, 
//                 gas:e.gas, 
//                 gasPrice: e.gasPrice, 
//                 hash:e.hash, 
//                 input:e.input,
//                 nonce:e.nonce, 
//                 to:e.to, 
//                 tansactionIndex:e.trancsactionIndex,  
//                 value:e.value, 
//                 v:e.v, 
//                 r:e.r, 
//                 s:e.s
//             });
//             let filePath = 'relayer-server/routes/landValue.json';
//             var jlandValue = JSON.stringify(landValue);
//             fs.writeFile(filePath, jlandValue, 'utf8', function(){
//                 // console.log('Get Land Value!!!');
//             });
//             web3.eth.getTransactionReceipt(e.transactionHash)
//             .then(function(e){
//                 transferRes_Receipt.table.push({
//                     status:e.status, 
//                     transactionHash:e.transactionHash, 
//                     transactionIndex:e.transactionIndex, 
//                     blockHash:e.blockHash, 
//                     blockNumber:e.blockNumber, 
//                     contractAddress:e.contractAddress, 
//                     cumulativeGasUsed:e.cumulativeGasUsed,
//                     logs:e.logs
//                 });
//                 let filePath = 'relayer-server/routes/landValue_Receipt.json';
//                 var jlandValue_Receipt = JSON.stringify(landValue_Receipt);
//                 fs.writeFile(filePath, jlandValue_Receipt, 'utf8', function(){
//                     // console.log('Get Land Value Receipt!!!');
//                 });
//             })
//         })
//     })
// }



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

// async function getPayOffByCollateralId(cId){
//     if (loanStates.length === 0){
//         return "There is no loanState in list."
//     }
//     for(let i = 0 ;i < loanStates.length; i++){
//         if (state.collateralId === cId){
//             return state.isPayOff
//         }
//         else if (i === loanStates.length - 1){
//             return "Cannot find match CollateralId."
//         }else{
//             // do nothing
//         }
//
//     }
// }

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

// async function getIsPayOffByLoanId(loanId){
//     braid.flows.getIsPayOffByLoanId(loanId).then(
//         result =>{
//             console.log("----------getIsPayOffByLoanId("+loanId+")----------")
//             let rlt = !result
//             console.log("getIsPayOffByLoanId(loanId):"+rlt)
//         }, err => {
//             console.log("err on getIsPayOffByLoanId("+loanId+")")
//             console.log(err)
//             return "err"
//         })
// }

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

/**todo: request send from Corda will like this
 RequestBody body = new FormBody.Builder()
 .add("ltx",json)
 .add("msg","0x390c230c946e713b8f41a5c02a0fa3a4c40acb9a94b15694c1694e3522b2ab77")
 .add("v","28")
 .add("r","0x56cf5a5257bc2b5b26e1fc99503afcd5e6d30faf5f72d9cce59bdb4f72e025f1")
 .add("s","0x74de9cbe26c3c10d60534d97ca90c04ebfcfc62858456fdf70f7743d5dd6b78e")
 .add("notary","0x2e988a386a799f506693793c6a5af6b54dfaabfb")
 .add("newOwner", byte32 Ethereum address)
 .add("asset",string)
 .add("request","transfer")
 .build();
 */
app.post('/Corda2RelayerRequest',function (req,res) {
    console.log("[Corda]\n==================================================================================")
    writeToLog("[Corda]\n==================================================================================")
    let requestType = req.body.request
    // copy 0, transfer 1, exchange 2
    let requestTypeInt = 0
    if (requestType === "copy"){
        console.log("C->E copy request")
        writeToLog("C->E copy request")
    } else if(requestType === "transfer"){
        console.log("C->E transfer request")
        writeToLog("C->E transfer request")
        requestTypeInt = 1
    }else if (requestType === "encumbrance") {
        console.log("C->E encumbrance request")
        writeToLog("C->E encumbrance request")
        requestTypeInt = 3
    }
    ltx = req.body.ltx
    let msgHash = req.body.msg
    console.log("msgHash: "+msgHash)
    writeToLog("msgHash: "+msgHash)
    let v = req.body.v
    let r = req.body.r
    let s = req.body.s
    console.log("Signature:[\nv: "+ v + ",\nr: "+ r + ",\ns: "+s+"\n]")
    writeToLog("Signature:[\nv: "+ v + ",\nr: "+ r + ",\ns: "+s+"\n]")
    let notary = req.body.notary
    // let newOwner = req.body.newOwner
    let newOwner = AliceETH
    let asset = req.body.asset
    let assetId = req.body.assetId
    if (requestTypeInt !== 3){
        console.log("New owner: AliceETH")
        writeToLog("New owner: AliceETH")
        console.log("Asset: "+asset)
        writeToLog("Asset: "+asset)
        console.log("Asset ID: "+assetId)
        writeToLog("Asset ID: "+assetId)
    }else{
        console.log("Query value of land ID: "+ assetId)
        writeToLog("Query value of land ID: "+ assetId)
        asset = assetId
    }
    res.send("Corda2Relayer success!")
    ValidationOnEth(msgHash,v,r,s,notary,newOwner,parseInt(asset,10),requestTypeInt,assetId).then(function(rlt){
        console.log("Valid signature!")
        writeToLog("Valid signature!")
        console.log("==================================================================================")
        writeToLog("==================================================================================")
    })
})


/**todo: response send from Corda will like this
 * RequestBody body = new FormBody.Builder()
 .add("ltx",json)
 .add("msg","0x390c230c946e713b8f41a5c02a0fa3a4c40acb9a94b15694c1694e3522b2ab77")
 .add("v","28")
 .add("r","0x56cf5a5257bc2b5b26e1fc99503afcd5e6d30faf5f72d9cce59bdb4f72e025f1")
 .add("s","0x74de9cbe26c3c10d60534d97ca90c04ebfcfc62858456fdf70f7743d5dd6b78e")
 .add("notary","0x2e988a386a799f506693793c6a5af6b54dfaabfb")
 .add("newOwner",Ethereum Account)
 .add("asset",AssetTxHash)
 .add("request","transfer")
 .build();
 */
app.post('/Corda2RelayerResponse',function (req,res) {
    console.log("[Corda]\n==================================================================================")
    writeToLog("[Corda]\n==================================================================================")
    let requestType = req.body.request
    // transfer 1, exchange 2
    let requestTypeInt = 1
    if(requestType === "transfer"){
        console.log("C->E transfer response")
        writeToLog("C->E transfer response")
        requestTypeInt = 1
    }else if (requestType === "exchange") {
        requestTypeInt = 2
    }else if (requestType === "encumbrance") {
        requestTypeInt = 3
    }else{
        //do nothing
    }
    ltx = req.body.ltx
    let msgHash = req.body.msg
    console.log("msgHash: "+msgHash)
    writeToLog("msgHash: "+msgHash)
    let v = req.body.v
    let r = req.body.r
    let s = req.body.s
    console.log("Signature:[\nv: "+ v + ",\nr: "+ r + ",\ns: "+s+"\n]")
    writeToLog("Signature:[\nv: "+ v + ",\nr: "+ r + ",\ns: "+s+"\n]")
    let notary = req.body.notary
    // let newOwner = req.body.newOwner
    // let newOwner = AliceETH
    let value = req.body.value
    let assetIndex = req.body.assetIndex
    let exchangeRltInt = 0
    if (requestTypeInt === 1){
        console.log("Ethereum(old) owner: AliceETH")
        writeToLog("Ethereum(old) owner: AliceETH")
        console.log("Corda(new) owner: BobCORDA")
        writeToLog("Corda(new) owner: BobCORDA")
        console.log("Eth Asset index: "+assetIndex)
        writeToLog("Eth Asset index: "+assetIndex)
        console.log("Eth Asset value: "+value)
        writeToLog("Eth Asset value: "+value)
    }
    else if (requestTypeInt === 2) {
        console.log("Eth Asset index: "+assetIndex)
        writeToLog("Eth Asset index: "+assetIndex)
        if (value === "success"){
            console.log("This is an exchange success response to ETH.")
            writeToLog("This is an exchange success response to ETH.")
        }
        else{
            exchangeRltInt = 1 // rollback
            console.log("This is a rollback response to ETH.")
            writeToLog("This is a rollback response to ETH.")
        }
    }
    else if(requestTypeInt === 3){
        console.log("This is an encumbrance response to ETH: ")
        writeToLog("This is an encumbrance response to ETH: ")
        if (value === "true" || value === true){
            exchangeRltInt = 0
            console.log("Loan contract with land ID: "+ assetIndex + " is pay-off.")
            writeToLog("Loan contract with land ID: "+ assetIndex + " is pay-off.")
        }else{
            exchangeRltInt = 1
            console.log("Loan contract with land ID: "+ assetIndex + " is not pay-off")
            writeToLog("Loan contract with land ID: "+ assetIndex + " is not pay-off")
        }

    }
    else{
        //do nothing
    }
    res.send("Corda2Relayer success!")

    ResponseValidationOnEth(msgHash,v,r,s,notary,assetIndex,requestTypeInt,exchangeRltInt).then(function(rlt){
        // console.log("Valid signature!")
        console.log("==================================================================================")
        writeToLog("==================================================================================")
    })
})

async function updateEthBlocksToCorda(blocks){
    let input = blocks
    if (input === null){
        console.log("UpdateEthBlock input is empty.")
        writeToLog("[Relayer]UpdateEthBlock input is empty.")
        return
    }
    braid.flows.UpdateEthBlock(blocks).then(
        result => {
            console.log("[Relayer] Send blocks to Corda Success! Current height: "+result)
            writeToLog("[Relayer] Send blocks to Corda Success! Current height: "+result)
        },err => {
            console.log("[Relayer] Error on UpdateEthBlock: "+err)
            writeToLog("[Relayer] Error on UpdateEthBlock: "+err)
        })
}


// Buffer convert file to object, and avoid double read.
// Resolved save blocks that are sended to Corda. Avoid double send.
let blockBuffer = [],blockResolved = []
async function freadEthBlocks(){
    let fs = require('fs')
    let filePath = 'relayer-server/routes/Blocks_Info.json';
    let file
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){
            if (err instanceof Error){
                console.log("[ERR] Error on readfile: "+ err.code + "\n")
                writeToLog("[ERR] Error on readfile: "+ err.code + "\n")
            }
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


// Buffer convert file to object, and avoid double read. Non-poped.
// Resolved save TXs that are sended to Corda. Avoid double send. Non-poped.
let requestTXBuffer = [],assetTXBuffer = []
let requestTXResolved = [],assetTXResolved = []
let requestTXReceiptBuffer = [], assetTXReceiptBuffer = []
let requestTXReceiptResolved = [], assetTXReceiptResolved = []
let requestTXForAction = [] // copy 0, transfer 1, exchange 2
let responseTXBuffer = [],responseTXReceiptBuffer = []
let responseTXResolved = [],responseTXReceiptResolved = []
let responseTXForAction = [] // transfer 1


function convertJSONFileToRequestTXBufferListWithFilePath(filePath,action) {
    fs.readFile(filePath, "utf8", function (err, data) {
        if (err) {// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile = file.substring(file.indexOf("["), file.lastIndexOf("]") + 1)
        let requests = JSON.parse(fixedFile)
        for (let i = 0; i < requests.length; i++) {
            // console.log("requestTX "+i+": "+requests[String(i)]['hash'])
            if (requestTXBuffer.length === 0) {
                requestTXBuffer.push(requests[String(i)])
                requestTXForAction.push(action)
            } else {
                let length = requestTXBuffer.length
                for (let j = 0; j < length; j++) {
                    if (requestTXBuffer[String(j)]['hash'] === requests[String(i)]['hash']) {
                        break
                    }
                    if (j === requestTXBuffer.length - 1) {
                        requestTXBuffer.push(requests[String(i)])
                        requestTXForAction.push(action)
                    }
                }
            }
        }
    })
}

function convertJSONFileToAssetTXBufferListWithFilePath(filePath) {
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile2 = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
        let assets = JSON.parse(fixedFile2)
        for (let i=0;i<assets.length;i++){
            // console.log("assetTX "+i+": "+assets[String(i)]['hash'])
            if (assetTXBuffer.length === 0){
                assetTXBuffer.push(assets[String(i)])
            } else{
                let length = assetTXBuffer.length
                for (let j=0;j<length;j++){
                    if (assetTXBuffer[String(j)]['hash'] === assets[String(i)]['hash']){
                        break
                    }
                    if (j === assetTXBuffer.length-1){
                        assetTXBuffer.push(assets[String(i)])
                    }
                }
            }

        }
    })
}

function convertJSONFileToRequestTXReceiptBufferListWithFilePath(filePath) {
    fs.readFile(filePath, "utf8", function (err, data) {
        if (err) {// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile = file.substring(file.indexOf("["), file.lastIndexOf("]") + 1)
        let requests = JSON.parse(fixedFile)
        for (let i = 0; i < requests.length; i++) {
            if (requestTXReceiptBuffer.length === 0) {
                requestTXReceiptBuffer.push(requests[String(i)])
            } else {
                let length = requestTXReceiptBuffer.length
                for (let j = 0; j < length; j++) {
                    if (requestTXReceiptBuffer[String(j)]['transactionHash'] === requests[String(i)]['transactionHash']) {
                        break
                    }
                    if (j === requestTXReceiptBuffer.length - 1) {
                        requestTXReceiptBuffer.push(requests[String(i)])
                    }
                }
            }
        }
    })
}

function convertJSONFileToAssetTXReceiptBufferListWithFilePath(filePath) {
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile2 = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
        let assets = JSON.parse(fixedFile2)
        for (let i=0;i<assets.length;i++){
            // console.log("assetTX "+i+": "+assets[String(i)]['hash'])
            if (assetTXReceiptBuffer.length === 0){
                assetTXReceiptBuffer.push(assets[String(i)])
            } else{
                let length = assetTXReceiptBuffer.length
                for (let j=0;j<length;j++){
                    if (assetTXReceiptBuffer[String(j)]['transactionHash'] === assets[String(i)]['transactionHash']){
                        break
                    }
                    if (j === assetTXReceiptBuffer.length-1){
                        assetTXReceiptBuffer.push(assets[String(i)])
                    }
                }
            }
        }
    })
}

function convertJSONFileToResponseTXBufferListWithFilePath(filePath,action) {
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile2 = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
        let assets = JSON.parse(fixedFile2)
        for (let i=0;i<assets.length;i++){
            // console.log("assetTX "+i+": "+assets[String(i)]['hash'])
            if (responseTXBuffer.length === 0){
                responseTXBuffer.push(assets[String(i)])
                responseTXForAction.push(action)
            } else{
                let length = responseTXBuffer.length
                for (let j=0;j<length;j++){
                    if (responseTXBuffer[String(j)]['hash'] === assets[String(i)]['hash']){
                        break
                    }
                    if (j === responseTXBuffer.length-1){
                        responseTXBuffer.push(assets[String(i)])
                        responseTXForAction.push(action)
                    }
                }
            }

        }
    })
}

function convertJSONFileToResponseTXReceiptBufferListWithFilePath(filePath) {
    fs.readFile(filePath,"utf8",function (err,data) {
        if (err){// no request
            // console.log(err)
            return
        }
        let file = data
        let fixedFile2 = file.substring(file.indexOf("["),file.lastIndexOf("]")+1)
        let assets = JSON.parse(fixedFile2)
        for (let i=0;i<assets.length;i++){
            if (responseTXReceiptBuffer.length === 0){
                responseTXReceiptBuffer.push(assets[String(i)])
            } else{
                // console.log("assetTX "+i+": "+assets[String(i)]['transactionHash'])
                let length = responseTXReceiptBuffer.length
                for (let j=0;j<length;j++){
                    if (responseTXReceiptBuffer[String(j)]['transactionHash'] === assets[String(i)]['transactionHash']){
                        break
                    }
                    if (j === responseTXReceiptBuffer.length-1){
                        responseTXReceiptBuffer.push(assets[String(i)])
                    }
                }
            }
        }
    })
}

//FilerRead Ethereum request and response.
async function freadEthTXs(){
    // 1. convert file to requestTXBuffer list
    let filePath = 'relayer-server/routes/CopyRequestTxs.json'
    convertJSONFileToRequestTXBufferListWithFilePath(filePath,0)

    filePath = 'relayer-server/routes/TransferRequestTxs.json'
    convertJSONFileToRequestTXBufferListWithFilePath(filePath,1)

    filePath = 'relayer-server/routes/ExchangeRequestTxs.json'
    convertJSONFileToRequestTXBufferListWithFilePath(filePath,2)



    // 2. convert file to assetTXBuffer list
    filePath = 'relayer-server/routes/Health_Certificate.json'
    convertJSONFileToAssetTXBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/Car_Certificate.json'
    convertJSONFileToAssetTXBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/US_Certificate.json'
    convertJSONFileToAssetTXBufferListWithFilePath(filePath)


    // 3. convert file to requestTXReceiptBuffer list
    filePath = 'relayer-server/routes/CopyReceipt.json'
    convertJSONFileToRequestTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/TransferReceipt.json'
    convertJSONFileToRequestTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/ExchangeReceipt.json'
    convertJSONFileToRequestTXReceiptBufferListWithFilePath(filePath)


    // 4. convert file to assetTXReceiptBuffer list
    filePath = 'relayer-server/routes/Health_Receipt.json'
    convertJSONFileToAssetTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/Car_Receipt.json'
    convertJSONFileToAssetTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/US_Receipt.json'
    convertJSONFileToAssetTXReceiptBufferListWithFilePath(filePath)


    // 5. convert file to response list
    filePath = 'relayer-server/routes/transferRes.json'
    convertJSONFileToResponseTXBufferListWithFilePath(filePath,1)

    filePath = 'relayer-server/routes/transferRes_Receipt.json'
    convertJSONFileToResponseTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/asking_Certificate.json'
    convertJSONFileToResponseTXBufferListWithFilePath(filePath,3)

    filePath = 'relayer-server/routes/asking_Receipt.json'
    convertJSONFileToResponseTXReceiptBufferListWithFilePath(filePath)

    filePath = 'relayer-server/routes/landValue.json'
    convertJSONFileToResponseTXBufferListWithFilePath(filePath,2)

    filePath = 'relayer-server/routes/landValue_Receipt.json'
    convertJSONFileToResponseTXReceiptBufferListWithFilePath(filePath)




    // console.log("[DEBUG] requestTXReceiptBuffer length: "+ requestTXReceiptBuffer.length)
    // console.log("[DEBUG] assetTXBuffer length: "+ assetTXBuffer.length)
    // console.log("[DEBUG] assetTXReceiptBuffer length: "+ assetTXReceiptBuffer.length)

    //6. if requestTX has not sended, send to Corda
    for (let i=0;i<requestTXBuffer.length;i++){
        // console.log("[DEBUG] i: "+ i)
        // console.log("[DEBUG] requestTXBuffer: "+requestTXBuffer[String(i)]['hash'])
        // console.log("[DEBUG] requestTXResolved:" + requestTXHashHasResolved(requestTXBuffer[String(i)]['hash']))
        if (!requestTXHashHasResolved(requestTXBuffer[String(i)]['hash'])){
            for (let j=0;j<assetTXBuffer.length;j++){
                if (requestTXBuffer[String(i)]['AssetTx'] === assetTXBuffer[String(j)]['hash']) {
                    // console.log("[DEBUG] 1")
                    for (let k=0;k<requestTXReceiptBuffer.length;k++){
                        if (requestTXBuffer[String(i)]['hash'] === requestTXReceiptBuffer[String(k)]['transactionHash']){
                            // console.log("[DEBUG] 2")
                            for (let l=0;l<assetTXReceiptBuffer.length;l++){
                                // console.log("[DEBUG] L: "+requestTXBuffer[String(i)]['AssetTx'])
                                // console.log("[DEBUG] R: "+assetTXReceiptBuffer[String(l)]['transactionHash'])
                                if(requestTXBuffer[String(i)]['AssetTx'] === assetTXReceiptBuffer[String(l)]['transactionHash']){
                                    //console.log("[DEBUG] request ["+requestTXBuffer[String(i)]['hash']+"] that send to Corda match !!")
                                    if (blockNumber - CANONICAL_CHAIN_LENGTH > requestTXBuffer[String(i)]['blockNumber']){
                                        console.log("[Relayer] Send request ["+requestTXBuffer[String(i)]['hash']+"] to Corda.")
                                        let fixedFile = JSON.stringify(requestTXBuffer[String(i)])
                                        let fixedFile2 = JSON.stringify(assetTXBuffer[String(j)])
                                        let fixedFile3 = JSON.stringify(requestTXReceiptBuffer[String(k)])
                                        let fixedFile4 = JSON.stringify(assetTXReceiptBuffer[String(l)])
                                        requestTXResolved.push(requestTXBuffer[String(i)]['hash'])
                                        //assetTXResolved.push(assetTXBuffer[String(j)])
                                        //requestTXReceiptResolved.push(requestTXReceiptBuffer[String(k)])
                                        //assetTXReceiptResolved.push(assetTXReceiptBuffer[String(l)])
                                        let action = requestTXForAction[i]
                                        updateEthTXToCorda(fixedFile,fixedFile2,fixedFile3,fixedFile4,action).then(rlt=>{})
                                    }

                                }
                            }
                        }
                    }
                }
            }
        }
    }

//7. if responseTX has not sended, send to Corda
//     for (let z = 0;z<responseTXBuffer.length;z++){
//         console.log("[DEBUG] TX "+z+": "+responseTXBuffer[String(z)]['hash'])
//     }
//     for (let z = 0;z<responseTXReceiptBuffer.length;z++){
//         console.log("[DEBUG] RE "+z+": "+responseTXBuffer[String(z)]['hash'])
//     }
    for (let i=0;i<responseTXBuffer.length;i++){
        if (!responseTXHashHasResolved(responseTXBuffer[String(i)]['hash'])){
            for (let j=0;j<responseTXReceiptBuffer.length;j++){
                if (responseTXBuffer[String(i)]['hash'] === responseTXReceiptBuffer[String(j)]['transactionHash']) {
                    if (blockNumber - CANONICAL_CHAIN_LENGTH > responseTXBuffer[String(i)]['blockNumber']){
                        console.log("[Relayer] Send response ["+responseTXBuffer[String(i)]['hash']+"] to Corda.")
                        let fixedFile = JSON.stringify(responseTXBuffer[String(i)])
                        let fixedFile2 = JSON.stringify(responseTXReceiptBuffer[String(j)])
                        responseTXResolved.push(responseTXBuffer[String(i)]['hash'])
                        //responseTXReceiptResolved.push(responseTXReceiptBuffer[String(j)])
                        let action = responseTXForAction[i]
                        updateEthTXToCorda(fixedFile,null,fixedFile2,null,action).then(rlt=>{})
                    }
                }
            }
        }
    }
}


// check requestTX in requestTXResolved
function requestTXHashHasResolved(hash){
    for (let k=0;k<requestTXResolved.length;k++){
        if (hash === requestTXResolved[String(k)]){
            // console.log("request has sended.")
            return true
        }
        if (k===requestTXResolved.length-1){
            return false
        }
    }
    return false
}

// check responseTX in requestTXResolved
function responseTXHashHasResolved(hash){
    for (let k=0;k<responseTXResolved.length;k++){
        if (hash === responseTXResolved[String(k)]){
            // console.log("response has sended.")
            return true
        }
        if (k===responseTXResolved.length-1){
            return false
        }
    }
    return false
}

async function updateEthTXToCorda(requestTx,assetTx,requestTXReceipt,assetTXReceipt,action){
    let input = requestTx
    let input2 = assetTx
    let input3 = requestTXReceipt
    let input4 = assetTXReceipt
    let input5 = action
    if (input === null || input3 === null || input5 < 0){
        return "UpdateEthTX inputs is empty."
    }
    braid.flows.UpdateEthTX(input,input2,input3,input4,input5).then(
        result => {
            console.log("[Corda]"+result)
            writeToLog("[Corda]"+result)
        },err => {
            console.log("[Relayer] Error on UpdateEthTX: "+err)
            writeToLog("[Relayer] Error on UpdateEthTX: "+err)
        })
}

setInterval(freadEthBlocks,2000)
setInterval(freadEthTXs,2000)


app.post('/time', (req, res) => {
    console.log("[Timer] Notify Corda time: "+req.body.time)
    res.send("ok")
    braid.flows.checkTime(parseInt(req.body.time)).then(
        result => {
            // console.log(result)
            // let rlt = result
            // if (rlt.length === 0){
            //     rlt = "No change in Corda."
            // }
            // res.send(rlt)
        },err => {
            // res.status(500)
            // res.send(rlt)
        })
});

module.exports = router;
