package org.web3j.merge;

import java.util.*;
import java.math.BigInteger;
import java.math.BigDecimal;
import java.net.*;
import java.io.*;
import java.io.File;

//spring boot
//import org.springframework.web.bind.annotation.RestController;
//import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.stream.Collectors;

//jackson
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;


//web3j
import org.web3j.crypto.Credentials;
import org.web3j.protocol.core.methods.response.Transaction;
import org.web3j.tuples.Tuple;
import org.web3j.tuples.generated.Tuple3;
import org.web3j.tuples.generated.Tuple4;
import org.web3j.tx.Transfer;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.ClientTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.utils.Convert;
import org.web3j.utils.Numeric;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.Web3jService;
import org.web3j.protocol.http.HttpService;
import org.web3j.protocol.websocket.*;
import org.web3j.protocol.websocket.WebSocketClient;
import org.web3j.protocol.websocket.WebSocketListener;
import org.web3j.protocol.websocket.WebSocketService;
import org.web3j.protocol.http.HttpService;
import org.web3j.protocol.admin.*;
import org.web3j.protocol.admin.methods.response.PersonalUnlockAccount;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.request.*;
import org.web3j.protocol.core.methods.response.*;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.core.methods.response.EthEstimateGas;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.DefaultBlockParameterNumber;


import org.web3j.merge.MemberAccount; //引入自定義結構 MemberAccount
import org.springframework.beans.factory.annotation.Autowired; //使用 @Autowired

//引入 contract instance (abi?)
import org.web3j.merge.contracts.generated.Greeter;
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

    private static URI parseURI(String serverUrl){
        try{
            return new URI(serverUrl);
        }catch(URISyntaxException e){
            //handle exception
            return null;
        }
    }

    //String ethereumUri = "ws://140.119.101.130:7576";
    String ethereumUri = "ws://127.0.0.1:8545";

    // websocket 寫法
    //https://web3j.readthedocs.io/en/latest/getting_started.html#publish-subscribe-pub-sub
    //final WebSocketClient webSocketClient = new WebSocketClient(new URI(ethereumUri));
    final WebSocketClient webSocketClient = new WebSocketClient(parseURI(ethereumUri));
    final boolean includeRawResponses = false;
    final WebSocketService webSocketService = new WebSocketService(webSocketClient, includeRawResponses);

    //private Web3j web3j = Web3j.build(new HttpService());  // for local host
    //Admin web3jAdmin = Admin.build(new HttpService()); //https://docs.web3j.io/management_apis.html
    final Web3j web3j = Web3j.build(webSocketService);
    final Admin web3jAdmin = Admin.build(webSocketService);

    //load contract without credantials
    //https://github.com/web3j/web3j/blob/master/core/src/main/java/org/web3j/ens/EnsResolver.java 
    private final TransactionManager transactionManager = new ClientTransactionManager(web3j, null);  // don't use empty string

    private static final Logger log = LoggerFactory.getLogger(Application.class);

    String NotaryAgent = "0x76ac34807210d52fcbfc0412cf4da5c672214752";

/*  //web3j 建構 smartcontract 的 instance:
    YourSmartContract contract = YourSmartContract.load(
        "0x<address>|<ensName>", <web3j>, <credentials>, GAS_PRICE, GAS_LIMIT);

    //不用 credentials 的建構方式
    ENS ensRegistry = ENS.load(
        registryContract, web3j, transactionManager,
        DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT);
    */

    String AssetList_Address = "0xa53b0304ed2ac49e4bf83f28da15c62328476d85";
    AssetList AssetListContract = AssetList.load(
        AssetList_Address, web3j, transactionManager, DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT);

    String RequestList_Address = "0xcc1a47bf74df0752f8647baf3e6d1ecc3ff080ba";
    RequestList RequestListContract = RequestList.load(
        RequestList_Address, web3j, transactionManager, DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT);
        
    String Validation_Address = "0x8b61b25cbe9cb200e325db75a067d797a586b03d";
    TxValidation ValidationContract = TxValidation.load(
        Validation_Address, web3j, transactionManager, DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT);

    public static final String AliceETH = "0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2";
    public static final String BobETH = "0xbe36543da0bc51f31cd3f915088d5d704572d047";
    /* <--------------------------------------------------------------------------------------------------> */
    /* <---------------------------------------Validation Setting-----------------------------------------> */
    /* <--------------------------------------------------------------------------------------------------> */
    public static final String notary = "0xe6a31739cdda7a55ab7a1a62b719279c7c144df6";
    public static final String msgHash = "0xafecccaa184461341805019494d1d706dbdc4a89";

    /* <--------------------------------------------------------------------------------------------------> */
    /* <--------------------------------------Ethereum WebSite--------------------------------------------> */
    /* <--------------------------------------------------------------------------------------------------> */
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
 



    //============================================
    //=========== Test web3j function ============
    //============================================
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

    public static class Copy{ 
        //要 static inner class
        // https://stackoverflow.com/questions/45586802/json-parse-error-can-not-construct-instance-of-class
        public String object;
        public int score;
        public String Eth;
        public String Corda;
        //public Copy(){}
        /*public Copy(String object, int score){
            this.object = object;
            this.score = score;
        }*/
    }

    public class testCopyRequestTx{ // 這個就是 web3j 內建的 TransactionReceipt 內容惹
        public String blockHash;
        public String blockNumber;
        public String from;
        public String gas; 
        public String gasPrice; 
        public String hash; 
        public String input;
        public String nonce; 
        public String to; 
        public String tansactionIndex;  
        public String value; 
        public String v; 
        public String r; 
        public String s;
        public String Sender = "0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2";
        public String Receiver = "BobCORDA";
        public String AssetTx = hash;
        
        /*public CopyRequestTx(String object, int score){
            this.object = object;
            this.score = score;
        }*/

    }

    String ganacheAddress = "0x01899e465f698760dcaa4e476524c6948ac6a02f"; //每次重開 ganache 都要改成上面存在的 address
    @RequestMapping("/deploy")
    @ResponseBody
    public String deployContract() throws Exception{
        webSocketService.connect(); //這樣才會連接上 enode
        TransactionManager transactionManager2 = new ClientTransactionManager(web3j, ganacheAddress);//transaction manager
        //testListenEvent();

        //要用 unlock 的方式作法 https://web3j.readthedocs.io/en/latest/transactions.html#transaction-signing-via-an-ethereum-client
        //官方 example https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/DeployContractIT.java
        PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(ganacheAddress, "1234", BigInteger.valueOf(500) ).send();
        if (personalUnlockAccount.accountUnlocked()) {
            // send a transaction

            ContractGasProvider contractGasProvider = new DefaultGasProvider();
            Greeter contract = Greeter.deploy(
                web3jAdmin,
                transactionManager2,
                contractGasProvider,
                "test"
            ).send();
        
            String contractAddress = contract.getContractAddress();
            log.info("Smart contract deployed to address " + contractAddress);
            //   log.info("View contract at https://rinkeby.etherscan.io/address/" + contractAddress);
        }
        return "true";
    }

    String contractAddress = "0x27fd8de1bd7b51079e7f3be5ee107eba8eb344c6"; //要手動更新 deploy 後的 contract address
    @RequestMapping("/listenEvent")
    @ResponseBody
    public String testlistenEvent() throws Exception{
        
        testListenEvent();
        return "true";
    }

    void testListenEvent() throws Exception{
        webSocketService.connect(); //這樣才會連接上 enode
        
        //官方文件 https://web3j.readthedocs.io/en/latest/filters.html#topic-filters-and-evm-events
        //官方範例 https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
        //範例合約 https://github.com/web3j/web3j/blob/master/codegen/src/test/resources/solidity/fibonacci/Fibonacci.sol
        //別人範例 https://blog.csdn.net/liuzhijun301/article/details/80240437
        //範例與問題 https://ethereum.stackexchange.com/questions/51958/subscribing-to-event-using-web3j
        EthFilter filter = new EthFilter(DefaultBlockParameterName.LATEST, DefaultBlockParameterName.LATEST, contractAddress.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(Greeter.MODIFIED_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            log.info("event string= " + eventString.toString());
            log.info(eventString.getTransactionHash());
            log.info(eventString.getData());


            // To-Notice: toString 無法同時顯示 indexed 與 non-indexed 的參數，看範例可能是 type 不同的關係
            List<Type> results = FunctionReturnDecoder.decode(
                    eventString.getData(), Greeter.MODIFIED_EVENT.getParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[relayer] get copy event");
            log.info(results.toString());

            List<Type> results2 = FunctionReturnDecoder.decode(
                    eventString.getData(), Greeter.MODIFIED_EVENT.getNonIndexedParameters());
            log.info(results2.toString());

            List<Type> results3 = FunctionReturnDecoder.decode(
                    eventString.getData(), Greeter.MODIFIED_EVENT.getIndexedParameters());
            log.info( results3.toString() );


            EthTransaction transaction = web3j.ethGetTransactionByHash( eventString.getTransactionHash() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("../Health_Certificate.json"), transaction.getResult());
            }


            //https://github.com/web3j/web3j/blob/9ac2c051ad9fcb54c57b5ebf3431952bf2f64884/core/src/main/java/org/web3j/protocol/core/methods/response/EthGetTransactionReceipt.java
            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( eventString.getTransactionHash() ).send();
            //https://web3j.readthedocs.io/en/latest/transactions.html#recommended-approach-for-working-with-smart-contracts
            //文件上面是錯的...
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("../Health_Receipt.json"), transactionReceipt.getResult());
            } else {
                // try again

            }
        });
    }

    @RequestMapping("/sendEvent")
    @ResponseBody
    public String sendEvent() throws Exception{
        webSocketService.connect(); //這樣才會連接上 enode，好像只需要(也只能) call 一次
        TransactionManager transactionManager2 = new ClientTransactionManager(web3j, ganacheAddress);//transaction manager

        //要用 unlock 的方式作法 https://web3j.readthedocs.io/en/latest/transactions.html#transaction-signing-via-an-ethereum-client
        //官方 example https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/DeployContractIT.java
        PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(ganacheAddress, "1234", BigInteger.valueOf(500) ).send();
        if (personalUnlockAccount.accountUnlocked()) {
            // send a transaction
            Greeter GreeterContract = Greeter.load(
                contractAddress, web3j, transactionManager2, DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT);
        
            log.info("Value stored in remote smart contract: " + GreeterContract.greet().send());

            // Lets modify the value in our smart contract
            TransactionReceipt transactionReceipt = GreeterContract.newGreeting("Well hello again").send();
        
            log.info("New value stored in remote smart contract: " + GreeterContract.greet().send());
        }
        return "true";
    }
    

    @PostMapping("/copy2")
    @ResponseBody //等於告訴 spring 別從 view 找 name (別找對應的 html，單純回傳字串)
    public String copy(@RequestBody String object, @RequestBody int score) throws Exception{
        //@RequestParam 是給 url 放參數用

        return object + score;
    }

    //測試能否從前端接收參數
    @PostMapping("/copy3")
    @ResponseBody 
    public String copy(@RequestBody String object, Model m) throws Exception{
        //@RequestParam 是給 url 放參數用

        return object;
    }




    //============================================
    //======== start of contract function ========
    //============================================
    public void writeToLog(String data){
    //https://stackoverflow.com/questions/1625234/how-to-append-text-to-an-existing-file-in-java
        try(FileWriter fw = new FileWriter("relayer-server/routes/log.txt", true);
            BufferedWriter bw = new BufferedWriter(fw);
            PrintWriter out = new PrintWriter(bw))
        {
            out.println(data + "\n");

        } catch (IOException e) {
            //exception handling left as an exercise for the reader
        }
    }


    String healthTx = "";
    //將 request 存到 eth smartcontract
    @PostMapping("/copy")
    @ResponseBody //等於告訴 spring 別從 view 找 name (別找對應的 html，單純回傳字串)
    public String copy(String Eth, String Corda, String AssetIndex) throws Exception{//自動 mapping 變數名稱
        //@RequestParam 是給 url 放參數用
        
        
        // FIXME: Generate a new wallet file using the web3j command line tools https://docs.web3j.io/command_line.html
     /*   Credentials credentials =
                WalletUtils.loadCredentials(
                        "<password>",
                        "/path/to/<walletfile>");*/
        //要連接 ganache 就沒有 wallet，直接給 privateKey
    //    Credentials credentials = Credentials.create("0x3a2b91d1cc8da46bfbf03f8b92aebbbbac452243195e0c4511bd48dd3a8c0648");
    //    log.info("Credentials loaded");
        //log.info(_copy.object);
        log.info("ETH:" + Eth + ", Corda:" + Corda + ", AssetIndex:" + AssetIndex);
        //log.info(_copy.Eth + " " + _copy.Corda);
        //if(_copy.Eth == null && _copy.Corda == null){
        if(Eth != null && Corda != null){
            log.info("Eth&Corda null");
            String healthTx = "0x9e4a6f930d51fca5f9d8ce2df8fa79ada826457e8043612470e254e3c885c27e";
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", new BigInteger(AssetIndex) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                // send a transaction
                TransactionReceipt transactionReceipt = RequestListContract.addCopyRequest(AssetList_Address, AliceETH, "BobCORDA", BigInteger.valueOf(0) ).send();
                log.info("[user] AliceETH send a copy request"); // Dev 幹嘛多一個 + 串聯
                writeToLog("[user] AliceETH" + " send a copy request");

                TransactionReceipt transactionReceipt2 = RequestListContract.emitCopyEvent(healthTx.getBytes(), transactionReceipt.getTransactionHash().getBytes() ).send();
                log.info("[user] send 2 Transactions receipt for Copy");
                writeToLog("[relayer] send 2 Transactions receipt for Copy");

                return "Done.html";
            }
        }
        //return "Done.html";
        //return _copy.object + _copy.score;
        return "true";
    }


    public class tx{
        public String blockHash;
        public String blockNumber;
        public String from;
        public String gas;
        public String gasPrice;
        public String hash;
        public String input;
        public String nonce;
        public String to;
        public String trancsactionIndex;
        public String value;
        public String v;
        public String r;
        public String s;
    }

    public class txReceipt{
        public String status;
        public String transactionHash;
        public String transactionIndex;
        public String blockHash;
        public String blockNumber;
        public String contractAddress;
        public String cumulativeGasUsed;
        public String logs;
    }

    //Listen Request List Copy Event
    List<Transaction> Health_Certificate = new Vector<>(); 
    //https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_gettransactionbyhash
    //https://github.com/web3j/web3j/blob/9ac2c051ad9fcb54c57b5ebf3431952bf2f64884/core/src/main/java/org/web3j/protocol/core/methods/response/Transaction.java
    List<TransactionReceipt> Health_Receipt = new Vector<>();
    public class withAssetTx extends Transaction{ // 這個就是 web3j 內建的 TransactionReceipt 內容惹
        public String AssetTx;
        public withAssetTx(Transaction tx, String assetTx){
            super(tx.getHash(), tx.getNonce().toString(), tx.getBlockHash(),
                tx.getBlockNumber().toString(), tx.getTransactionIndex().toString(),
                tx.getFrom(), tx.getTo(), tx.getValue().toString(), tx.getGas().toString(),
                tx.getGasPrice().toString(), tx.getInput(), tx.getCreates(),
                tx.getPublicKey(), tx.getRaw(), tx.getR(), tx.getS(), tx.getV()
            );
            /*
                String hash, String nonce, String blockHash, String blockNumber,
                String transactionIndex, String from, String to, String value,
                String gas, String gasPrice, String input, String creates,
                String publicKey, String raw, String r, String s, long v
            */
            AssetTx = assetTx;
        }
    }
    List<withAssetTx> CopyRequestTxs = new Vector<>();
    List<TransactionReceipt> CopyReceipt = new Vector<>();

    boolean onlyTriggerOnce = false;
    void RequestListCopyEvent() throws Exception{
        if(onlyTriggerOnce == false){
            onlyTriggerOnce = true;
        }else{
            return;
        }
        webSocketService.connect();
    //官方文件 https://web3j.readthedocs.io/en/latest/filters.html#topic-filters-and-evm-events
    //官方範例 https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
    //範例合約 https://github.com/web3j/web3j/blob/master/codegen/src/test/resources/solidity/fibonacci/Fibonacci.sol
    //別人範例 https://blog.csdn.net/liuzhijun301/article/details/80240437
    //範例與問題 https://ethereum.stackexchange.com/questions/51958/subscribing-to-event-using-web3j
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, RequestList_Address.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(RequestListContract.COPY_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                eventString.getData(), RequestListContract.COPY_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[relayer] get copy event");

            //https://github.com/web3j/web3j/tree/master/core/src/main/java/org/web3j/protocol/core/methods/response (一些 eth 功能) 
            //https://github.com/web3j/web3j/search?q=ethGetTransactionByHash&unscoped_q=ethGetTransactionByHash
            //https://github.com/web3j/web3j/blob/6160282a5912ba1f35394312e6e783e040da4af3/core/src/main/java/org/web3j/protocol/core/JsonRpc2_0Web3j.java  (所有功能 all eth function )

            // 合約 Event 格式: event copy_event(bytes32 assetTx, bytes32 requestTx);
            EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                Health_Certificate.add(transaction.getResult());

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Health_Certificate.json"), Health_Certificate);

                /*
                let filePath = 'relayer-server/routes/Health_Certificate.json';
                var Health = JSON.stringify(Health_Certificate);
                fs.writeFile(filePath, Health, 'utf8', function(){
                    // console.log('New Health Asset!!!');
                });*/

            }

            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                Health_Receipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Health_Certificate.json"), Health_Receipt);
            } else {
                // try again
            }

            transaction = web3j.ethGetTransactionByHash( results.get(1).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                CopyRequestTxs.add(new withAssetTx(transaction.getResult(), results.get(0).toString()));

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/CopyRequestTxs.json"), CopyRequestTxs);
            }

            transactionReceipt = web3j.ethGetTransactionReceipt( results.get(1).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                CopyReceipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/CopyReceipt.json"), CopyReceipt);
            } else {
                // try again
            }

        });
    }

    //合約wrapper 的功能，研究中
    //RequestListContract.copy_eventEventFlowable(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST);
    
    String carTx = "";
    @PostMapping("/transfer")
    public String transfer(String Eth, String Corda, String AssetIndex) throws Exception{//自動 mapping 變數名稱
        
        log.info("ETH:" + Eth + ", Corda:" + Corda + ", AssetIndex:" + AssetIndex);
        //log.info(_copy.Eth + " " + _copy.Corda);
        //if(_copy.Eth == null && _copy.Corda == null){
        if(Eth != null && Corda != null){
            log.info("Eth&Corda null");

            //RequestList.methods.addTransferRequest(AssetList_Address, notary, req.body.Corda, req.body.AssetIndex).send({from: NotaryAgent, gas: 6721974})

            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(500) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                TransactionReceipt transactionReceipt = RequestListContract.addTransferRequest(AssetList_Address, notary, Corda, new BigInteger(AssetIndex) ).send();
                log.info("[user] AliceETH" + " send a transfer request");
                writeToLog("[user] AliceETH" + " send a transfer request");
                
                transactionReceipt = RequestListContract.emitTransferEvent(carTx.getBytes(), transactionReceipt.getTransactionHash().getBytes() ).send();
                log.info("[relayer] send 2 Transactions receipt for Transfer");
                writeToLog("[relayer] send 2 Transactions receipt for Transfer");

                return "Done.html";
            }
        }
        return "Done.html";
    }


    //Listen Request List Transfer Event
    List<Transaction> Car_Certificate = new Vector<>(); 
    List<TransactionReceipt> Car_Receipt = new Vector<>();
    List<withAssetTx> TransferRequestTxs = new Vector<>();
    List<TransactionReceipt> TransferReceipt = new Vector<>();

    void RequestListTransferEvent() throws Exception{
        webSocketService.connect();
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, RequestList_Address.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(RequestListContract.TRANSFER_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                eventString.getData(), RequestListContract.TRANSFER_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[relayer] get transfer event");

            //https://github.com/web3j/web3j/tree/master/core/src/main/java/org/web3j/protocol/core/methods/response (一些 eth 功能) 
            //https://github.com/web3j/web3j/search?q=ethGetTransactionByHash&unscoped_q=ethGetTransactionByHash
            //https://github.com/web3j/web3j/blob/6160282a5912ba1f35394312e6e783e040da4af3/core/src/main/java/org/web3j/protocol/core/JsonRpc2_0Web3j.java  (所有功能 all eth function )

            // 合約 Event 格式: event copy_event(bytes32 assetTx, bytes32 requestTx);
            EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                Car_Certificate.add(transaction.getResult());

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Car_Certificate.json"), Car_Certificate);
            }

            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                Car_Receipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Car_Receipt.json"), Car_Receipt);
            } else {
                // try again
            }

            transaction = web3j.ethGetTransactionByHash( results.get(1).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                TransferRequestTxs.add(new withAssetTx(transaction.getResult(), results.get(0).toString()));

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/TransferRequestTxs.json"), TransferRequestTxs);
            }

            transactionReceipt = web3j.ethGetTransactionReceipt( results.get(1).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                TransferReceipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/TransferReceipt.json"), TransferReceipt);
            } else {
                // try again
            }

        });
    }


    String usTx = "";
    @PostMapping("/exchange")
    public String exchange(String Eth1, String Corda1, String Eth2, String Corda2, String USIndex, String CarIndex) throws Exception{//自動 mapping 變數名稱
        if(Eth1 != null && Corda1 != null && Eth2 != null && Corda2 != null){
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(500) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                // send a transaction
                TransactionReceipt transactionReceipt = RequestListContract.addExchangeRequest(AssetList_Address, AliceETH, BobETH, new BigInteger(USIndex), CarIndex).send();
                log.info("[user] AliceETH" + " send a exchange request");
                writeToLog("[user] AliceETH" + " send a exchange request");

                TransactionReceipt transactionReceipt2 = RequestListContract.emitExchangeEvent(usTx.getBytes(), transactionReceipt.getTransactionHash().getBytes() ).send();
                log.info("[relayer] send 2 Transactions receipt for Exchange");
                writeToLog("[relayer] send 2 Transactions receipt for Exchange");

                return "Done.html";
            }
        }
        return "Done.html";
    }


    //Listen Request List Exchange Event
    List<Transaction> US_Certificate = new Vector<>(); 
    List<TransactionReceipt> US_Receipt = new Vector<>();
    List<withAssetTx> ExchangeRequestTxs = new Vector<>();
    List<TransactionReceipt> ExchangeReceipt = new Vector<>();

    void RequestListExchangeEvent() throws Exception{
        webSocketService.connect();
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, RequestList_Address.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(RequestListContract.EXCHANGE_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                eventString.getData(), RequestListContract.EXCHANGE_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[relayer] get exchange event");

            //https://github.com/web3j/web3j/tree/master/core/src/main/java/org/web3j/protocol/core/methods/response (一些 eth 功能) 
            //https://github.com/web3j/web3j/search?q=ethGetTransactionByHash&unscoped_q=ethGetTransactionByHash
            //https://github.com/web3j/web3j/blob/6160282a5912ba1f35394312e6e783e040da4af3/core/src/main/java/org/web3j/protocol/core/JsonRpc2_0Web3j.java  (所有功能 all eth function )

            // 合約 Event 格式: event copy_event(bytes32 assetTx, bytes32 requestTx);
            EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                US_Certificate.add(transaction.getResult());

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/US_Certificate.json"), US_Certificate);
            }

            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                US_Receipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/US_Receipt.json"), US_Receipt);
            } else {
                // try again
            }

            transaction = web3j.ethGetTransactionByHash( results.get(1).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                ExchangeRequestTxs.add(new withAssetTx(transaction.getResult(), results.get(0).toString()));

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/ExchangeRequestTxs.json"), ExchangeRequestTxs);
            }

            transactionReceipt = web3j.ethGetTransactionReceipt( results.get(1).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                ExchangeReceipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/ExchangeReceipt.json"), ExchangeReceipt);
            } else {
                // try again
            }

        });
    }


    void RequestListNoticeMsgEvent() throws Exception{
        webSocketService.connect();
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, RequestList_Address.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(RequestListContract.EXCHANGE_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                eventString.getData(), RequestListContract.EXCHANGE_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[user] Alice get notice message");
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(500) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                // send a transaction
                TransactionReceipt transactionReceipt = RequestListContract.askingCordaMsg(new BigInteger(results.get(0).toString()) ).send();
                TransactionReceipt transactionReceipt2 = RequestListContract.emitEncumbranceEvent(transactionReceipt.getTransactionHash().getBytes()).send();
            }
        });
    }


    List<Transaction> asking_Certificate = new Vector<>(); 
    List<TransactionReceipt> asking_Receipt = new Vector<>();

    void RequestListEncumbranceEvent()throws Exception{
        webSocketService.connect();
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, RequestList_Address.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(RequestListContract.EXCHANGE_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                eventString.getData(), RequestListContract.EXCHANGE_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            log.info("[relayer] get Alice notice event");
            writeToLog("[relayer] get Alice notice event");
            EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
            if(transaction.hasError() == false){
                log.info(transaction.toString());
                log.info(transaction.getTransaction().toString());
                log.info(transaction.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                asking_Certificate.add(transaction.getResult());

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/asking_Certificate.json"), asking_Certificate);
            }

            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //java 輸出 json 格式
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                asking_Receipt.add(transactionReceipt.getResult());

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/asking_Receipt.json"), asking_Receipt);
            } else {
                // try again
            }
        });
    }


    @PostMapping("/newAsset")
    public String newAsset() throws Exception{
        return "/views/NewAsset.html";
    }


    @PostMapping("/Newhealth")
    public String Newhealth(String owner, String asset) throws Exception{
        if(owner != null && asset != null){
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(600) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                TransactionReceipt transactionReceipt = AssetListContract.addAsset_Health(AliceETH, new BigInteger(asset) ).send();
                healthTx = transactionReceipt.getTransactionHash();
                log.info("[user] AliceETH issues a Health asset");
                writeToLog("[user] AliceETH issues a Health asset");
                return "Done.html";
            }
        }
        return "Done.html";
    }

    @PostMapping("/Newcar")
    public String Newcar(String owner, String asset) throws Exception{
        if(owner != null && asset != null){
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(600) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                TransactionReceipt transactionReceipt = AssetListContract.addAsset_Car(AliceETH, new BigInteger(asset) ).send();
                carTx = transactionReceipt.getTransactionHash();
                log.info("[user] AliceETH issues a Car asset");
                writeToLog("[user] AliceETH issues a Car asset");
                return "Done.html";
            }
        }
        return "Done.html";
    }
    
    @PostMapping("/Newus")
    public String Newus(String owner, String asset) throws Exception{
        if(owner != null && asset != null){
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(600) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                TransactionReceipt transactionReceipt = AssetListContract.addAsset_USdollar(AliceETH, new BigInteger(asset) ).send();
                usTx = transactionReceipt.getTransactionHash();
                log.info("[user] AliceETH issues a USDollar asset");
                writeToLog("[user] AliceETH issues a USDollar asset");
                return "Done.html";
            }
        }
        return "Done.html";
    }

    //https://www.baeldung.com/java-pairs
    //AbstractMap.SimpleEntry<Integer, String> entry
    //  = new AbstractMap.SimpleEntry<>(1, "one");
    //Integer key = entry.getKey();
    //String value = entry.getValue();
    private String render(String filename, List<AbstractMap.SimpleEntry<String, String>> params) throws Exception{
        String result;
        InputStream resource = new ClassPathResource("static/" + filename).getInputStream();
        try ( BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource)) ) {
            result = reader.lines().collect(Collectors.joining("\n"));
        }
        for(int i = 0; i < params.size(); i++){
            result = result.replace("{" + params.get(i).getKey() + "}", params.get(i).getValue());
        }
        return result;
    }

    //https://www.baeldung.com/spring-classpath-file-access
    //讀進檔案
    @GetMapping("/testPage")
    @ResponseBody
    public String testPage() throws Exception{
        String result;
        InputStream resource = new ClassPathResource("static/Health.html").getInputStream();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource)) ) {
            result = reader.lines().collect(Collectors.joining("\n"));
        }

        List<AbstractMap.SimpleEntry<String, String>> params = new Vector<>();
        params.add(new AbstractMap.SimpleEntry("a", "1"));
        params.add(new AbstractMap.SimpleEntry("b", "2"));
        params.add(new AbstractMap.SimpleEntry("c", "3"));

        for(int i = 0; i < params.size(); i++){
            result = result.replace("{" + params.get(i).getKey() + "}", params.get(i).getValue());
        }

        return result;
    }


    @GetMapping("/health")
    @ResponseBody
    public String health() throws Exception{
        webSocketService.connect();
        Tuple3 data = AssetListContract.queryHealthAsset().send();
        List<AbstractMap.SimpleEntry<String, String>> params = new Vector<>();
        params.add(new AbstractMap.SimpleEntry("a", data.getValue1().toString()));
        params.add(new AbstractMap.SimpleEntry("b", data.getValue2().toString()));
        params.add(new AbstractMap.SimpleEntry("c", data.getValue3().toString()));
        return render("Health.html", params);
    }

    @GetMapping("/car")
    @ResponseBody
    public String car() throws Exception{
        Tuple4 data = AssetListContract.queryCarAsset().send();
        List<AbstractMap.SimpleEntry<String, String>> params = new Vector<>();
        params.add(new AbstractMap.SimpleEntry("a", data.getValue1().toString()));
        params.add(new AbstractMap.SimpleEntry("b", data.getValue2().toString()));
        params.add(new AbstractMap.SimpleEntry("c", data.getValue3().toString()));
        params.add(new AbstractMap.SimpleEntry("d", data.getValue4().toString()));
        return render("Car.html", params);
    }

    @GetMapping("/us")
    @ResponseBody
    public String us() throws Exception{
        Tuple4 data = AssetListContract.queryUSdollarAsset().send();
        List<AbstractMap.SimpleEntry<String, String>> params = new Vector<>();
        params.add(new AbstractMap.SimpleEntry("a", data.getValue1().toString()));
        params.add(new AbstractMap.SimpleEntry("b", data.getValue2().toString()));
        params.add(new AbstractMap.SimpleEntry("c", data.getValue3().toString()));
        params.add(new AbstractMap.SimpleEntry("d", data.getValue4().toString()));
        return render("US.html", params);
    }

    @GetMapping("/land")
    @ResponseBody
    public String land() throws Exception{
        Tuple4 data = AssetListContract.queryLandAsset().send();
        List<AbstractMap.SimpleEntry<String, String>> params = new Vector<>();
        params.add(new AbstractMap.SimpleEntry("a", data.getValue1().toString()));
        params.add(new AbstractMap.SimpleEntry("b", data.getValue2().toString()));
        params.add(new AbstractMap.SimpleEntry("c", data.getValue3().toString()));
        params.add(new AbstractMap.SimpleEntry("d", data.getValue4().toString()));
        return render("Land.html", params);
    }

    /* <--------------------------------------------------------------------------------------------------> */
    /* <-------------------------------------------Ethereum-----------------------------------------------> */
    /* <--------------------------------------------------------------------------------------------------> */

    //java 檢查檔案存在與否
    //https://stackoverflow.com/questions/1816673/how-do-i-check-if-a-file-exists-in-java
    static final String blockPath = "relayer-server/routes/BlockNumber";
    BigInteger blockNumber; // To-Notice: corda 有用到這個變數

    class eblock{//https://github.com/web3j/web3j/blob/7eab3d5752fb661f58df037a11677f330b8e1117/core/src/main/java/org/web3j/protocol/core/methods/response/EthBlock.java#L59
        public String difficulty;
        public String extraData;
        public String gasLimit;
        public String gasUsed;
        public String hash; //To-Notice: 本來有兩個 hash
        public String logsBloom;
        public String miner;
        public String nonce;
        public String number;
        public String parentHash;
        public String receiptsRoot;
        public String sha3Uncles;
        public String size;
        public String stateRoot;
        public String timestamp;
        public String totalDifficulty;
        public List<EthBlock.TransactionResult> transactions; //To-Notice
        public String transactionsRoot;
        public List<String> uncles;

        public eblock(
            String difficulty,
            String extraData,
            String gasLimit,
            String gasUsed,
            String hash, //To-Notice: 本來有兩個 hash
            String logsBloom,
            String miner,
            String nonce,
            String number,
            String parentHash,
            String receiptsRoot,
            String sha3Uncles,
            String size,
            String stateRoot,
            String timestamp,
            String totalDifficulty,
            List<EthBlock.TransactionResult> transactions, //To-Notice
            String transactionsRoot,
            List<String> uncles
        ){
            this.difficulty = difficulty;
            this.extraData = extraData;
            this.gasLimit = gasLimit;
            this.gasUsed = gasUsed;
            this.hash = hash;
            this.logsBloom = logsBloom;
            this.miner = miner;
            this.nonce = nonce;
            this.number = number;
            this.parentHash = parentHash;
            this.receiptsRoot = receiptsRoot;
            this.sha3Uncles = sha3Uncles;
            this.size = size;
            this.stateRoot = stateRoot;
            this.timestamp = timestamp;
            this.totalDifficulty = totalDifficulty;
            this.transactions = transactions;
            this.transactionsRoot = transactionsRoot;
            this.uncles = uncles;
        }
    }

    List<eblock> Blocks_Info = new Vector<>();

    static final int BLOCKS_INFO_TABLE_MAX_LENGTH = 5;
    // Relayer get Blocks per 1 seconds
    @Scheduled(fixedRate = 1000)
    public void getBlocksEth() throws Exception {

        File f = new File(blockPath);
        if (f.exists() && f.isFile()) {
            BufferedReader br = new BufferedReader(new FileReader(f));
            BigInteger max = BigInteger.valueOf(0);
            String st;
            while ((st = br.readLine()) != null) {
                System.out.println(st);
                BigInteger temp = new BigInteger(st);
                if (temp.compareTo(max) == 1) {
                    max = temp;
                }
            }
            blockNumber = max;
        } else {
            EthBlockNumber blockNum = web3j.ethBlockNumber().send();
            blockNumber = blockNum.getBlockNumber();
        }

        /*
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
        });*/

        //https://github.com/web3j/web3j/search?q=ethblockNumber&unscoped_q=ethblockNumber
        EthBlockNumber num = web3j.ethBlockNumber().send();
        //BigInteger num = web3j.ethBlockNumber();
        if (blockNumber.compareTo(num.getBlockNumber()) <= 0) { //blockNumber <= num
            EthBlock block = web3j.ethGetBlockByNumber(new DefaultBlockParameterNumber(blockNumber), true).send();
            log.info("[Relayer] Get block #" + blockNumber + " from Ethereum.");
            writeToLog("[Relayer] Get block #" + blockNumber + " from Ethereum.");
            Blocks_Info.add(new eblock(
                    block.getResult().getDifficulty().toString(),
                    block.getResult().getExtraData(),
                    block.getResult().getGasLimit().toString(),
                    block.getResult().getGasUsed().toString(),
                    block.getResult().getHash(),
                    block.getResult().getLogsBloom(),
                    block.getResult().getMiner(),
                    block.getResult().getNonce().toString(),
                    block.getResult().getNumber().toString(),
                    block.getResult().getParentHash(),
                    block.getResult().getReceiptsRoot(),
                    block.getResult().getSha3Uncles(),
                    block.getResult().getSize().toString(),
                    block.getResult().getStateRoot(),
                    block.getResult().getTimestamp().toString(),
                    block.getResult().getTotalDifficulty().toString(),
                    block.getResult().getTransactions(),
                    block.getResult().getTransactionsRoot(),
                    block.getResult().getUncles()
            ));

            String filePath = "relayer-server/routes/Blocks_Info.json";

            //java 輸出 json 格式
            ObjectMapper objectMapper = new ObjectMapper();
            if(Blocks_Info.size() > BLOCKS_INFO_TABLE_MAX_LENGTH){
                Blocks_Info = Blocks_Info.subList(5, Blocks_Info.size()+1); //inclusive, exclusive
            }
            //jackson default 就會是 utf8 輸出
            //https://stackoverflow.com/questions/10004241/jackson-objectmapper-with-utf-8-encoding
            objectMapper.writeValue(new File(filePath), Blocks_Info);

            BufferedWriter writer = new BufferedWriter(new FileWriter(blockPath));
            writer.write(blockNumber.toString());
            writer.close();

            blockNumber = blockNumber.add(BigInteger.ONE);
        }
    }

    /*
    //To-Notice: 看是否需要改成 java code 與 corda(java) 互動
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
    };*/

    List<Transaction> transferRes = new Vector<>();
    List<TransactionReceipt> transferRes_Receipt = new Vector<>();
    void ValidationEvent() throws Exception{
        EthFilter filter = new EthFilter(DefaultBlockParameterName.LATEST, DefaultBlockParameterName.LATEST, Validation_Address.substring(2));
        String encodedEventSignature = EventEncoder.encode(ValidationContract.VALIDATION_EVENT_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        web3j.ethLogFlowable(filter).subscribe(eventString -> {

            List<Type> results = FunctionReturnDecoder.decode(
                    eventString.getData(), RequestListContract.COPY_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
            // 合約 Event 格式: event validation_event(bytes32 validationTx, uint Action);

            if(results.get(1).toString() == "1"){
                EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
                if(transaction.hasError() == false){
                    log.info(transaction.toString());
                    log.info(transaction.getTransaction().toString());
                    log.info(transaction.getResult().toString());

                    transferRes.add(transaction.getResult());

                    //java 輸出 json 格式
                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.writeValue(new File("relayer-server/routes/transferRes.json"), transferRes);
                }

                EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
                if (transactionReceipt.getTransactionReceipt().isPresent()) {
                    log.info(transactionReceipt.getResult().toString());
                    //java 輸出 json 格式
                    //https://stackabuse.com/reading-and-writing-json-in-java/
                    //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                    //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                    transferRes_Receipt.add(transactionReceipt.getResult());

                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.writeValue(new File("relayer-server/routes/transferRes_Receipt.json"), transferRes_Receipt);
                } else {
                    // try again
                }
            }else if(results.get(1).toString() == "2"){

            }else if(results.get(1).toString() == "3"){
                List<Transaction> landValue = new Vector<>();
                List<TransactionReceipt> landValue_Receipt = new Vector<>();

                EthTransaction transaction = web3j.ethGetTransactionByHash( results.get(0).toString() ).send();
                if(transaction.hasError() == false){

                    landValue.add(transaction.getResult());

                    //java 輸出 json 格式
                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.writeValue(new File("relayer-server/routes/landValue.json"), landValue);
                }

                EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0).toString() ).send();
                if (transactionReceipt.getTransactionReceipt().isPresent()) {

                    landValue_Receipt.add(transactionReceipt.getResult());

                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.writeValue(new File("relayer-server/routes/landValue_Receipt.json"), landValue_Receipt);
                } else {
                    // try again
                }
            }

        });
    }

    /*
    //To-Notice: 同樣看是否需要改成 java code 與 corda(java) 互動
    async function ResponseValidationOnEth(msgHash, v, r, s, notary, EthIndex, Action, Status){
        web3.eth.personal.unlockAccount(NotaryAgent, "1234", 500)
        .then(function(){
            Validation.methods.verifyResponse(AssetList_Address, RequestList_Address, msgHash, v, r, s, notary, EthIndex, Action, Status).send({from: NotaryAgent, gas: 6721974})
            .then(function(e){
                console.log("[relayer] Validating Corda response transaction");
                writeToLog("[relayer] Validating Corda response transaction")
            });
        });
    }
    */
}
