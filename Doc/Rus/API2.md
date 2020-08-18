# API v2 (для бирж и обменников)
Работает с версии обновления 991


API предназначено для облегчения написания сторонних приложений. На стороне сервера выполняется криптография и операции POW. Поэтому оно не рекомендуется для публичного доступа, т.к. нет защиты от DDOS атак. Используйте его, если приложения такие как сервер биржи находятся в одной приватной сети.

Данный API доступен если на полной ноде запущен http-хостинг и включена константа USE_HARD_API_V2. 

### Для этого задайте константы (из интерфейса полной ноды или в файле const.lst):
* "HTTP_HOSTING_PORT":80,
* "USE_HARD_API_V2":1,

Несмотря на то что API разработано для использования в POST запросах, в ограниченном режиме его можно использовать для GET запросов.


Предупреждение: блокчейн Тера имеет высокую скорость подтверждения блока (начиная от 4 сек), но т.к. он использует PoW, то возможно попадание в локальные орфан цепочки. Поэтому для надежной передачи ценности мы рекомендуем биржам выжидать дополнительное время, например 100 секунд, для интерпретации финальности транзакции.
В методах отправки транзакции в блокчейн (Send,CreateAccount,SendRawTransaction) есть параметр - Confirm в котором указывается число блоков-подтверждений. По умолчанию значение равно 8. Внимание: не рекомендуется устанавливать значение равное нулю, так как в этом случае доставка транзакции в блокчейн не гарантируется.


Формат вызова
```js
{{Server}}/api/v2/{{MethodName}}
```

Пример:
```js
http://127.0.0.1/api/v2/GenerateKeys
```

В качестве результат возвращается JSON, который содержит обязательное поле result со значением:
* 0 - запрос содержит ошибки или результат не возможно получить (например нет такого счета), 
* 1 или >1 - успешное выполнение запроса (в случае запросов создания новых счетов и режимом Confirm не равным нулю здесь возвращается номер созданного счета)

text - опциональное поле содержит подробное описание результата

Все методы поддерживают параметр Meta, если он задан, то это же значение добавляется в результат запроса. Это бывает полезно для организации собственной маршрутизации запросов, часто применяется в микро-сервисных архитектурах.

## GenerateKeys

1)**/api/v2/GenerateKeys** - создание пары приватный ключ - публичный ключ
#### Параметры не обязательны

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

2)**/api/v2/CreateAccount**  - создание нового счета (аккаунта). В Тере бесплатное создание счета возможно только в промежутках из 10 секунд. Платный вариант приведен в примере 2 метода **Send**
#### Параметры:
* Name - имя счета до 40 байт
* PrivKey - приватный ключ в hex-формате
* Currency - номер валюты (токена), по умолчанию 0 (Tera)
* Confirm - ожидание XXX подтверждений блоков в блокчейне, по умолчанию равно 8

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
result - возвращает номер созданного аккаунта


## Send

3)**/api/v2/Send**  - отправка монет с одного счета на другой (требуется указать приватный ключ счета отправителя)
#### Параметры:
* FromID - номер счета отправителя
* FromPrivKey - приватный ключ отправителя в hex-формате
* ToID - номер счета получателя, число или публичный ключ в hex-формате (в этом случае будет создан новый счет с именем заданным в первой строке описания платежа и в качестве оплаты создания счета спишется 10 Тера)
* Amount - сумма, число с плавающей точкой или объект в формате {SumCOIN,SumCENT}
* Description - описание платежка (необязательный параметр)
* Confirm - ожидание XXX подтверждений блоков в блокчейне, по умолчанию равно 8


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

example2 (создание нового счета):
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
result - возвращает номер созданного аккаунта



## GetBalance

4)**/api/v2/GetBalance**  - получить баланс счета
#### Параметры:
* AccountID - номер счета

example:
```js
http://127.0.0.1/api/v2/GetBalance
{
    "AccountID": 0
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

5)**/api/v2/GetTransaction**  - получить транзакцию (возвращает объект с содержимым транзакции)
#### Параметры:
* TxID - ИД транзакции в hex-формате

альтернативный вариант задания параметров:
* BlockNum - номер блока
* TrNum - номер транзакции в блоке

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
    "result": 1,
    "BlockNum": 19781201,
    "TrNum": 0
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
    "result": 190552,
    "BlockNum": 19889100,
    "TrNum": 1
}

```


## GetHistoryTransactions

6)**/api/v2/GetHistoryTransactions**  - получить историю транзакций счета

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
http://127.0.0.1/api/v2/GetHistoryTransactions
{
    "NextPos": 439090
}
```


=Добавочная часть к API2=

Вариант использования:
1. Computer A (has public keys) creates a raw unsigned transaction
2. Computer B (has secret keys) grabs and signs the raw transaction
3. computer A grabs the signed transaction and transmits it.



7)**/api/v2/CreateRawTransaction**  - create json payment tx  without a signature

#### Parameters:
* FromID - номер счета отправителя
* FromPrivKey - приватный ключ отправителя в hex-формате
* ToID - номер счета получателя, число или публичный ключ в hex-формате (в этом случае будет создан новый счет с именем заданным в первой строке описания платежа и в качестве оплаты создания счета спишется 10 Тера)
* Amount - сумма, число с плавающей точкой или объект в формате {SumCOIN,SumCENT}
* Description - описание платежка (необязательный параметр)

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
* Confirm - ожидание XXX подтверждений блоков в блокчейне, по умолчанию равно 8

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
    "Confirm":10
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
