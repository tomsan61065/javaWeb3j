pragma solidity >=0.4.22 <0.6.0;

contract AssetList{
    // 此合約的擁有者
    address private Contract_Owner;
    
    constructor() public{
        Contract_Owner = msg.sender;
    }
    
    struct Asset{
        address owner;
        uint age;
        uint Timestamp;
    }
    
    Asset[] _Asset;
    
    // 新增資產
    // * dst address from Corda
    function addAsset(address owner, uint age) public{
        if(owner != msg.sender && Contract_Owner != msg.sender) return;
        
        Asset memory a = Asset(owner, age, now);
        _Asset.push(a);
    }
    
    // 取得資產資訊
    function getAsset(uint i) view public returns(address, uint, uint){
        return(_Asset[i].owner, _Asset[i].age, _Asset[i].Timestamp);
    }
    
    // 驗證資產擁有人
    function AccountValidation(address owner, uint i) view public returns(bool){
        return(_Asset.length >= i && _Asset[i].owner == owner);
    }
    
    // 取得總資產數量
    function NumberOfList() view public returns(uint){
        return(_Asset.length);
    }
    
    // 取得該資產之擁有人
    function OwnerOfAsset(uint i) view public returns(address){
        Asset memory a = _Asset[i];
        return(a.owner);
    }
    
    // 變更資產之擁有人
    function ChangeOwnerOfAsset(uint i, address newOwner) public{
        if(Contract_Owner == msg.sender){
            _Asset[i].owner = newOwner;
        }
    }
    
    // 資產查找
    function QueryAsset(address owner) view public returns(uint[] memory){
        uint[] memory queryList = new uint[](_Asset.length);   
        for(uint i = 0; i < _Asset.length; i++){
            if(_Asset[i].owner == owner){
                queryList[i] = _Asset[i].age;
            }
        }
        return(queryList);
    }
}

contract RequestList{
    // 此合約的擁有者
    address private Contract_Owner;
    
    constructor() public{
        Contract_Owner = msg.sender;
    }
    
    struct Request{
        uint EthAsset_Index;
        string Receiver;
        address AssetOwner;
        uint Status;    // 0:pending, 1:reject, 2:success
        string TxHash;
        uint CordaAsset_Index;
    }
    
    Request[] CopyRequest;
    Request[] TransferRequest;
    Request[] ExchangeRequest;
    
    struct Encumbrance{
        uint EthAsset_Index;
        string Receiver;
        address AssetOwner;
        uint Status;    // 0:pending, 1:reject, 2:success
        uint CordaAsset_Index;
        uint TimeOut;
    }
    Encumbrance[] EncumbranceRequest;
    
    
    // Action -> 0:Copy, 1:Transfer, 2:Exchange, 3:Encumbrance
    // 新增請求
    function addRequest(uint Action, address AssetListAddress, address AssetOwner, string memory AssetReceiver, uint EthAsset_Index, uint CordaAsset_Index) public{
        // 判斷是否validity
        AssetList al = AssetList(AssetListAddress); // AssetListAddress: Contract address
        
        // 根據請求儲存至相對的struct
        if(al.AccountValidation(AssetOwner, EthAsset_Index)){
            if(Action == 0){
                Request memory a = Request(EthAsset_Index, AssetReceiver, AssetOwner, 0, "0", 0);
                CopyRequest.push(a);
            }
            else if(Action == 1){
                Request memory a = Request(EthAsset_Index, AssetReceiver, AssetOwner, 0, "0", 0);
                TransferRequest.push(a);
            }
            else if(Action == 2){
                Request memory a = Request(EthAsset_Index, AssetReceiver, AssetOwner, 0, "0", CordaAsset_Index);
                ExchangeRequest.push(a);
            }
        }
    }
    
    function addEncumbranceRequest(address AssetListAddress, address AssetOwner, string memory AssetReceiver, uint EthAsset_Index, uint CordaAsset_Index, uint TimeOut) public{
        // 判斷是否validity
        AssetList al = AssetList(AssetListAddress); // AssetListAddress: Contract address
        if(al.AccountValidation(AssetOwner, EthAsset_Index)){
            Encumbrance memory a = Encumbrance(EthAsset_Index, AssetReceiver, AssetOwner, 0, CordaAsset_Index, TimeOut);
            EncumbranceRequest.push(a);
        }
    }
    
    // 改變該請求之資產狀態，並放入TxHash
    function changeStatus(uint Action, uint Index, uint Status, string memory Hash) public{
        if(Contract_Owner == msg.sender){
            if(Action == 0){
                CopyRequest[Index].Status = Status;
                CopyRequest[Index].TxHash = Hash;
            }
            else if(Action == 1){
                TransferRequest[Index].Status = Status;
                TransferRequest[Index].TxHash = Hash;
            }
            else if(Action == 2){
                ExchangeRequest[Index].Status = Status;
                ExchangeRequest[Index].TxHash = Hash;
            }
            else if(Action == 3){
                EncumbranceRequest[Index].Status = Status;
            }
        }
    }
    
    // 取得尚未完成之請求
    function PendingRequest(uint Action) view public returns(uint, string memory, uint, address, uint){
        if(Action == 0){
            for(uint i = 0; i < CopyRequest.length; i++){
                if(CopyRequest[i].Status == 0){
                    return(CopyRequest[i].EthAsset_Index, CopyRequest[i].Receiver, i, CopyRequest[i].AssetOwner, CopyRequest[i].CordaAsset_Index);
                }
            }
        }
        else if(Action == 1){
            for(uint i = 0; i < TransferRequest.length; i++){
                if(TransferRequest[i].Status == 0){
                    return(TransferRequest[i].EthAsset_Index, TransferRequest[i].Receiver, i, TransferRequest[i].AssetOwner, TransferRequest[i].CordaAsset_Index);
                }
            }
        }
        else if(Action == 2){
            for(uint i = 0; i < ExchangeRequest.length; i++){
                if(ExchangeRequest[i].Status == 0){
                    return(ExchangeRequest[i].EthAsset_Index, ExchangeRequest[i].Receiver, i, ExchangeRequest[i].AssetOwner, ExchangeRequest[i].CordaAsset_Index);
                }
            }
        }
    }
    
    // 牽制之請求
    function PendingEncumbrance(uint TimeOut) view public returns(uint[] memory, uint[] memory, address[] memory){
        uint[] memory getEvidence = new uint[](EncumbranceRequest.length);
        uint[] memory Asset_Index = new uint[](EncumbranceRequest.length);
        address[] memory AssetOwner = new address[](EncumbranceRequest.length);
        for(uint i = 0; i < EncumbranceRequest.length; i++){
            if(EncumbranceRequest[i].Status == 0){
                if(EncumbranceRequest[i].TimeOut <= TimeOut){
                    getEvidence[i] = i;
                    Asset_Index[i] = EncumbranceRequest[i].EthAsset_Index;
                    AssetOwner[i] = EncumbranceRequest[i].AssetOwner;
                }
            }
        }
        return(getEvidence, Asset_Index, AssetOwner);
    }
}