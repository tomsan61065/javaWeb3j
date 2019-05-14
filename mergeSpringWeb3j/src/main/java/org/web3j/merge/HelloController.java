package org.web3j.merge;

//spring boot
//import org.springframework.web.bind.annotation.RestController;
//import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

//web3j
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.merge.contracts.generated.Greeter;
import org.web3j.tx.Transfer;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.utils.Convert;
import org.web3j.utils.Numeric;

import org.web3j.merge.contracts.generated.RequestList;
import org.web3j.merge.contracts.generated.AssetList;

import org.web3j.merge.MemberAccount; //引入自定義結構 MemberAccount
import org.springframework.beans.factory.annotation.Autowired; //使用 @Autowired

//引入 contract instance (abi?)
import org.web3j.merge.contracts.generated.AssetList;
import org.web3j.merge.contracts.generated.RequestList;
import org.web3j.merge.contracts.generated.TxValidation;
/**
 * A simple web3j application that demonstrates a number of core features of web3j:
 *
 * <ol>
 *     <li>Connecting to a node on the Ethereum network</li>
 *     <li>Loading an Ethereum wallet file</li>
 *     <li>Sending Ether from one address to another</li>
 *     <li>Deploying a smart contract to the network</li>
 *     <li>Reading a value from the deployed smart contract</li>
 *     <li>Updating a value in the deployed smart contract</li>
 *     <li>Viewing an event logged by the smart contract</li>
 * </ol>
 *
 * <p>To run this demo, you will need to provide:
 *
 * <ol>
 *     <li>Ethereum client (or node) endpoint. The simplest thing to do is
 *     <a href="https://infura.io/register.html">request a free access token from Infura</a></li>
 *     <li>A wallet file. This can be generated using the web3j
 *     <a href="https://docs.web3j.io/command_line.html">command line tools</a></li>
 *     <li>Some Ether. This can be requested from the
 *     <a href="https://www.rinkeby.io/#faucet">Rinkeby Faucet</a></li>
 * </ol>
 *
 * <p>For further background information, refer to the project README.
 */
//https://github.com/web3j/web3j
@Controller //MVC
public class HelloController {
    String ethereumUri = "http://140.119.101.130:7575";

    private Web3j web3j = Web3j.build(new HttpService());  // for local host
    private static final Logger log = LoggerFactory.getLogger(Application.class);

    String NotaryAgent = "0x76ac34807210d52fcbfc0412cf4da5c672214752";

/*  //web3j 建構 smartcontract 的 instance:
    YourSmartContract contract = YourSmartContract.load(
        "0x<address>|<ensName>", <web3j>, <credentials>, GAS_PRICE, GAS_LIMIT);

    let AssetList_ABI = require("../../Contract/AssetList_ABI.js");
    let AssetList_Address = "0x0bfd6d60bdadbbd3dfed87afbe505761708973c4";
    let AssetList = new web3.eth.Contract(AssetList_ABI, AssetList_Address);

    String AssetList_Address = "0x0bfd6d60bdadbbd3dfed87afbe505761708973c4";
    AssetList assetListContract = AssetList.load(AssetList_Address, web3j, credentials, GAS_PRICE, GAS_LIMIT);*/

    public static final String AliceETH = "0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2";
    public static final String BobETH = "0xbe36543da0bc51f31cd3f915088d5d704572d047";


    @RequestMapping("/")
    public String index() throws Exception{

        /*
        log.info("Connected to Ethereum client version: "
                + web3j.web3ClientVersion().send().getWeb3ClientVersion());

        // We then need to load our Ethereum wallet file
        // FIXME: Generate a new wallet file using the web3j command line tools https://docs.web3j.io/command_line.html
        Credentials credentials =
                WalletUtils.loadCredentials(
                        "<password>",
                        "/path/to/<walletfile>");
        //要連接 ganache 就沒有 wallet，直接給 privateKey
        Credentials credentials = Credentials.create("0x3a2b91d1cc8da46bfbf03f8b92aebbbbac452243195e0c4511bd48dd3a8c0648");
        log.info("Credentials loaded");

        // FIXME: Request some Ether for the Rinkeby test network at https://www.rinkeby.io/#faucet
        log.info("Sending 1 Wei ("
                + Convert.fromWei("1", Convert.Unit.ETHER).toPlainString() + " Ether)");
        TransactionReceipt transferReceipt = Transfer.sendFunds(
                web3j, credentials,
                "0x19e03255f667bdfd50a32722df860b1eeaf4d635",  // you can put any address here
                BigDecimal.ONE, Convert.Unit.WEI)  // 1 wei = 10^-18 Ether
                .send();
        log.info("Transaction complete, view it at https://rinkeby.etherscan.io/tx/"
                + transferReceipt.getTransactionHash());

        // Now lets deploy a smart contract
        log.info("Deploying smart contract");
        ContractGasProvider contractGasProvider = new DefaultGasProvider();
        Greeter contract = Greeter.deploy(
                web3j,
                credentials,
                contractGasProvider,
                "test"
        ).send();

        String contractAddress = contract.getContractAddress();
        log.info("Smart contract deployed to address " + contractAddress);
        //   log.info("View contract at https://rinkeby.etherscan.io/address/" + contractAddress);

        log.info("Value stored in remote smart contract: " + contract.greet().send());

        // Lets modify the value in our smart contract
        TransactionReceipt transactionReceipt = contract.newGreeting("Well hello again").send();

        log.info("New value stored in remote smart contract: " + contract.greet().send());

        // Events enable us to log specific events happening during the execution of our smart
        // contract to the blockchain. Index events cannot be logged in their entirety.
        // For Strings and arrays, the hash of values is provided, not the original value.
        // For further information, refer to https://docs.web3j.io/filters.html#filters-and-events
        for (Greeter.ModifiedEventResponse event : contract.getModifiedEvents(transactionReceipt)) {
            log.info("Modify event fired, previous value: " + event.oldGreeting
                    + ", new value: " + event.newGreeting);
            log.info("Indexed event previous value: " + Numeric.toHexString(event.oldGreetingIdx)
                    + ", new value: " + Numeric.toHexString(event.newGreetingIdx));
        }*/


        return "Home.html";
    }
 
 //   @Autowired
 //   MemberAccount memberAccount;


    @RequestMapping("/memberApi/memberTest")
    public MemberAccount memberTest(){
        MemberAccount MA = new MemberAccount();
        MA.setAddress("taipei city");
        MA.setCellphone("09123456789");
        MA.setEmail("test@gmail.com");
        MA.setId(1);
        MA.setPassword("123456789");
        return MA;
    }

    @RequestMapping("/copy")
    @ResponseBody //等於告訴 spring 別從 view 找 name (別找對應的 html，單純回傳字串)
    public String copy() throws Exception{
        // FIXME: Generate a new wallet file using the web3j command line tools https://docs.web3j.io/command_line.html
     /*   Credentials credentials =
                WalletUtils.loadCredentials(
                        "<password>",
                        "/path/to/<walletfile>");*/
        //要連接 ganache 就沒有 wallet，直接給 privateKey
    //    Credentials credentials = Credentials.create("0x3a2b91d1cc8da46bfbf03f8b92aebbbbac452243195e0c4511bd48dd3a8c0648");
    //    log.info("Credentials loaded");
        return "123";
    }
}
