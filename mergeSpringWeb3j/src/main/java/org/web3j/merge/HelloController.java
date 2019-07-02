package org.web3j.merge;

import java.util.*;
import java.math.BigInteger;
import java.math.BigDecimal;
import java.net.*;
import java.io.*;

//spring boot
//import org.springframework.web.bind.annotation.RestController;
//import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestParam;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

//web3j
import org.web3j.crypto.Credentials;
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
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.request.*;
import org.web3j.protocol.core.methods.response.*;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.core.methods.response.EthEstimateGas;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;



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

    public class CopyRequestTx{ // 這個就是 web3j 內建的 TransactionReceipt 內容惹
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

    String ganacheAddress = "0x7f9473ade6f1721356c95ca652333e15eafbda32"; //每次重開 ganache 都要改成上面存在的 address
    @RequestMapping("/deploy")
    @ResponseBody
    public String deployContract() throws Exception{
        webSocketService.connect(); //這樣才會連接上 enode
        TransactionManager transactionManager2 = new ClientTransactionManager(web3j, ganacheAddress);//transaction manager
        testListenEvent();

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

    String contractAddress = "0x4ca30e5255c0eaec4caa0cd582c1ed667e2f3a04"; //要手動更新 deploy 後的 contract address
    @RequestMapping("/listenEvent")
    @ResponseBody
    public String testlistenEvent() throws Exception{
        webSocketService.connect(); //這樣才會連接上 enode
        testListenEvent();
        return "true";
    }

    void testListenEvent(){
        //官方文件 https://web3j.readthedocs.io/en/latest/filters.html#topic-filters-and-evm-events
        //官方範例 https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
        //範例合約 https://github.com/web3j/web3j/blob/master/codegen/src/test/resources/solidity/fibonacci/Fibonacci.sol
        //別人範例 https://blog.csdn.net/liuzhijun301/article/details/80240437
        //範例與問題 https://ethereum.stackexchange.com/questions/51958/subscribing-to-event-using-web3j
        EthFilter filter = new EthFilter(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST, contractAddress.substring(2));
        // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
        String encodedEventSignature = EventEncoder.encode(Greeter.MODIFIED_EVENT);
        filter.addSingleTopic(encodedEventSignature);
        log.info("subscribing to event with filter");
        web3j.ethLogFlowable(filter).subscribe(eventString -> {
            log.info("event string= " + eventString.toString());
            log.info(eventString.getTransactionHash());
            log.info(eventString.getData());

            //https://github.com/web3j/web3j/blob/9ac2c051ad9fcb54c57b5ebf3431952bf2f64884/core/src/main/java/org/web3j/protocol/core/methods/response/EthGetTransactionReceipt.java
            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( eventString.getTransactionHash() ).send();
            //https://web3j.readthedocs.io/en/latest/transactions.html#recommended-approach-for-working-with-smart-contracts
            //文件上面是錯的...
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
            } else {
                // try again

            }
        });
    }

    @RequestMapping("/sendEvent")
    @ResponseBody
    public String sendEvent() throws Exception{
        //webSocketService.connect(); //這樣才會連接上 enode，好像只需要(也只能) call 一次
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
            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger(AssetIndex) ).send();
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

    boolean onlyTriggerOnce = false;
    void RequestListCopyEvent(){
        if(onlyTriggerOnce == false){
            onlyTriggerOnce = true;
        }else{
            return;
        }
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
            log.info("[relayer] get copy event");
            //log.info("event string= " + eventString.toString());
            //log.info(eventString.getTransactionHash());
            
            //拿到 return 的 parameters
            //https://github.com/web3j/web3j/blob/master/integration-tests/src/test/java/org/web3j/protocol/scenarios/EventFilterIT.java
            List<Type> results = FunctionReturnDecoder.decode(
                log.getData(), RequestListContract.COPY_EVENT_EVENT.getParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java

            //https://github.com/web3j/web3j/tree/master/core/src/main/java/org/web3j/protocol/core/methods/response (一些 eth 功能) 
            //https://github.com/web3j/web3j/search?q=ethGetTransactionByHash&unscoped_q=ethGetTransactionByHash
            //https://github.com/web3j/web3j/blob/6160282a5912ba1f35394312e6e783e040da4af3/core/src/main/java/org/web3j/protocol/core/JsonRpc2_0Web3j.java  (所有功能 all eth function )

            // 合約 Event 格式: event copy_event(bytes32 assetTx, bytes32 requestTx);
            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(0) ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //https://stackoverflow.com/questions/43981487/how-to-append-object-to-existing-json-file-with-jackson 問題在於不存的話

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Health_Certificate.json"), user);

                let filePath = 'relayer-server/routes/Health_Certificate.json';
                var Health = JSON.stringify(Health_Certificate);
                fs.writeFile(filePath, Health, 'utf8', function(){
                    // console.log('New Health Asset!!!');
                });

            } else {
                // try again
            }

            EthGetTransactionReceipt transactionReceipt = web3j.ethGetTransactionReceipt( results.get(1) ).send();
            if (transactionReceipt.getTransactionReceipt().isPresent()) {
                log.info(transactionReceipt.getResult().toString());
                //https://stackabuse.com/reading-and-writing-json-in-java/
                //https://www.mkyong.com/java/how-to-convert-java-object-to-from-json-jackson/
                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("relayer-server/routes/Health_Certificate.json"), user);

                let filePath = 'relayer-server/routes/Health_Certificate.json';
                var Health = JSON.stringify(Health_Certificate);
                fs.writeFile(filePath, Health, 'utf8', function(){
                    // console.log('New Health Asset!!!');
                });

            } else {
                // try again
            }

        });
    }
    //合約wrapper 的功能，研究中
    //RequestListContract.copy_eventEventFlowable(DefaultBlockParameterName.EARLIEST, DefaultBlockParameterName.LATEST);

    //transfer
    // Corda 凍結，發送要 transfer (Corda timeout 一天)
    // ETH 收到，建立資產 
    // Corda time out 到了，檢查 ETH 有無建立成功，有就消滅，沒有就解凍

    // ETH 凍結，發送要 transfer (等半天)
    // Corda 收到，建立資產並凍結。對 ETH 發出成功 (Corda timeout 一天)
    // ETH 收到就會移除資產，沒收到 ETH 會先 timeout 並解凍
    // Corda timeout 到了，檢查 ETH 有無移除成功，有就解凍，沒有就 rollback(消滅)
    
    @PostMapping("/transfer")
    @ResponseBody //等於告訴 spring 別從 view 找 name (別找對應的 html，單純回傳字串)
    public String copy(String Eth, String Corda, String AssetIndex) throws Exception{//自動 mapping 變數名稱
        
        log.info("ETH:" + Eth + ", Corda:" + Corda + ", AssetIndex:" + AssetIndex);
        //log.info(_copy.Eth + " " + _copy.Corda);
        //if(_copy.Eth == null && _copy.Corda == null){
        if(Eth != null && Corda != null){
            log.info("Eth&Corda null");

            //RequestList.methods.addTransferRequest(AssetList_Address, notary, req.body.Corda, req.body.AssetIndex).send({from: NotaryAgent, gas: 6721974})

            PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(NotaryAgent, "????", BigInteger.valueOf(500) ).send();
            if (personalUnlockAccount.accountUnlocked()) {
                // send a transaction
                TransactionReceipt transactionReceipt = RequestListContract.addTransferRequest(AssetList_Address, notary, Corda, BigInteger.valueOf(AssetIndex) ).send();
                log.info("-----------------Add Transfer Request-------------------"); 
                log.info("Ethereum Account: AliceETH")
                log.info("Corda Account: BobCORDA");
                
                return "Done.html";
            }
        }
        //return "Done.html";
        //return _copy.object + _copy.score;
        return "true";
    }
}
