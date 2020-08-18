## API v1
Works with update version 1263

Official public gateways supporting this API:
* https://teraexplorer.org
* https://t1.teraexplorer.com
* https://t2.teraexplorer.com
* https://t4.teraexplorer.com
* https://t5.teraexplorer.com
* http://terablockchain.org
* http://dappsgate.com


This API is available if the fullnode is running public http-access. Set the constant HTTP_HOSTING_PORT

To do this, set the constants (from the full node interface or in the file: const.lst):
```js
"HTTP_HOSTING_PORT":80,
"USE_API_V1":1,
```

Although the API is designed for use in POST requests, it can be used for GET requests in a limited mode.

## DappStaticCall

1)**/api/v1/DappStaticCall**  - call a static method of a smart contract

Example (GET)
```js
http://127.0.0.1/api/v1/DappStaticCall?MethodName=Test&Account=540
```

Example (POST)
```js
http://127.0.0.1/api/v1/DappStaticCall
{
    "MethodName": "Test",
    "Account":540
    
}```

return value:
```js
{"result":1,"RetValue":"Test-ok"}
```



## GetCurrentInfo

2)**/api/v1/GetCurrentInfo** - get the current status of the blockchain

Params:
Diagram - if the value is 1, it will additionally return fields with hashrate information


Example:
http://127.0.0.1/api/v1/GetCurrentInfo?Diagram=0

Result:
* MaxNumBlockDB - the maximum block number stored in the database (the current height of the blockchain)
* CurBlockNum - new block to create
* MaxAccID - current maximum account number
* MaxDappsID  - current maximum Dapp number
* VersionNum - version of the program on which the node works


Result:
```
{"result":1,"VersionNum":706,"MaxNumBlockDB":12371158,"CurBlockNum":12371166,"MaxAccID":187783,"MaxDappsID":20,"FIRST_TIME_BLOCK":1530446400000}
```

## GetNodeList

3)**/api/v1/GetNodeList** - get a list of nodes that have a public API

Example:
http://127.0.0.1/api/v1/GetNodeList

Result:
```
{"arr":[{"ip":"149.154.70.158","port":80},{"ip":"195.211.195.236","port":88}],"result":1}
```


## GetAccountList 

4)**/api/v1/GetAccountList** - getting a list of accounts
#### Parameters:
* StartNum - start account number
* CountNum - count

Example:
```js
http://127.0.0.1/api/v1/GetAccountList
{
"StartNum":0,
"CountNum":1
}
```

or

```js
GET
http://127.0.0.1/api/v1/GetAccountList?StartNum=0&CountNum=1
```


Result:
```
{"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"Name":"System account","Value":{"SumCOIN":735207181,"SumCENT":160466160,"OperationID":29702004,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":0,"WN":"","PubKeyStr":"000000000000000000000000000000000000000000000000000000000000000000"}],"result":1}
```

## GetBlockList
5)**/api/v1/GetBlockList** - getting a list of blocks 
#### Parameters:
* StartNum - start block number
* CountNum - count of blocks

Example:
http://127.0.0.1/api/v1/GetBlockList?StartNum=38808420&CountNum=1

Result:
```
{"arr":[{"TreeHash":[236,201,209,200,64,153,154,154,228,120,110,155,233,182,224,205,188,2,76,67,233,21,214,142,11,5,104,37,98,82,88,15],"AddrHash":[158,58,3,0,0,0,140,27,149,34,0,0,103,167,164,169,0,0,216,41,7,214,0,0,135,12,82,0,119,117,0,49],"PrevHash":[15,102,34,8,31,46,114,169,212,208,168,192,116,223,245,244,97,114,62,40,0,12,151,116,91,28,224,190,119,117,0,49],"SumHash":[127,210,164,117,144,230,27,224,166,210,247,0,150,213,147,98,172,113,77,110,145,83,187,67,237,29,178,252,63,248,240,77],"SumPow":1470484535,"Reserv500":0,"TrDataPos":608676854,"TrDataLen":4427,"TrCount":0,"Info":"","BlockNum":38808420,"SeqHash":[240,137,252,138,122,26,39,117,178,31,127,174,26,174,61,232,104,96,203,58,75,193,63,102,132,232,233,152,202,93,27,171],"Hash":[146,246,242,25,180,187,80,36,252,199,2,90,237,135,165,157,68,219,66,81,227,13,7,139,134,33,69,78,24,2,253,88],"PowHash":[0,0,0,0,0,6,81,245,255,68,193,212,114,250,152,9,172,12,230,72,211,176,137,242,13,245,237,175,107,197,50,205],"Power":45,"bSave":true,"Prepared":true,"Num":38808420,"Miner":211614,"MinerName":"st","Hash1":[0,0,0,0,0,6,81,245,255,68,193,212,114,250,152,9,172,12,230,72,211,176,137,242,13,245,237,175,107,197,50,205],"Hash2":[0,0,0,0,0,4,168,148,24,111,113,113,186,30,146,247,249,88,216,178,89,4,71,123,196,44,170,165,176,132,49,114]}],"result":1}
```

## GetTransactionList
6)**/api/v1/GetTransactionList** -  getting a list of block transactions

Example:
http://127.0.0.1/api/v1/GetTransactionList?BlockNum=12373020?StartNum=0&CountNum=10
#### Parameters:
* BlockNum - block number
* StartNum - start tx number (from 0)
* CountNum - count of tx

Result:
```
{"arr":[{"body":{"type":"Buffer","data":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102]},"num":6656082722574,"hashPow":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"HASH":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"power":3,"TimePow":6656082722578.715,"Num":0,"Type":119,"Length":39,"Body":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102],"Script":"{\n  \"Type\": 119,\n  \"BlockNum\": 12372020,\n  \"Hash\": \"BF124C2EB16F1A6ECB9F17EB924DC7019559888E0E3F72BD0D063C1C4C0B9266\"\n}","Verify":1,"VerifyHTML":"<B style='color:green'>”</B>"}],"result":1}
```


## GetDappList 

7)**/api/v1/GetDappList* - getting a list of DApps

Example:
http://127.0.0.1/api/v1/GetDappList?StartNum=8&CountNum=1
#### Parameters:
* StartNum - start smart number
* CountNum - count

Result:
```
{"arr":[{"Version":0,"TokenGenerate":0,"ISIN":"","Zip":0,"BlockNum":10034043,"TrNum":0,"IconBlockNum":10033892,"IconTrNum":0,"ShortName":"","Name":"List-Lib","Account":187007,"AccountLength":1,"Category1":40,"Category2":0,"Category3":0,"Owner":186573,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"StateFormat":"","Description":"List-lib v1.0","Num":"8","CodeLength":3705,"HTMLLength":0}],"result":1}
```


## GetAccountListByKey

8)**/api/v1/GetAccountListByKey** - getting a list of accounts by public key

Example:
http://127.0.0.1/api/v1/GetAccountListByKey?Key=027AE0DCE92D8BE1F893525B226695DDF0FE6AD756349A76777FF51F3B59067D70

Result:
```
{"result":1,"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[2,122,224,220,233,45,139,225,248,147,82,91,34,102,149,221,240,254,106,215,86,52,154,118,119,127,245,31,59,89,6,125,112]},"Name":"Founder account","Value":{"SumCOIN":40000005,"SumCENT":0,"OperationID":7,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":8,"WN":""}]}
```
Note: public key in hex format can be taken from the wallet on EXPLORER -> Accounts (PubKey column)



## GetTransaction

9)**/api/v1/GetTransaction**  - get transaction (returns an object with the contents of the transaction)

#### Parameters:
* TxID - Transaction ID in hex format

an alternative to setting parameters:
* BlockNum - block number
* TrNum - the number of transactions in the block

example1:
```js
http://127.0.0.1/api/v1/GetTransaction
{
    "TxID": "BE10810FDE7A1317D9DF51D62D010000"
}
```
return:
```js
{
    "Type": 111,
    "Version": 3,
    "Reserve": 0,
    "FromID": 190085,
    "To": [
        {
            "PubKey": "",
            "ID": 190165,
            "SumCOIN": 1,
            "SumCENT": 0
        }
    ],
    "Description": "New6",
    "OperationID": 41,
    "Body": "",
    "Sign": "8C761F539A6A24427CF810A49140CA1FFBF0F3A48DCF58AEE0DD9E4A4E631E1A1B6DA86ED6E2EF92DBF537270AA02B5EAE3A7C822B3F70628CAD78525ED9E0F7",
    "result": 1,
    "BlockNum": 19781201,
    "TrNum": 0
}
```


example2:
```js
http://127.0.0.1/api/v1/GetTransaction
{
    "TxID": "04711036904F1F2DDF49CC7B2F010000"
}
```
return:
```js
{
    "Type": 100,
    "Currency": 0,
    "PubKey": "0240EDF5ECB25D886FD58DB92A53914FAC975078C1C2EDD1AC292B70C7BC13461F",
    "Name": "PrivTest02",
    "Adviser": 0,
    "Smart": 0,
    "Reserve": "000000",
    "result": 190552,
    "BlockNum": 19889100,
    "TrNum": 1
}

```
example3:
```js
GET
http://127.0.0.1/api/v1/GetTransaction?TxID=04711036904F1F2DDF49CC7B2F010000
```
example4:
GET
```js
http://127.0.0.1/api/v1/GetTransaction?BlockNum=19781201&TrNum=0
```


## GetHistoryTransactions

10)**/api/v2/GetHistoryTransactions**  - to get the transaction history of the account

#### Parameters:
* AccountID - account (account) number)
* Count - maximum number of rows returned - history depth (default 100)
* Confirm - min confirm for return tx (default 8)

option to set parameters for organizing page navigation:
* NextPos - history line ID number (this value is taken from the last line of the previous result)

Advanced setting:
* GetTxID - if set to 1, the transaction ID in hex-format is returned in the TxID field
* GetDescription - if set to 1, the transaction description is returned


example1:
```js
http://127.0.0.1/api/v2/GetHistoryTransactions
{
    "AccountID": 190480
}
```
return:
```js

{
    "result": 1,
    "History": [
        {
            "Type": 1,              //<---- History item type (currently only type 1 is supported)
            "BlockNum": 19994502,   //<---- number of the block in which the transaction is recorded
            "TrNum": 0,             //<---- the line number of the block in which the transaction is recorded
            "Pos": 498190,          //<---- position in the index file history (this position can be overwritten by overwriting the transaction, such as downloaded another block chain or run RewriteTransactions)
            "NextPos": 439090,      //<---- next position in the index file
            "Direct": "+",          //<---- "+"receipt of money," - " withdrawal of money
            "CorrID": 190478,       //<---- corresponding account (where the money came from or Vice versa where it went)
            "SumCOIN": 1,           //<---- Sum of the whole part of coins
            "SumCENT": 0            //<---- The sum of the fractional parts of coins
        },
        {
            "Type": 1,
            "BlockNum": 19993514,
            "TrNum": 0,
            "Pos": 439090,
            "NextPos": 0,
            "Direct": "+",
            "CorrID": 190478,
            "SumCOIN": 1,
            "SumCENT": 0
        }
    ],
    "Tail": {
        "NextPos": 498190,        //<---- link to the most recent transaction history update (i.e. the most recent history)
        "Reserv": {               //<---- not used (reserved for future versions)
            "type": "Buffer",
            "data": [
                0,
                0
            ]
        },
        "Num": 190480             //<---- account ID
    }
}
```
example2:
```js
http://127.0.0.1/api/v2/GetHistoryTransactions
{
    "NextPos": 439090
}
```

example3:
```js
GET
http://127.0.0.1/api/v1/GetHistoryTransactions?AccountID=190480
```

## SendHexTx

11)**/api/v1/SendHexTx**  - The transaction

To send a transaction, a number of processes must be performed on the client side:
1. To obtain the parameters of the user's account (OperationID)
2. Generate the transaction based on the account parameter (OperationID)
3. Sign transaction with private key
4. Convert the transaction in Hex format

If you have done all this, you can send the transaction command SendHexTx

P.S.
If this method is difficult for you, it is recommended to use API2, which is very easy to use.


Example:
```js
http://127.0.0.1/api/v1/SendHexTx?Hex=6F04FC0000000000BBE20200000001000000000009000000000000000000000001000000040054657374000000000000000012EB8196115106B9931E7D5BA05B6406E302F5A753378182BFF6F6BCE0407FAB56991286300BADDFF191B4A3722F1E9D10E70AE70476748840D6A24571382E1C
```
Result:
```
{"result":1,"text":"OK"}
```
Note: The transaction in hex format can be obtained if you use a functions from the js-library
* The library is located at: https://gitlab.com/terafoundation/tera/raw/master/Bin/Light/Tera-light.zip
* Example: http://dappsgate.com/_test-api.html



Note: for the correct operation of the examples, make sure that the OperationID is not lower than the current value in the user's account


12)**/GetSupply**  - returns a single number-the sum of the mined coins

Example (GET)
```js
http://127.0.0.1/GetSupply
```

return value:
```
643000000
```
