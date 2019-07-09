pragma solidity >=0.4.22 <0.6.0;

contract AssetList{
    // 此合約的擁有者
    address private Contract_Owner;
    
    constructor() public{
        Contract_Owner = msg.sender;
    }
    
    struct Health{
        address owner;
        uint age;
    }
    Health[] Health_List;
    
    struct Car{
        address owner;
        uint license;
        bool freeze;
    }
    Car[] Car_List;
    
    struct USdollar{
        address owner;
        uint amount;
        bool freeze;
    }
    USdollar[] USdollar_List;
    
    struct Land{
        address owner;
        uint value;
        uint status;
    }
    Land[] Land_List;
    
    // 新增資產
    function addAsset_Health(address owner, uint age) public {
        // if(Contract_Owner != msg.sender) return;
        
        Health memory a = Health(owner, age);
        Health_List.push(a);
    }
    function addAsset_Car(address owner, uint license) public {
        // if(Contract_Owner != msg.sender) return;
        
        Car memory a = Car(owner, license, false);
        Car_List.push(a);
    }
    function addAsset_USdollar(address owner, uint amount) public {
        // if(Contract_Owner != msg.sender) return;
        
        USdollar memory a = USdollar(owner, amount, false);
        USdollar_List.push(a);
    }
    function addAsset_Land(address owner, uint value) public {
        // if(Contract_Owner != msg.sender) return;
        
        Land memory a = Land(owner, value, 0);
        Land_List.push(a);
    }
    
    // 取得資產資訊
    function getAssetInfo_Health(uint i) view public returns (address, uint){
        return(Health_List[i].owner, Health_List[i].age);
    }
    function getAssetInfo_Car(uint i) view public returns (address, uint){
        return(Car_List[i].owner, Car_List[i].license);
    }
    function getAssetInfo_USdollar(uint i) view public returns (address, uint){
        return(USdollar_List[i].owner, USdollar_List[i].amount);
    }
    function getAssetInfo_Land(uint i) view public returns (address, uint){
        return(Land_List[i].owner, Land_List[i].value);
    }
    
    // 驗證資產擁有人
    function HealthValidation(address owner, uint i) view public returns (bool){
        return(Health_List.length >= i && Health_List[i].owner == owner);
    }
    function CarValidation(address owner, uint i) view public returns (bool){
        return(Car_List.length >= i && Car_List[i].owner == owner && !Car_List[i].freeze && Car_List[i].license != 0);
    }
    function USdollarValidation(address owner, uint i) view public returns (bool){
        return(USdollar_List.length >= i && USdollar_List[i].owner == owner);
    }
    function LandValidation(address owner, uint i) view public returns (bool){
        return(Land_List.length >= i && Land_List[i].owner == owner && Land_List[i].status == 0);
    }
    
    // 變更資產之擁有人
    function ChangeStatusOfCar(uint i, bool freeze) public {
        Car_List[i].freeze = freeze;
    }
    function ChangeStatusOfUSdollar(uint i, bool freeze) public {
        USdollar_List[i].freeze = freeze;
    }
    function ChangeOwnerOfUSdollar(uint i, address newOwner) public {
        // if(Contract_Owner == msg.sender){
        //     USdollar_List[i].owner = newOwner;
        // }
        USdollar_List[i].owner = newOwner;
    }
    function ChangeOwnerOfLand(uint i, address newOwner) public {
        // if(Contract_Owner == msg.sender){
        //     Land_List[i].owner = newOwner;
        // }
        Land_List[i].owner = newOwner;
    }
    
    function ChangeStatusOfLand(uint i, uint status) public {
        Land_List[i].status = status;
    }
    
    function ChangeValueOfLand(uint i, uint value) public {
        // if(Contract_Owner == msg.sender){
        //     Land_List[i].value = value;
        // }
        Land_List[i].value = value;
    }
    
    // 資產查找
    function queryHealthAsset() view public returns(uint, address[] memory, uint[] memory){
        address[] memory addressList = new address[](Health_List.length);
        uint[] memory ageList = new uint[](Health_List.length);
        for(uint i = 0; i < Health_List.length; i++){
            addressList[i] = Health_List[i].owner;
            ageList[i] = Health_List[i].age;
        }
        return(Health_List.length, addressList, ageList);
    }
    function queryCarAsset() view public returns(uint, address[] memory, uint[] memory, bool[] memory){
        address[] memory addressList = new address[](Car_List.length);
        uint[] memory licenseList = new uint[](Car_List.length);
        bool[] memory freezeList = new bool[](Car_List.length);
        for(uint i = 0; i < Car_List.length; i++){
            addressList[i] = Car_List[i].owner;
            licenseList[i] = Car_List[i].license;
            freezeList[i] = Car_List[i].freeze;
        }
        return(Car_List.length, addressList, licenseList, freezeList);
    }
    function queryUSdollarAsset() view public returns(uint, address[] memory, uint[] memory, bool[] memory){
        address[] memory addressList = new address[](USdollar_List.length);
        uint[] memory amountList = new uint[](USdollar_List.length);
        bool[] memory freezeList = new bool[](USdollar_List.length);
        for(uint i = 0; i < USdollar_List.length; i++){
            addressList[i] = USdollar_List[i].owner;
            amountList[i] = USdollar_List[i].amount;
            freezeList[i] = USdollar_List[i].freeze;
        }
        return(USdollar_List.length, addressList, amountList, freezeList);
    }
    function queryLandAsset() view public returns(uint, address[] memory, uint[] memory, uint[] memory){
        address[] memory addressList = new address[](Land_List.length);
        uint[] memory valueList = new uint[](Land_List.length);
        uint[] memory statusList = new uint[](Land_List.length);
        for(uint i = 0; i < Land_List.length; i++){
            addressList[i] = Land_List[i].owner;
            valueList[i] = Land_List[i].value;
            statusList[i] = Land_List[i].status;
        }
        return(Land_List.length, addressList, valueList, statusList);
    }
    
    // 消滅轉移後的資產
    function deleteCarAsset(uint i) public {
        delete Car_List[i];
    }
    // 解凍轉移失敗的資產
    function unfreezeCarAsset(uint i) public {
        Car_List[i].freeze = false;
    }
    
    // For time oracle
    function checkPendingRequest() public {
        for(uint i = 0; i < Car_List.length; i++){
            if(Car_List[i].freeze){
                Car_List[i].freeze = false;
            }
        }
        for(uint i = 0; i < USdollar_List.length; i++){
            if(USdollar_List[i].freeze){
                USdollar_List[i].freeze = false;
            }
        }
    }
}

contract RequestList{
    // 此合約的擁有者
    address private Contract_Owner;
    
    constructor() public{
        Contract_Owner = msg.sender;
    }
    
    struct CopyRequest{
        uint EthAsset_Index;
        address Sender;
        string Receiver;
        uint Status;    // 0:pending, 1:reject, 2:success
    }
    CopyRequest[] _copy;
    
    struct TransferRequest{
        uint EthAsset_Index;
        address Sender;
        string Receiver;
        uint Status;
    }
    TransferRequest[] _transfer;
    
    struct ExchangeRequest{
        uint EthAsset_Index;
        string CordaAsset_Index;
        address SenderETH;
        address ReceiverETH;
    }
    ExchangeRequest[] _exchange;
    
    struct EncumbranceRequest{
        uint RequestIndex;
        uint EthAsset_Index;
        string CordaAsset_Index;
        address LandOwner;
        string Bank;
        uint first;
        uint second;
        uint third;
        uint Status; // 0:normal, 1:collateral, 2:Provisional Attachment
    }
    EncumbranceRequest[] _encumbrance;
    
    
    // 新增請求
    event copy_event(bytes32 assetTx, bytes32 requestTx);
    function addCopyRequest(address AssetContractAddress,  address Sender, string memory Receiver, uint Index) public {
        AssetList al = AssetList(AssetContractAddress); // AssetContractAddress: Contract address
        
        if(al.HealthValidation(Sender, Index)){
            CopyRequest memory a = CopyRequest(Index, Sender, Receiver, 0);
            _copy.push(a);
        }
    }
    function emitCopyEvent(bytes32 assetTx, bytes32 requestTx) public {
        emit copy_event(assetTx, requestTx);
    }
    
    event transfer_event(bytes32 assetTx, bytes32 requestTx);
    function addTransferRequest(address AssetContractAddress, address Sender, string memory Receiver, uint Index) public {
        AssetList al = AssetList(AssetContractAddress);
        
        if(al.CarValidation(Sender, Index)){
            al.ChangeStatusOfCar(Index, true);
            
            TransferRequest memory a = TransferRequest(Index, Sender, Receiver, 0);
            _transfer.push(a);
        }
    }
    function emitTransferEvent(bytes32 assetTx, bytes32 requestTx) public {
        emit transfer_event(assetTx, requestTx);
    }
    
    event exchange_event(bytes32 assetTx, bytes32 requestTx);
    function addExchangeRequest(address AssetContractAddress, address SenderETH, address ReceiverETH, uint ETHIndex, string memory CORDAIndex) public {
        AssetList al = AssetList(AssetContractAddress);
        
        if(al.USdollarValidation(SenderETH, ETHIndex)){
            al.ChangeStatusOfUSdollar(ETHIndex, true);
            
            ExchangeRequest memory a = ExchangeRequest(ETHIndex, CORDAIndex, SenderETH, ReceiverETH);
            _exchange.push(a);
        }
    }
    function emitExchangeEvent(bytes32 assetTx, bytes32 requestTx) public {
        emit exchange_event(assetTx, requestTx);
    }
    
    function addEncumbranceRequest(address AssetContractAddress, address LandOwner, string memory Bank, uint ETHIndex, string memory CORDAIndex) public {
        bool exist = false;
        AssetList al = AssetList(AssetContractAddress);
        
        if(al.LandValidation(LandOwner, ETHIndex)){
            for(uint i = 0; i < _encumbrance.length; i++){
                if(_encumbrance[i].EthAsset_Index == ETHIndex){
                    exist = true;
                }
            }
            if(!exist){
                al.ChangeStatusOfLand(ETHIndex, 1);
                EncumbranceRequest memory a = EncumbranceRequest(_encumbrance.length, ETHIndex, CORDAIndex, LandOwner, Bank, 50, 100, 120, 1);
                _encumbrance.push(a);
            }
        }
    }
    
    // Check timeout of EncumbranceRequest
    event encumbrance_event(string info, uint LandIndex, string USIndex, uint RequestIndex, string Bank);
    function checkEncumbranceTimeOut(uint time) public {
        for(uint i = 0; i < _encumbrance.length; i++){
            if(_encumbrance[i].Status == 1){
                if(_encumbrance[i].first <= time && _encumbrance[i].second > time && _encumbrance[i].third > time){
                    // emit encumbrance_event("Meet the First time!", _encumbrance[i].EthAsset_Index, _encumbrance[i].CordaAsset_Index, _encumbrance[i].RequestIndex);
                }
                else if(_encumbrance[i].first <= time && _encumbrance[i].second <= time && _encumbrance[i].third > time){
                    // emit encumbrance_event("Meet the Second time!", _encumbrance[i].EthAsset_Index, _encumbrance[i].CordaAsset_Index, _encumbrance[i].RequestIndex);
                }
                else if(_encumbrance[i].first <= time && _encumbrance[i].second <= time && _encumbrance[i].third <= time){
                    emit encumbrance_event("Meet the Third time!", _encumbrance[i].EthAsset_Index, _encumbrance[i].CordaAsset_Index, _encumbrance[i].RequestIndex, _encumbrance[i].Bank);
                }
            }
        }
    }
    
    // 改變該請求之資產狀態，並放入TxHash
    function changeCopyStatus(uint i, uint Status) public {
        if(Contract_Owner == msg.sender){
            _copy[i].Status = Status;
        }
    }
    function changeTransferStatus(uint i, uint Status) public {
        if(Contract_Owner == msg.sender){
            _transfer[i].Status = Status;
        }
    }
    // function changeExchangeStatus(uint i, uint Status) public {
    //     if(Contract_Owner == msg.sender){
    //         _exchange[i].Status = Status;
    //     }
    // }
    function changeEncumbranceStatus(uint i, uint Status) public {
        if(Contract_Owner == msg.sender){
            _encumbrance[i].Status = Status;
        }
    }
    
    function ChangeOwnerOfUSdollar(address AssetContractAddress, uint EthIndex) public {
        AssetList al = AssetList(AssetContractAddress);
        for(uint i = 0; i < _exchange.length; i++){
            if(_exchange[i].EthAsset_Index == EthIndex){
                al.ChangeOwnerOfUSdollar(EthIndex, _exchange[i].ReceiverETH);
            }
        }
    }
}

contract TxValidation{
    // 此合約的擁有者
    address private Contract_Owner;
    
    constructor() public{
        Contract_Owner = msg.sender;
    }
    
   function verify(address AssetContractAddress, bytes32 testStringBytes, uint8 v, bytes32 r, bytes32 s, address Notary, address owner, uint asset, uint action, string memory CordaIndex) public {
       bytes memory prefix = "\x19Ethereum Signed Message:\n32";
       bytes32 prefixedValue = keccak256(abi.encodePacked(prefix, testStringBytes));
       if(ecrecover(prefixedValue, v, r, s) == Notary){
           if(action == 0){
               AssetList al = AssetList(AssetContractAddress);
               al.addAsset_Health(owner, asset);
           }
           else if(action == 1){
               AssetList al = AssetList(AssetContractAddress);
               al.addAsset_Car(owner, asset); 
           }
       }
      else{
          revert('Request Fail!');
      }
   }
   
   function verifyResponse(address AssetContractAddress, address RequestContractAddress, bytes32 testStringBytes, uint8 v, bytes32 r, bytes32 s, address Notary, uint EthIndex, uint action, uint status) public {
       bytes memory prefix = "\x19Ethereum Signed Message:\n32";
       bytes32 prefixedValue = keccak256(abi.encodePacked(prefix, testStringBytes));
       if(ecrecover(prefixedValue, v, r, s) == Notary){
           AssetList al = AssetList(AssetContractAddress);
           RequestList ql = RequestList(RequestContractAddress);
           if(action == 1){
               al.deleteCarAsset(EthIndex);
           }
           else if(action == 2){
               if(status == 0){
                   ql.ChangeOwnerOfUSdollar(AssetContractAddress, EthIndex);
               }
               al.ChangeStatusOfUSdollar(EthIndex, false);
           }
       }
      else{
          revert('Response Fail!');
      }
   }
   
   function verify2(bytes32 testStringBytes, uint8 v, bytes32 r, bytes32 s) pure public returns(address) {
       bytes memory prefix = "\x19Ethereum Signed Message:\n32";
       bytes32 prefixedValue = keccak256(abi.encodePacked(prefix, testStringBytes));
       return ecrecover(prefixedValue, v, r, s);
   }
   
   function stringToBytes32(string memory source) pure public returns (bytes32 result) {
       bytes memory temp = bytes(source);
       if(temp.length == 0){
           return 0x0;
       }
       assembly {
           result := mload(add(source, 32))
       }
   }
   
   event validation_event(bytes32 validationTx, uint Action);
   function emitValidationEvent(bytes32 validationTx, uint Action) public {
       emit validation_event(validationTx, Action);
   }
}
