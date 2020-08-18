# API v2 (for exchanges)
Works with update version 991

The API is designed to make it easier to write third-party applications. Server-side cryptography and POW operations are performed. Therefore, it is not recommended for public access, because it is not protected from DDOS attacks. Use it if applications such as the exchange server are on the same private network.

This API is available if fullnode server is running http and hosting included constant USE_HARD_API_V2.

### Set the constants (file const.lst):
```js
 "HTTP_HOSTING_PORT":80,
 "USE_HARD_API_V2":1,
```


Although the API is designed for use in POST requests, it can be used for GET requests in a limited mode.


Warning: the Tera blockchain has a high rate of block confirmation (starting from 4 seconds), but since it uses PoW, it is possible to get into local orphan chains. Therefore, for a reliable transfer of value, we recommend that exchanges wait for additional time, such as 100 seconds, to interpret the finality of the transaction.
In the method of sending transactions to the blockchain (Send,CreateAccount,SendRawTransaction) have a Confirm parameter which specifies the number of blocks-confirmations. The default value is 8. Attention: it is not recommended to set the value equal to zero, as in this case, the delivery transaction in the blockchain is not guaranteed.

Call format: 
```js
{{Server}}/api/v2/{{MethodName}}
```
Example:
```js
http://127.0.0.1/api/v2/GenerateKeys
```

As a result, JSON is returned, which contains the required result field with the value:
* 0 - the request contains errors or the result is not possible to get (for example, there is no such account), 
* 1 or >1 - successful execution of the query (in the case of requests of creating new accounts and Confirm the mode is not equal to zero returns the number of created accounts)

text - the optional field contains a detailed description of the result

All methods support the Meta parameter, if it is specified, the same value is added to the query result. This is useful for organizing your own query routing, often used in micro-service architectures.

## GenerateKeys

1)**/api/v2/GenerateKeys** - create private key - public key pair
#### Parameters are not required

example:
```js
http://127.0.0.1/api/v2/GenerateKeys 
```
return:
```js
{
    "result": 1,
    "PrivKey": "65C65BE3F436DE58C64461BDC1BF0E2D8AB06C2C4E92470B1F4CDEADB9B2C3FF",
    "PubKey": "030809551AD9E0E275082C75EC82E9651BF062821EC6DFE31039B0EDE6A2ED26CC"
}
```

## CreateAccount

2)**/api/v2/CreateAccount**  - create a new account (account). In Tere free account creation is possible only in the intervals of 10 seconds. The paid version is given in the example of 2 methods **Send**
#### Parameters:
* Name - account name up to 40 bytes
* PrivKey - private key in hex-format
* Currency - the currency(token) number, the default is 0 (Tera)
* Confirm - wait XXX confirmation of blocks in blockchain, the default value is 8

example:
```js
http://127.0.0.1/api/v2/CreateAccount
{
    "Name": "PrivTest02",
    "PrivKey": "A2D45610FE8AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033",
    "Currency":16,
    "Confirm":10
}
```
return:
```js
{
    "result": 190552,
    "text": "Add to blockchain",
    "TxID": "04711036904F1F2DDF49CC7B2F010000",
    "BlockNum": 19889100
}
```
result - returns the id (number) of the created account


## Send

3)**/api/v2/Send**  - sending coins from one account to another (you need to specify the private key of the sender's account)
#### Parameters:
* FromID - the account number of the sender
* FromPrivKey - sender private key in hex format
* ToID - the account number of the recipient, the number or public key in hex format (in this case, it will create a new account with the name specified in the first line of the description of the payment and the payment the account will be charged 10 Tera)
* Amount - sum, floating-point number, or object format {SumCOIN,SumCENT}
* Description - description of payment order (optional)
* Confirm - wait XXX confirmation of blocks in blockchain, the default value is 8


example1:
```js
http://127.0.0.1/api/v2/Send
{
    "FromID": 190085,
    "FromPrivKey": "A2D45610FE8AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033",
    "ToID":190165,
    "Amount":10.5,
    "Description":"Тест",
    "Confirm":10
   
}
```
return:
```js
{
    "result": 1,
    "text": "Add to blockchain",
    "TxID": "C08A0C18C1ABF4062B149B7C2F010000",
    "BlockNum": 19889307
}
```

example2 (create new account):
```js
http://127.0.0.1/api/v2/Send
{
    "FromID": 190059,
    "FromPrivKey": "A2D45610FE8AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033",
    "ToID":"0240EDF5ECB25D886FD58DB92A53914FAC975078C1C2EDD1AC292B70C7BC13461F",
    "Amount":10,
    "Description":"New account",
    "Confirm":10
   
}
```

return:
```js
{
    "result": 190551,
    "text": "Add to blockchain",
    "TxID": "9DD4869C4515B2A3340E887A2F010000",
    "BlockNum": 19888776
}
```

result - returns the id (number) of the created account


## GetBalance

4)**/api/v2/GetBalance**  - get account balance
#### Parameters:
* AccountID - account number

example:
```js
http://127.0.0.1/api/v2/GetBalance
{
    "AccountID": 9
}
```
return:
```js
{
    "result": 1,
    "SumCOIN": 5589146,
    "SumCENT": 555765670,
    "Currency": 0,
    "PubKey": "02769165A6F9950D023A415EE668B80BB96B5C9AE2035D97BDFB44F356175A44FF"
}
```

## GetTransaction

5)**/api/v2/GetTransaction**  - get transaction (returns an object with the contents of the transaction)
#### Parameters:
* TxID - Transaction ID in hex format

an alternative to setting parameters:
* BlockNum - block number
* TrNum - the number of transactions in the block

example1:
```js
http://127.0.0.1/api/v2/GetTransaction
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
    "result": 1
}
```
example2:
```js
http://127.0.0.1/api/v2/GetTransaction
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
    "result": 190552
}
```

## GetHistoryTransactions

6)**/api/v2/GetHistoryTransactions**  - to get the transaction history of the account

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





=Addition API2=

Case for use:
1. Computer A (has public keys) creates a raw unsigned transaction
2. Computer B (has secret keys) grabs and signs the raw transaction
3. computer A grabs the signed transaction and transmits it.



7)**/api/v2/CreateRawTransaction**  - create json payment tx  without a signature

#### Parameters:
* FromID - the account number of the sender
* ToID - the account number of the recipient, the number or public key in hex format (in this case, it will create a new account with the name specified in the first line of the description of the payment and the payment the account will be charged 10 Tera)
* Amount - sum, floating-point number, or object format {SumCOIN,SumCENT}
* Description - description of payment order (optional)

example:
```js
http://127.0.0.1/api/v2/CreateRawTransaction
{
    "FromID": 187004,
    "ToID":190650,
    "Amount":10.5,
    "Description":"Тест"
   
}
```

return:
```js
{
    "result": 1,
    "Tx":    {
        "Type": 111,
        "Version": 3,
        "FromID": 187004,
        "OperationID": 118,
        "To": [
            {
                "PubKey": "",
                "ID": 190650,
                "SumCOIN": 10,
                "SumCENT": 500000000
            }
        ],
        "Description": "Тест",
        "Sign": ""
    }
}
```



8)**/api/v2/SignRawTransaction**  - sign tx

#### Parameters:
* Tx - JSON object
* FromPrivKey - sender private key in hex format

example:
```js
http://127.0.0.1/api/v2/SignRawTransaction
{
    "Tx":    {
        "Type": 111,
        "Version": 3,
        "FromID": 187004,
        "OperationID": 118,
        "To": [
            {
                "PubKey": "",
                "ID": 190650,
                "SumCOIN": 10,
                "SumCENT": 500000000
            }
        ],
        "Description": "Тест",
        "Sign": ""
    },
    "FromPrivKey": "98765432108AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033"
}
```

return:
```js
{
    "result": 1,
    "Tx":    {
        "Type": 111,
        "Version": 3,
        "FromID": 187004,
        "OperationID": 118,
        "To": [
            {
                "PubKey": "",
                "ID": 190650,
                "SumCOIN": 10,
                "SumCENT": 500000000
            }
        ],
        "Description": "Тест",
        "Sign": "123456789ABCD931F3A2D45610FE8AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C0332480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033"
    }
}
```

9)**/api/v2/SendRawTransaction**  - send tx to TERA network

#### Parameters:
* Tx -JSON object
* Confirm - wait XXX confirmation of blocks in blockchain, the default value is 8

example:
```js
http://127.0.0.1/api/v2/SendRawTransaction
{
    "Tx":    {
        "Type": 111,
        "Version": 3,
        "FromID": 187004,
        "OperationID": 118,
        "To": [
            {
                "PubKey": "",
                "ID": 190650,
                "SumCOIN": 10,
                "SumCENT": 500000000
            }
        ],
        "Description": "Тест",
        "Sign": "123456789ABCD931F3A2D45610FE8AC931F32480BFE3E78D26E45B0A4F88045D6518263DA12FA9C0332480BFE3E78D26E45B0A4F88045D6518263DA12FA9C033"
    },
    "Confirm":20
}
```


return:
```js
{
    "result": 1,
    "text": "Add to blockchain",
    "TxID": "1234567891ABF4062B149B7C2F010000",
    "BlockNum": 22222900
}
```
