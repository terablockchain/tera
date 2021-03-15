# Библиотека доступа к Тера кошельку на фронтальной части сайта

В случае если пользователь имеет аккаунт (кошелек) созданный на веб-сайте terawallet.org, то данная библиотека дает третьим  сайтам возможность  взаимодействовать с его кошельком. Если проводить аналогию с блокчейном Эфириум то это похоже на плагин Метамаск, за исключением того что никакие плагины устанавливать не нужно. Кошелек TeraWallet написан целиком на JavaScript и секретный ключ хранит на стороне клиента в локальном хранилище браузера.
    


Возможности:
- Отправка монет (денежная транзакция)
- Работа с методами смарт-контракта (отправка транзакций, вызов статических методов)
- Создание счетов с прикрепленным даппом



### Note
В данном тексте понятие дапп и смарт-контракта является синонимами

- Смарт-контракт - код который выполняется на серверной части на нодах
- Дапп - более широкое понятие, он включает в себя код смарт-контракта и код исполняющийся на клиентских устройствах, например, в браузерах 


Отправка монет и вызов статических методов может работать на любых сайтах.
Создание счетов и вызов методов смарт-контракта - только с разрешенных сайтов, смарт-контракт должен иметь функцию **CheckAccess** с такой  проверкой:

###### Пример:
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
 

##### Подключение библиотеки:
```js
<script type="text/javascript" src="https://terawallet.org/JS/web3-tera.js"></script>
```

После подключения становится доступен глобальный объект **web3.tera**


#### Login
**web3.tera.Login(DappNum)** - авторизация к кошельку пользователя, если в этой сессии браузера еще не было авторизации то открывается форма запроса действия к пользователю.
Авторизация кошелька нужна для работы с даппом (отправка методов, создание счетов)

###### Параметры:     
- DappNum - номер даппа (обязательный параметр)
###### Пример:
```js
    web3.tera.Login(128);
```
---
### Методы требующие предварительной авторизации  (методом Login) 

#### SendCall
**web3.tera.SendCall(Data,F)** - отправка транзакции вызова метода смарт-контракта
###### Параметры:     
- Data - структура определяющая параметры вызова, которая состоит из полей:  {From, To, Method, Params, ParamsArr}
- F - функция обратного вызова с результатом отправки, функции возвращается объект имеющий структуру: {result,text,TR}
 
###### Пример:
```js
web3.tera.SendCall({From:113, To:113, Method:"Method1", Params:{Sum:5}},function (Data)
{
    console.log("Send Method result = "+Data.result+" "+Data.text);
});
```


#### CreateAccount
**web3.tera.CreateAccount(Data,F)** - отправка транзакции создания нового счета привязанного к смарт-контракту
###### Параметры:     
- Data - структура определяющая параметры вызова, которая состоит из полей:  {Currency, Description}
- F - функция обратного вызова с результатом отправки, функции возвращается объект имеющий структуру: {result,text,TR}
 
###### Пример:
```js
web3.tera.CreateAccount({Currency:0, Description:"Test account"},function (Data)
{
    console.log("Send CreateAccount result = "+Data.result+" "+Data.text);
});
```

---
### Методы не требующие предварительной авторизации  (методом Login)   
     
#### Send
**web3.tera.Send(Data)** - инициация отправки монет через открытие формы запроса к пользователю. Сама отправка монет осуществляется в кошельке. Данный метод фактически является всего лишь автозаполнением полей: Счета получателя, Суммы и Описание платежа. 
###### Параметры:     
- Data - структура определяющая параметры перевода монет, которая состоит из полей:  {To, Sum, Description}

###### Пример:
```js
web3.tera.Send({To:20, Sum:1.5, Description:"Test only"});
```  

#### StaticCall
**web3.tera.StaticCall(Data,F)** - статический (т.е. без отправки транзакции) вызов метода смарт-контракта
###### Параметры:     
- Data - структура определяющая параметры вызова, которая состоит из полей:  {To, Method, Params, ParamsArr}
- F - функция обратного вызова с результатом отправки, функции возвращается объект имеющий структуру: {result,RetValue}
 
###### Пример:
```js
web3.tera.StaticCall({From:0, To:226688, Method:"HellowWorld", Params:{}},function (Data)//223295
{
    if(Data.result)
        console.log("OK, result="+Data.RetValue);
});

```  
     

---
### События и структуры получения актуальной информации по даппу   
Примечание: эти действия возможны только после авторизации
   
#### OnLogin
**web3.tera.OnLogin(F)** - получение информации об авторизации
###### Параметры:     
F - функция обратного вызова в который передается результат: 
- 0 - выполнен выход из кошелька
- 1 - выполнен вход в кошелек, 
 
###### Пример:
```js
web3.tera.OnLogin(function (Result)
{
    console.log("Login="+Result);
});
```  
  
#### OnInfo
 **web3.tera.OnInfo(F)** - получение актуальной информации по даппу и состояния кошелька пользователя
 ###### Параметры:     
 F - функция обратного вызова (осуществляется автоматический периодический вызов), возвращает структуру с данными:
 ArrWallet - массив со списком счетов кошелька, каждый счет это структура: {Num, Name, Currency, PubKey, PubKeyStr, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}}
 Account - базовый (основной) счет смарт-контракта, структура: {Num, Name, Currency, PubKey, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}}
 Smart - свойства смарт-контракта, структура: {Num, Name, ShortName, Account, AccountLength, Owner, TokenGenerate}
 NETWORK - имя сети
 SHARD_NAME - имя шарда
 CurBlockNum - текущий (последний) номер блока
 PRICE_DAO  - цены платных транзакций, структура: {NewAccount, NewShard, NewSmart, NewTokenSmart, Storage}
 
  
  

  
 ###### Пример:
 ```js
 web3.tera.OnInfo(function ()
 {
     console.log(web3.tera.INFO);
 });
 ```  
  
#### OnEvent
**web3.tera.OnEvent(F)** - получение очередного нового события по даппу, вызванного методом  Event в смарт-контракте
###### Параметры:     
F - функция обратного вызова в который передается событие вызванное из метода смарт-контракта
 
###### Пример:
```js
web3.tera.OnEvent(function (Data)
{
    console.log(Data);
});
```  
 
 
     
---
#### InjectHTML
**web3.tera.InjectHTML(UrlPath,DappNum)** - вставка в веб-страницу кода кошелька и автоматический логин после загрузки. В случае если метод не был вызыван, то вставка кода автоматически осуществляется при первом вызове метода Login() 
###### Параметры:     
- UrlPath - путь к кошельку, по умолчанию: https://terawallet.org/web3-wallet.html (необязательный параметр)
- DappNum - номер даппа (необязательный параметр)
 
###### Пример:
```js
    window.addEventListener('load',function ()
    {
        web3.tera.InjectHTML('http://127.0.0.1/web3-wallet.html');
    });
```     
     
     
---     
### API Dapp functiojns

#### GetAccountList
**GetAccountList(Params,F)** - получение массива счетов (аккаунтов) с данными
###### Параметры:     
- Params - параметры вызова, структура с полями: {StartNum,CountNum} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * arr - массив счетов, имеющих структуру: {Num, Name, Currency, PubKey, PubKeyStr, SmartObj, SmartState, Value:{SumCOIN, SumCENT,Smart}} 

###### Пример:
 ```js
web3.tera.GetAccountList({StartNum:205,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  

#### GetSmartList
**GetSmartList(Params,F)** - получение массива смарт-контрактов с данными
###### Параметры:     
- Params - параметры вызова, структура с полями: {StartNum,CountNum} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * arr - массив смарт-контрактов, имеющих структуру:  {Num, Name, ShortName, Account, AccountLength, Owner, TokenGenerate} 

###### Пример:
 ```js
web3.tera.GetSmartList({StartNum:8,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  


#### GetBlockList
**GetBlockList(Params,F)** - получение массива блоков с данными
###### Параметры:     
- Params - параметры вызова, структура с полями: {StartNum,CountNum} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * arr - массив блоков:  {Num, Hash, PowHash, Power, TxCount, Miner, MinerHash} 

###### Пример:
 ```js
web3.tera.GetBlockList({StartNum:154752,CountNum:5},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  

#### GetTransactionList
**GetTransactionList(Params,F)** - получение массива транзакций
###### Параметры:     
- Params - параметры вызова, структура с полями: {BlockNum,StartNum,CountNum} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * arr - массив транзакций:  {Num, Type, Body, TxID, Verify} 

###### Пример:
 ```js
web3.tera.GetTransactionList({BlockNum:154753,StartNum:0,CountNum:100},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  




#### GetBlockFile
**GetBlockFile(Params,F)** - получение данных транзакции (в виде объекта)
###### Параметры:     
- Params - параметры вызова, структура с полями: {BlockNum,TrNum} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * Body - транзакция в виде объекта, структура зависит от типа транзакции, например транзакция вызова метода смарт-контракта: {Type, Version, Account, FromNum, MethodName, OperationID, Params, ParamsArr, Sign}
  
###### Пример:
 ```js
web3.tera.GetBlockFile({BlockNum:155303,TrNum:0},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  



  
#### ComputeSecret
**ComputeSecret(Params,F)** - получение общего секрета своего ключа с другим публичным ключом. Применяется для шифрования данных.
###### Параметры:     
- Params - параметры вызова, структура с полями: {PubKey} 
- F - функция обратного вызова в которую возвращается ответ с результатом

Структура ответа:
 * result - результат выполнения, 1 - успешно
 * RetValue - байтовый массив с общим секретом
  
###### Пример:
 ```js
web3.tera.ComputeSecret({PubKey:"0310DC3B2CD4F88BC0A420E22250A0370E676B48E25B043669C48E46BA3EC55A8A"},function (Data)
{
    if(Data.result)
        console.log(Data);
});
 ```  





Общий пример внешней html-страницы с доступом к кошельку terawallet.org:

https://gitlab.com/terafoundation/dapps/-/blob/master/JSWallet/WWWPage.html

