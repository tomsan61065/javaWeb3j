/* <--------------------------------------------------------------------------------------------------> */
/* <--------------------------------------Ethereum Setting--------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
const Web3 = require('web3');
const ethereumUri = 'http://140.119.164.28:8000';
// const ethereumUri = 'http://127.0.0.1:7575';
// let web3 = new Web3(new Web3.providers.HttpProvider(ethereumUri));
let web3 = new Web3(new Web3.providers.WebsocketProvider(ethereumUri));

let timeAgent = '0x3073748d415cbbbb0a19c3cbe5d9f86a98eb82b0';
// let timeAgent = '0x84148B8D1071672F12305D1234295780A7737ad5';

let RequestList_ABI = require("../../Contract/RequestList_ABI.js");
let RequestList_Address = '0x6334cc4880cef679efe7dd6290c155220ebfc54b';
// let RequestList_Address = '0x5438820385124f8ef0562b538fc4d289910e48a8';
var RequestList = new web3.eth.Contract(RequestList_ABI, RequestList_Address);
let request = require('request');

let time = 120

/* <--------------------------------------------------------------------------------------------------> */
/* <--------------------------------------Time Oracle-------------------------------------------------> */
/* <--------------------------------------------------------------------------------------------------> */
RequestList.methods.checkEncumbranceTimeOut(time).send({from: timeAgent, gas: 6721974})
.then(function (receipt) {
    console.log(receipt);
})
request.post(
    'http://localhost:2998/time',
    { json: { time: time } },
    function (error, response, body) {
        if (!error && response.statusCode === 200) {
            console.log("Corda request body: "+body)
            console.log("Corda response: ")
            console.log(response.body)
        }
    }
)
request.post(
    'http://localhost:2999/time',
    { json: { time: time } },
    function (error, response, body) {
        if (!error && response.statusCode === 200) {
            console.log("Corda request body: "+body)
            console.log("Corda response: ")
            console.log(response.body)
        }
    }
)