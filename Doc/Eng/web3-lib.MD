# The library of access to the Tera wallet on the front part of the site

If the user has an account (wallet) created on the website terawallet.org, then this library gives third-party sites the ability to interact with his wallet. If we draw an analogy with the Ethereum blockchain, it is similar to the Metamask plugin, except that no plugins need to be installed. The TeraWallet wallet is written entirely in JavaScript and stores the secret key on the client side in the browser's local storage.

Сapabilities:
- Sending coins (money transaction).
- Working with smart contract methods (sending transactions, calling static methods).
- Create accounts with attached DApps.




### Note
In this text, the concept of DAps and smart contracts are synonymous.

- Smart Contract - code that is executed on the server part on nodes.
- DApp is a broader concept, it includes a smart contract code and code running on client devices, for example, in browsers.



Sending coins and calling static methods can work on any websites.
Creating accounts and calling smart contract methods - only from allowed websites, a smart contract should have a CheckAccess function with this verification:

###### Example:
```js
"public"
function CheckAccess(Path)
{
    if(Path==="http://example.com/")
        return 1;
    else
        return 0;
}
```  
 

##### Connecting Library:

```js
<script type="text/javascript" src="https://terawallet.org/JS/web3-tera.js"></script>
```

Once connected, the web3.tera global object becomes available.


#### Login
**web3.tera.Login(DappNum)** - - authorization to the user's wallet, if there has not yet been authorization in this browser session, then the action request form to the user opens.
Wallet authorization is needed to work with DApp (sending methods, creating accounts).

###### Options:     
- DappNum -  DApp number (mandatory parameter)

###### Example:
```js
    web3.tera.Login(128);
```

---
### Methods that require pre-authorization (using the Login method)


#### SendCall
**web3.tera.SendCall(Data,F)** - Send a transaction calling of a smart contract method
###### Options:     
- Data - structure defining call parameters, which consists of fields:  {From, To, Method, Params, ParamsArr}
- F - is a return function with the result of sending, the function returns an object with the structure {result,text,TR}
 
###### Example:
```js
web3.tera.SendCall({From:113, To:113, Method:"Method1", Params:{Sum:5}},function (Data)
{
    console.log("Send Method result = "+Data.result+" "+Data.text);
});
```


#### CreateAccount
**web3.tera.CreateAccount(Data,F)** - sending a transaction to create a new account linked to a smart contract
###### Options:     
- Data - structure defining call parameters, which consists of {Currency, Description} fields:  {Currency, Description}
- F - is a return function with the result of sending, the function returns an object with the structure {result,text,TR}
 
###### Example:
```js
web3.tera.CreateAccount({Currency:0, Description:"Test account"},function (Data)
{
    console.log("Send CreateAccount result = "+Data.result+" "+Data.text);
});
```

---
### Methods that do not require pre-authorization (Login method).
   
     
#### Send
**web3.tera.Send(Data)** - initiates sending of coins through the opening of the request form to the user. The actual sending of coins is carried out in the wallet. This method is actually just an autofill of the fields: the recipient's Account, the Amount and the payment Description.
###### Options:     
- Data - structure defining coin translation parameters, which consists of:  {To, Sum, Description}

###### Example:
```js
web3.tera.Send({To:20, Sum:1.5, Description:"Test only"});
```  

#### StaticCall
**web3.tera.StaticCall(Data,F)** - static (i.e. without sending a transaction) call of the smart contract method

###### Options:     
- Data - structure defining call parameters, which consists of fields: {To, Method, Params, ParamsArr}
- F - callback function with send result, function returns object with structure: {result,RetValue}
 
###### Example:
```js
web3.tera.StaticCall({From:0, To:226688, Method:"HellowWorld", Params:{}},function (Data)//223295
{
    if(Data.result)
        console.log("OK, result="+Data.RetValue);
});
```  
     

---
### Events and structures for getting up-to-date DApp information   
Note: these actions are possible only after authorization
   
#### OnLogin
**web3.tera.OnLogin(F)** - obtaining authorization information
###### Options:     
F - is the callback function to which the result is transmitted: 
- 0 - Exit from a wallet is executed
- 1 - Signed in to a wallet, 
 
###### Example:
```js
web3.tera.OnLogin(function (Result)
{
    console.log("Login="+Result);
});
```  
  
#### OnInfo
 **web3.tera.OnInfo(F)** - getting up-to-date information on the DApp and status of the user's wallet
 ###### Options:     
 F - Callback function (automatic periodic call), returns a structure with data:
 ArrWallet - an array with a list of wallet accounts, each account is a structure: {Num, Name, Currency, PubKey, PubKeyStr, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}}
 Account - basic (main) smart contract account, structure: {Num, Name, Currency, PubKey, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}}
 Smart - properties of the smart contract structure: {Num, Name, ShortName, Account, AccountLength, Owner, TokenGenerate}
 NETWORK - network name
 SHARD_NAME - shard name
 CurBlockNum - current (last) block number
 PRICE_DAO - prices of paid transactions, structure: {NewAccount, NewShard, NewSmart, NewTokenSmart, Storage}
  
  
 ###### Example:
 ```js
 web3.tera.OnInfo(function ()
 {
     console.log(web3.tera.INFO);
 });
 ```  
  
#### OnEvent
**web3.tera.OnEvent(F)** - getting the next new dapp event triggered by the Event method in the smart contract
###### Options:     
F - Callback function to which the event called from the smart contract method is dispatched


 
###### Example:
```js
web3.tera.OnEvent(function (Data)
{
    console.log(Data);
});
```  
 
 
     
---
#### InjectHTML
**web3.tera.InjectHTML(UrlPath,DappNum)** - Insert the wallet code and automatic login into the web page after download. If the method has not been called,  the code is inserted automatically the first time the method Login() is called
 
###### Options:     
- UrlPath - wallet path, default: https://terawallet.org/web3-wallet.html  (optional)
- DappNum - DApp number (optional)

 
###### Example:
```js
    window.addEventListener('load',function ()
    {
        web3.tera.InjectHTML('http://127.0.0.1/web3-wallet.html');
    });
```     
     
### API Dapp functiojns


#### GetAccountList
**GetAccountList(Params,F)** - getting an array of accounts with data
###### Options:     
- Params - the call parameters, the structure with fields: {StartNum,CountNum} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * arr - array of accounts with the structure: {Num, Name, Currency, PubKey, PubKeyStr, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}} 

###### Example:
 ```js
web3.tera.GetAccountList({StartNum:205,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  

#### GetSmartList
**GetSmartList(Params,F)** - getting an array of smart contracts with data
###### Options:     
- Params - the call parameters, the structure with fields: {StartNum,CountNum} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * arr - array of smart contracts with the structure:  {Num, Name, ShortName, Account, AccountLength, Owner, TokenGenerate} 

###### Example:
 ```js
web3.tera.GetSmartList({StartNum:8,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  


#### GetBlockList
**GetBlockList(Params,F)** - getting an array of data blocks
###### Options:     
- Params - the call parameters, the structure with fields: {StartNum,CountNum} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * arr - array of blocks:  {Num, Hash, PowHash, Power, TxCount, Miner, MinerHash} 

###### Example:
 ```js
web3.tera.GetBlockList({StartNum:154752,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  

#### GetTransactionList
**GetTransactionList(Params,F)** - getting an array of transactions
###### Options:     
- Params - the call parameters, the structure with fields: {BlockNum,StartNum,CountNum} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * arr - array of transactions:  {Num, Type, Body, TxID, Verify} 

###### Example:
 ```js
web3.tera.GetTransactionList({BlockNum:154753,StartNum:0,CountNum:100},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  




#### GetBlockFile
**GetBlockFile(Params,F)** - receiving transaction data (in the form of the object)
###### Options:     
- Params - the call parameters, the structure with fields: {BlockNum,TrNum} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * Body - the transaction in the form of an object, the structure depends on the type of transaction, for example, a transaction calling a smart contract method: {Type, Version, Account, FromNum, MethodName, OperationID, Params, ParamsArr, Sign}
  
###### Example:
 ```js
web3.tera.GetBlockFile({BlockNum:155303,TrNum:0},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  



  
#### ComputeSecret
**ComputeSecret(Params,F)** - getting the shared secret of your key with another public key. It is used for data encryption.
###### Options:     
- Params - the call parameters, the structure with fields: {PubKey} 
- F - the callback function that returns a response with the result

The structure of the result:
 * result - the result, 1 - successful
 * RetValue - byte array with shared secret
  
###### Example:
 ```js
web3.tera.ComputeSecret({PubKey:"0310DC3B2CD4F88BC0A420E22250A0370E676B48E25B043669C48E46BA3EC55A8A"},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  




A general example of an external html page with access to a wallet terawallet.org:

https://gitlab.com/terafoundation/dapps/-/blob/master/JSWallet/WWWPage.html




