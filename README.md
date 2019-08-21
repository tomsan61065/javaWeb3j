# Web3 java 
這個 Repo 將原本以 web3 與 node express 寫成的 relay ETH 端重新以 web3j 跟 springboot 完成。

## 前置需求
- 了解以太坊基本架構與基本 solidity
- 了解基本 web3 與 express
- 了解基本 java

## 開發環境
- java JDK version 11.0.3
- Intellij IDEA Community Edition
- [gradle 5.0+](https://www.jetbrains.com/help/idea/gradle-jvm-selection.html#gradle_java_support_list)
- 其它依賴可看 gradle 設定檔 build.gradle

## 檔案結構說明
- **gs-spring-boot** 為 springboot 範例
- **sample-project-gradle** 為 web3j 官方範例
- **routes** 為原本的 node express 檔案
- **mergeSpringWeb3j** 實作的檔案

## 簡單功能說明
1. 建立與 enode 連線
    ```java=
    private static URI parseURI(String serverUri){
        try{
            return new URI(serverUri);
        }catch(URISyntaxException e){
            //handle exception
            return null;
        }
    }

    String ethereumUri = "ws://140.119.101.130:7576"; //130 or 70:7576
    //String ethereumUri = "ws://127.0.0.1:8545";

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
    ```
    經由 ws 建立 web3 比經由 http service 複雜得多( 20, 21 行就是 http)，首先提供 URI 建立 websocket client，但 URI 會 throw exception，所以還要另外包一個 function 來處理這部分，之後建立 websocket service 才能建立 web3 物件。 

2. 載入合約物件 
    ```java=
    private final TransactionManager transactionManager = new ClientTransactionManager(web3j, "0xaec8ccdac55de7949bdee80d975a06e64a7ff9e2"); //AliceETH
    String AssetList_Address = "0xe3f364b65b0e739d49c0b4fb9bfd4f309311d4aa";
    AssetList AssetListContract = AssetList.load(AssetList_Address, web3j, transactionManager, new DefaultGasProvider());

    String RequestList_Address = "0x1ab5ec1c09c917fd4dbd104ba5fa871c9c3fcc90";
    RequestList RequestListContract = RequestList.load(RequestList_Address, web3j, transactionManager, new DefaultGasProvider());

    String Validation_Address = "0xf742b95fdb5a1fd6361e2fa4c5b2d255484d2c01";
    TxValidation ValidationContract = TxValidation.load(Validation_Address, web3j, transactionManager, new DefaultGasProvider());
    ```
    相較於官方範例的建立方式，需要使用者提供錢包等憑證才可 load 合約，另一個方式就是經由 TransactionManager，不需要憑證就可以建立合約物件。缺點是不同人要 call 合約的話可能要重建一個 instance，並且 txManager 的 address 就要對應到該 address。 
3. 監聽特定合約的 event
    ```java=
    EthFilter filter = new EthFilter(DefaultBlockParameterName.LATEST, DefaultBlockParameterName.LATEST, RequestList_Address);
    // Event event = new Event("copy_event", Arrays.asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}));
    String encodedEventSignature = EventEncoder.encode(RequestListContract.COPY_EVENT_EVENT);
    filter.addSingleTopic(encodedEventSignature);
    log.info("subscribing RequestListCopy event with filter");
    web3j.ethLogFlowable(filter).subscribe(eventString -> {
        ...
    });
    ```
    要監聽特定合約的 event，首先要建立一個 filter，filter 需要知道要從哪一個 block 開始監聽，並且是哪個 address 的合約。此外 filter 還需要知道是哪個 event，所以要提供 event 特徵。如果沒有對合約使用 gradle wrapper 的幫助下產生的 event 特徵值得話(第 3 行)，就需要自己寫一個 event(第 2 行註解的部分)，並註明事件名稱與參數型態。 
    
4. 從 event 獲取參數 
    ```java=
    web3j.ethLogFlowable(filter).subscribe(eventString -> {
        List<Type> results = FunctionReturnDecoder.decode(
            eventString.getData(), RequestListContract.COPY_EVENT_EVENT.getNonIndexedParameters()); //event class 的 function，看 https://github.com/web3j/web3j/blob/master/abi/src/main/java/org/web3j/abi/datatypes/Event.java
        
        EthTransaction transaction = web3j.ethGetTransactionByHash( Numeric.toHexString(((Bytes32)results.get(0)).getValue()) ).send();
            if(transaction.hasError() == false){
            
                Health_Certificate.add(new Tx(transaction.getResult()));

                //java 輸出 json 格式
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.writeValue(new File("share/Health_Certificate.json"), Health_Certificate);
            }
    }
    ```
    當監聽到 event 發生後會得到回傳資訊，但這邊官方文件沒說名如何抓到 event 參數，要去 github 找。首先要 List 來存 FunctionReturnDecoder 處理完的參數(index 或 nonindex 的參數)，但處理完的參數其實是直接對應 solidity 的資料型態，這邊又需要用到官方沒有說明的 Numeric class，如圖要把 Byte32 轉成 HexString 還需要先強制轉型回 Byte32 後才可繼續處理。 
    
5. enode 帳號與合約互動 
    ```java=
    PersonalUnlockAccount personalUnlockAccount = web3jAdmin.personalUnlockAccount(AliceETH, "1234", BigInteger.valueOf(500) ).send();
        if (personalUnlockAccount.accountUnlocked()) {
            TransactionReceipt transactionReceipt = RequestListContract.addTransferRequest(AssetList_Address, notary, Corda, new BigInteger(AssetIndex) ).send();
            log.info("[user] AliceETH" + " send a transfer request");
            writeToLog("[user] AliceETH" + " send a transfer request");
                
            transactionReceipt = RequestListContract.emitTransferEvent(Numeric.hexStringToByteArray(carTx), Numeric.hexStringToByteArray(transactionReceipt.getTransactionHash()) ).send();
            log.info("[relayer] send 2 Transactions receipt for Transfer");
            writeToLog("[relayer] send 2 Transactions receipt for Transfer");

            return "Done.html";
        }
    ```
    除了前面提到要與合約互動的帳號需要在 txManager 裡面提供外，當要與合約互動時就要先解鎖該帳號，另外參數的部分也要使用上面提到的 Numeric class 進行轉換。 
6. springboot 結構 
    ![](https://i.imgur.com/AlUaR1V.png)

    ```java=
    @RequestMapping("/")
    public String index() throws Exception{
        WSconnect();
        startListenEvent();
        return "Home.html";
    }
    ```
    因為使用 springboot 的框架，所以 html 頁面須放置在特定路徑(templates)下才可被找到(如圖片的 Home.html，回傳的將不會是字串而是該名稱的 HTML file)，圖片會預設放在 images 下，其他 html 與 jpg 是單純的檔案 access 用。 
    
## 建議
1. 善用 Intellij IDEA 等 IDE 提供的 autocomplete 與型態檢查
2. 與其看官方(可能過時誤導)的說明文件，不如在 github 直接 search，會比較快
3. 擁有樂觀正面的態度
