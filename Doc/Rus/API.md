# API v1
Работает с версии обновления 0.1263

Официальные публичные шлюзы, поддерживающие этот API:
* https://teraexplorer.org
* https://t1.teraexplorer.com
* https://t2.teraexplorer.com
* https://t4.teraexplorer.com
* https://t5.teraexplorer.com
* http://terablockchain.org
* http://dappsgate.com


Данный API доступен если на полной ноде запущен публичный http-хостинг т.е. включена константа HTTP_HOSTING_PORT

Для этого задайте константы (из интерфейса полной ноды или в файле const.lst):
```js
"HTTP_HOSTING_PORT":80,
```


Несмотря на то что API разработано для использования в POST запросах, в ограниченном режиме его можно использовать для GET запросов.



## DappStaticCall

1)**/api/v1/DappStaticCall**  - статический вызов метода смарт-контракта

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

2)**/api/v1/GetCurrentInfo** - получение текущего статуса блокчейна

Параметр:
Diagram - если значение равно 1, то дополнительно вернет поля с информацией по хешрейту

Example:
http://127.0.0.1/api/v1/GetCurrentInfo?Diagram=0

Result:
* MaxNumBlockDB - максимальный номер блока записанный в БД (текущая высота блокчейна)
* CurBlockNum - новый формируемый блок
* MaxAccID - текущий максимальный номер счета
* MaxDappsID  - текущий максимальный номер Dapp
* VersionNum - версия программы на которой работает нода


Результат:
```
{"result":1,"VersionNum":706,"MaxNumBlockDB":12371158,"CurBlockNum":12371166,"MaxAccID":187783,"MaxDappsID":20,"FIRST_TIME_BLOCK":1530446400000}
```

## GetNodeList

3)**/api/v1/GetNodeList** - получение списка нод, имеющий публичный интерфейс API

Пример:
http://127.0.0.1/api/v1/GetNodeList

Результат:
```
{"arr":[{"ip":"149.154.70.158","port":80},{"ip":"195.211.195.236","port":88}],"result":1}
```


## GetAccountList 

4)**/api/v1/GetAccountList** - получение списка счетов

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


Результат:
```
{"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"Name":"System account","Value":{"SumCOIN":735207181,"SumCENT":160466160,"OperationID":29702004,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":0,"WN":"","PubKeyStr":"000000000000000000000000000000000000000000000000000000000000000000"}],"result":1}
```

## GetBlockList
5)**/api/v1/GetBlockList** - получение списка блоков

Пример:
http://127.0.0.1/api/v1/GetBlockList?StartNum=38808420&CountNum=1

Результат:
```
{"arr":[{"TreeHash":[236,201,209,200,64,153,154,154,228,120,110,155,233,182,224,205,188,2,76,67,233,21,214,142,11,5,104,37,98,82,88,15],"AddrHash":[158,58,3,0,0,0,140,27,149,34,0,0,103,167,164,169,0,0,216,41,7,214,0,0,135,12,82,0,119,117,0,49],"PrevHash":[15,102,34,8,31,46,114,169,212,208,168,192,116,223,245,244,97,114,62,40,0,12,151,116,91,28,224,190,119,117,0,49],"SumHash":[127,210,164,117,144,230,27,224,166,210,247,0,150,213,147,98,172,113,77,110,145,83,187,67,237,29,178,252,63,248,240,77],"SumPow":1470484535,"Reserv500":0,"TrDataPos":608676854,"TrDataLen":4427,"TrCount":0,"Info":"","BlockNum":38808420,"SeqHash":[240,137,252,138,122,26,39,117,178,31,127,174,26,174,61,232,104,96,203,58,75,193,63,102,132,232,233,152,202,93,27,171],"Hash":[146,246,242,25,180,187,80,36,252,199,2,90,237,135,165,157,68,219,66,81,227,13,7,139,134,33,69,78,24,2,253,88],"PowHash":[0,0,0,0,0,6,81,245,255,68,193,212,114,250,152,9,172,12,230,72,211,176,137,242,13,245,237,175,107,197,50,205],"Power":45,"bSave":true,"Prepared":true,"Num":38808420,"Miner":211614,"MinerName":"st","Hash1":[0,0,0,0,0,6,81,245,255,68,193,212,114,250,152,9,172,12,230,72,211,176,137,242,13,245,237,175,107,197,50,205],"Hash2":[0,0,0,0,0,4,168,148,24,111,113,113,186,30,146,247,249,88,216,178,89,4,71,123,196,44,170,165,176,132,49,114]}],"result":1}
```

## GetTransactionList
6)**/api/v1/GetTransactionList** -  получение списка транзакций блока

Пример:
http://127.0.0.1/api/v1/GetTransactionList?BlockNum=12373020?StartNum=0&CountNum=10

Результат:
```
{"arr":[{"body":{"type":"Buffer","data":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102]},"num":6656082722574,"hashPow":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"HASH":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"power":3,"TimePow":6656082722578.715,"Num":0,"Type":119,"Length":39,"Body":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102],"Script":"{\n  \"Type\": 119,\n  \"BlockNum\": 12372020,\n  \"Hash\": \"BF124C2EB16F1A6ECB9F17EB924DC7019559888E0E3F72BD0D063C1C4C0B9266\"\n}","Verify":1,"VerifyHTML":"<B style='color:green'>”</B>"}],"result":1}
```


## GetDappList 

7)**/api/v1/GetDappList* - получение списка ДАпов

Пример:
http://127.0.0.1/api/v1/GetDappList?StartNum=8&CountNum=1

Результат:
```
{"arr":[{"Version":0,"TokenGenerate":0,"ISIN":"","Zip":0,"BlockNum":10034043,"TrNum":0,"IconBlockNum":10033892,"IconTrNum":0,"ShortName":"","Name":"List-Lib","Account":187007,"AccountLength":1,"Category1":40,"Category2":0,"Category3":0,"Owner":186573,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"StateFormat":"","Description":"List-lib v1.0","Num":"8","CodeLength":3705,"HTMLLength":0}],"result":1}
```


## GetAccountListByKey

8)**/api/v1/GetAccountListByKey** - получение списка счетов по публичному ключу

Пример:
http://127.0.0.1/api/v1/GetAccountListByKey?Key=027AE0DCE92D8BE1F893525B226695DDF0FE6AD756349A76777FF51F3B59067D70

Результат:
```
{"result":1,"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[2,122,224,220,233,45,139,225,248,147,82,91,34,102,149,221,240,254,106,215,86,52,154,118,119,127,245,31,59,89,6,125,112]},"Name":"Founder account","Value":{"SumCOIN":40000005,"SumCENT":0,"OperationID":7,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":8,"WN":""}]}
```
Комментарий: публичный ключ в формате hex можно взять из кошельке на EXPLORER->Accounts (колонка PubKey)



## GetTransaction

9)**/api/v1/GetTransaction**  - получить транзакцию (возвращает объект с содержимым транзакции)

#### Параметры:
* TxID - ИД транзакции в hex-формате

альтернативный вариант задания параметров:
* BlockNum - номер блока
* TrNum - номер транзакции в блоке


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

10)**/api/v1/GetHistoryTransactions**  - получить историю транзакций счета

#### Параметры:
* AccountID - номер счета (аккаунта)
* Count - максимальное число возвращаемых строк - глубина истории (по умолчанию 100)
* Confirm - min число подтверждений требуемых, чтобы транзакция попала в результат выдачи (по умолчанию 8)

вариант задания параметров для организации постраничной навигации:
* NextPos - номер ид строки истории (это значение берется из последней строки предыдущего результата)

Дополнительные параметры:
* GetTxID - если стоит 1 - то возвращается в поле TxID возвращается ID транзакции в 16 формате
* GetDescription - если стоит 1 - то возвращается описание транзакции в поле Description (если это описание доступно)


example1:
```js
http://127.0.0.1/api/v1/GetHistoryTransactions
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
            "Type": 1,              //<---- Тип элемента истории (пока поддерживается тип 1)
            "BlockNum": 19994502,   //<---- номер блока в котором записана транзакция
            "TrNum": 0,             //<---- номер строки блока в котором записана транзакция
            "Pos": 498190,          //<---- позиция в файле индекса истории (эта позиция может быть перезаписана при перезаписи транзакции, например загружена другая цепочка блоков или выполнена команда RewriteTransactions)
            "NextPos": 439090,      //<---- следующая позиция в файле индекса
            "Direct": "+",          //<---- "+" поступление денег, "-" списание
            "CorrID": 190478,       //<---- корреспондирующий счет (откуда пришли деньги или наоборот куда ушли)
            "SumCOIN": 1,           //<---- Сумма целой части монет
            "SumCENT": 0            //<---- Сумма дробной части монет
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
        "NextPos": 498190,        //<---- ссылка на самое последнее обновление истории транзакции (т.е. самая новая история)
        "Reserv": {               //<---- не используется (зарезервировано для будущих версий)
            "type": "Buffer",
            "data": [
                0,
                0
            ]
        },
        "Num": 190480             //<---- номер счета
    }
}
```
example2:
```js
http://127.0.0.1/api/v1/GetHistoryTransactions
{
    "NextPos": 439090
}
```

example3:
```js
GET
http://127.0.0.1/api/v1/GetHistoryTransactions?AccountID=190480
```

## SendTransactionHex

11)**/api/v1/SendTransactionHex**  - Отправка транзакции

Для отправка транзакции необходимо на стороне клиента выполнить ряд процессов:
1. Получить текущий номер блока блокчейна
2. Получить параметры счета пользователя (OperationID)
3. Сформировать транзакцию с учетом параметра счета (OperationID)
4. Подписать транзакцию приватным ключом
5. Установить номер блока в который попадет транзакция (используя информацию из пункта 1) 
6. Сформировать POW транзакции
7. Перевести транзакцию в Hex формат

Если вы все это сделали, вы можете отправить транзакцию командой SendTransactionHex

P.S.
Если этот метод труден для вас, то рекомендуетя использовать API2, который очень прост в использовании.


Пример:
```js
http://127.0.0.1/api/v1/SendTransactionHex?Hex=6F030000000000002D00000000000100000000008400000000000100000000000000000004007465737425000000000000007AA29739FD458DF8AB1139881DAA4584CCDA3D4995B6849FB1F55F3B2EA40704116647823E97A60C70213EFA8D83CBFBEE6D753FCA6771B4792985B57186F3BCFBCEC0000000930600000000
```
Результат:
```
{"result":1,"text":"OK"}
```
Комментарий: транзакцию в формате hex можно получить если использовать функции из библиотек на языке javascript
* Библиотеки находятся по адресу: https://gitlab.com/terafoundation/tera/raw/master/Bin/Light/Tera-light.zip
* Пример: http://dappsgate.com/_test-api.html

Внимание: для корректной работы примеры убедитесь что OperationID не ниже текущего значения в счете пользователя


```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test-API </title>


    <script type="text/javascript" src="./JS/client.js"></script>
    <script type="text/javascript" src="./JS/sha3.js"></script>
    <script type="text/javascript" src="./JS/crypto-client.js"></script>
    <script type="text/javascript" src="./JS/terahashlib.js"></script>
    <script type="text/javascript" src="./JS/wallet-lib.js"></script>
    <script type="text/javascript" src="./JS/sign-lib-min.js"></script>

    <script>

        //Init
        window.onload=function ()
        {
            window.DELTA_FOR_TIME_TX=+($("idDeltaTime").value);
            window.MainServer={ip:"dappsgate.com",port:80};

            //run every 1 sec for getting current block number and network time
            setInterval(function ()
            {
                GetData("GetCurrentInfo",{}, function (Data)
                {
                    if(Data && Data.result)
                        SetBlockChainConstant(Data);
                });
            },1000);
        }


        //Use API
        function SignTr()
        {
            var PrivKey=$("idPrivKey").value;
            var TR=JSON.parse($("idTr").value);




            GetSignTransaction(TR,PrivKey,function ()
            {
                TR.Sign=GetHexFromArr(TR.Sign);
                $("idTr").value=JSON.stringify(TR,"",4);
            });
        }

        function GetHexFromTr()
        {
            var TR=JSON.parse($("idTr").value);
            var Body=GetArrFromTR(TR);
            if(!TR.Sign)
            {
                $("idOut").value="Error: sign tx";
                return "";
            }

            var Arr=GetArrFromHex(TR.Sign);
            WriteArr(Body,Arr,64);
            Body.length+=12;
            CreateHashBodyPOWInnerMinPower(Body);
            var StrHex=GetHexFromArr(Body);

            $("idOut").value=StrHex;
            return StrHex;
        }

        function SendTr()
        {
            var StrHex=GetHexFromTr();
            if(!StrHex)
                return;

            GetData("SendTransactionHex",{Hex:StrHex}, function (Data)
            {
                if(Data && Data.result)
                {
                    $("idOut").value=Data.text;
                }
                else
                {
                    if(Data)
                        $("idOut").value="Error: "+Data.text;
                    else
                        $("idOut").value="Error";
                }

            });
        }

    </script>
</head>
<body>

<B>Priv key:</B>
<INPUT type="search" id="idPrivKey" value="7AF1726733E39D95DD7E9DAD1F6F2B76D0477B3B604439B1353B97BC24A72844" style="width: 600px"><BR>
<B>Tx</B> (after each transaction is sent, the OperationID number is increased by 1):<BR>
<textarea id="idTr" rows="20" cols="98">
{
    "Type": 111,
    "Version": 3,
    "Reserve": 0,
    "FromID": 189115,
    "OperationID": 101,
    "To": [
        {
            "PubKey": "",
            "ID": 9,
            "SumCOIN": 0,
            "SumCENT": 1
        }
    ],
    "Description": "Test",
    "Body": "",
    "Sign": ""
}
</textarea><BR>
<B>Actions:</B><BR>
<button onclick="SignTr()">Sign Tx</button>
<button onclick="GetHexFromTr()">Get Hex</button>
<button onclick="SendTr()">Send tx</button>


Delta block num: <INPUT type="number" id="idDeltaTime" value=2 style="width: 40px">


<BR><B>Result:</B><BR>
<textarea id="idOut" rows="20" cols="98"></textarea>
</body>
</html>
```

12)**/GetSupply**  - возвращает одно число-сумму намайненных монет

Example (GET)
```js
http://127.0.0.1/GetSupply
```

Результат:
```
643000000
```
