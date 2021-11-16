
//accounts && tokens


var bWasCodeSys = 0;
var glMapCurrencyNum = {};
var glMapCurrencyName = {};


//currency reg support
function GetItemCurrencyByNum(Num)
{
    return glMapCurrencyNum[Num];
}

function GetNameCurrencyByNum(Num)
{
    var Item=glMapCurrencyNum[Num];
    if(Item)
        return Item.Name;
    else
        return "";
}




async function InitMapCurrency()
{
    if(!window.NETWORK_ID)
        return ;

    //window.NETWORK_ID = window.NETWORK_NAME + "." + window.SHARD_NAME;
    //console.log("window.NETWORK_ID",window.NETWORK_ID);
    // console.log(window.NETWORK_NAME);
    // console.log(window.SHARD_NAME);

    var AccCoinList = 0;


    RegCurrency(0, window.SHARD_NAME, "./PIC/T.svg", 1);

    if(window.NETWORK_ID === "MAIN-JINN.TERA")
    {
        // RegCurrency(16, "BTC", "./PIC/B.svg", 1);
        // RegCurrency(110, "USD-R", undefined, 1);
        // RegCurrency(111, "DAO-R", undefined, 1);

        AccCoinList = 226857;
    }
    else
    if(window.NETWORK_ID === "TEST-JINN.TEST")
    {
        //RegCurrency(9, "BTC", "./PIC/B.svg", 1);
        //RegCurrency(10, "USD", undefined, 1);

        AccCoinList = 1635;
    }
    else
    if(window.NETWORK_NAME === "LOCAL-JINN")
    {
        // RegCurrency(9, "BTC", "./PIC/B.svg", 1);
        RegCurrency(66, "USD", undefined, 1);
        RegCurrency(73, "NFT", undefined, 1);

        //AccCoinList = 82;
    }
    else
    {
        //console.log(window.NETWORK_ID)
        //RegCurrency(3,"SOFT",undefined,1);
        //console.log(MapCurrency);
        return;
    }


    WasAccountsDataStr = "";
    if(!bWasCodeSys && AccCoinList)
    {
        //console.log("-------------------- bWasCodeSys:",bWasCodeSys)

        bWasCodeSys = 1;

        var Arr=await AStaticCall(AccCoinList, "GetList", {}, []);
        if(!Arr)
            return;

        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            //var Key = NormalizeCurrencyName(Item.Name);

            var Item2 = RegCurrency(Item.Num, Item.Name, undefined, Item.Flag & 1,1);
            if(Item2 && Item.Flag > 10)
            {
                var PathIcon = Math.floor(Item.Flag / 10);
                Item2.IconTrNum = PathIcon % 100;
                Item2.IconBlockNum = Math.floor(PathIcon / 100);
            }
        }
        WasAccountsDataStr = "";
        FillCurrencyList("idCurrencyList");

    }
}


function RegCurrency(Num,Name,PathIcon,System,Priority)
{
    if(!Name || Name.substr(0,5)==="Token")
        return;


    if(!Priority)
        Priority=0;

    var Item0=glMapCurrencyNum[Num];
    if(Item0 && Item0.Priority>Priority)
        return;

    var Item = {Num:Num, Name:Name, PathIcon:PathIcon, system:System, Priority:Priority};
    glMapCurrencyNum[Num] = Item;
    glMapCurrencyName[Name] = Item;


    return Item;
}


function FillCurrencyList(IdName)
{
    var dataList = $(IdName);
    if(!dataList)
        return;

    dataList.innerHTML = "";

    for(var key in glMapCurrencyName)
    {
        var name = key;
        var Item=glMapCurrencyName[key];
        var Options = document.createElement('option');
        Options.value = name;
        if(Item.system)
            Options.label = "system";
        dataList.appendChild(Options);
    }
}

//tokens name

function GetTokenName(Num,Name)
{
    if(!Name)
        Name = "Token";
    if(Num === undefined)
        return "---";
    else
    if(!Num)
        return escapeHtml(Name);
    else
    {
        //return "" + Num + "." + escapeHtml(Name);
        //return escapeHtml(Name)+"☰"+Num;
        const UniTab=["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"];
        var StrNum=String(Num);
        for(var n=0;n<10;n++)
            StrNum=StrNum.replace(new RegExp(""+n, "g"),UniTab[n]);
        return  escapeHtml(Name)+StrNum;
    }

}

async function ACurrencyNameItem(Item)
{
    return ACurrencyName(Item.Currency,Item.CurrencyObj?Item.CurrencyObj.ShortName:"");
}
// function CurrencyNameItem(Item)
// {
//     return CurrencyName(Item.Currency,Item.CurrencyObj?Item.CurrencyObj.ShortName:"");
// }

function CurrencyName(Num,ShortName)
{
    var Name = GetNameCurrencyByNum(Num);
    if(!Name)
    {
        if(ShortName)
        {
            Name = GetTokenName(Num, ShortName);
            RegCurrency(Num,Name);
        }
        else
        {

            GetSmartList({StartNum: Num, CountNum: 1, Fields: ["Num", "ShortName"]}, function (Err,DataArr)
            {
                if(!Err && DataArr && DataArr.length)
                {
                    var Smart = DataArr[0];
                    Name = GetTokenName(Smart.Num, Smart.ShortName);
                    RegCurrency(Num,Name);
                }
            });

            Name = GetTokenName(Num, "");
        }
    }
    return Name;
}

async function ACurrencyName(Num,ShortName)
{
    var Name = GetNameCurrencyByNum(Num);
    if(!Name)
    {
        if(!ShortName)
        {
            var Smart=await AReadSmart( Num, ["Num", "ShortName"]);
            if(Smart)
                ShortName=Smart.ShortName;
            else
                ShortName="error";

        }
        Name = GetTokenName(Num, ShortName);
        RegCurrency(Num,Name);
    }
    return Name;
}


function ARetHistoryCurrency(Item)
{
    return ACurrencyName(Item.Currency,Item.Token);
}


async function FillCurrencyAsync(IdName)
{
    await InitMapCurrency();


    FillCurrencyList(IdName);
}


//For UI
function NormalizeCurrencyName(Name,bCent)
{
    if(!Name)
    {
        return "";
    }
    const LETTER = "-_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LETTER2 = "-_0123456789abcdefghijklmnopqrstuvwxyz";
    var Str = "",StrList;
    if(bCent)
    {
        StrList = LETTER2;
    }
    else
    {
        StrList = LETTER;
        Name = Name.toUpperCase();
    }

    for(var i = 0; i < Name.length; i++)
    {
        var C = Name.substr(i, 1);
        var Index = StrList.indexOf(C);
        if(Index < 0)
            continue;
        if(Str.length === 0 && Index < 12)
            continue;
        Str = Str + C;
    }

    return Str;
}

function ValidateCurrency(Element)
{
    var Num = FindCurrencyNum(Element.value);
    var Item = glMapCurrencyNum[Num];
    if(Item && Item.Name)
        Element.value = Item.Name;
}

function FindCurrencyNum(Name)
{
    Name = NormalizeCurrencyName(String(Name).toUpperCase());
    var Item = glMapCurrencyName[Name];
    if(Item)
    {
        return Item.Num;
    }

    //TODO
    return parseInt(Name);
}


async function CheckNetworkID(Data)
{
    //console.log("Was ",window.NETWORK_ID);
    if(Data.NETWORK && Data.SHARD_NAME)// && !window.NETWORK_ID)
    {
        window.SHARD_NAME = Data.SHARD_NAME;
        window.NETWORK_NAME = Data.NETWORK;
        window.NETWORK_ID = Data.NETWORK + "." + Data.SHARD_NAME;
        //console.log("Set ",window.NETWORK_ID);
        await InitMapCurrency();
    }
}



function AccToListArr(UserArr,MaxStrLength,FilterCurrency)
{
    var Arr=[];
    if(MaxStrLength===undefined)
        MaxStrLength=50;
    for(var i=0;i<UserArr.length;i++)
    {
        var Item=UserArr[i];
        if(!Item)
            continue;
        //console.log(Item.BalanceArr)
        var Was=0;
        var Str=""+Item.Num + "." + Item.Name;
        //console.log("Item.BalanceArr=",Item.BalanceArr);
        MTokens:
        for(var n=0;Item.BalanceArr && n<Item.BalanceArr.length;n++)
        {
            var Token=Item.BalanceArr[n];
            if(FilterCurrency!==undefined && Token.Currency!=FilterCurrency)
                continue;
            var TokenSum=0;
            var NFTSum=0;
            for(var j=0;j<Token.Arr.length;j++)
            {
                var Value2=Token.Arr[j];
                var Sum=FLOAT_FROM_COIN(Value2);
                if(Sum)
                {
                    if(Value2.ID && Value2.ID!=="0")
                        NFTSum += Sum;
                    else
                        TokenSum += Sum;
                }
            }
            if(TokenSum || NFTSum)
            {
                if(Was && Str.length>=MaxStrLength)
                {
                    if(MaxStrLength)
                        Str+="...";
                    break MTokens;
                }
                if(Was)
                    Str+="; ";
                else
                    Str+=" (";
                Was=1;
                if(NFTSum)
                {
                    if(NFTSum && TokenSum)
                        Str+=TokenSum+" "+Token.Token + ", NFT: " + NFTSum;
                    else
                        Str+=" "+Token.Token+" NFT: " + NFTSum;
                }
                else
                if(TokenSum)
                    Str+=TokenSum+" "+Token.Token;
            }
        }
        if(Was)
            Str+=")";
        else
        {
            if(FilterCurrency!==undefined)
                continue;
        }
        var Value = {value:Item.Num, text:Str,Item:Item};
        //var Value={value:Item.Num, text:Item.Num+"."+Item.Name+"  "+SUM_TO_STRING(Item.Value,Item.Currency,1)};
        Arr.push(Value);
    }
    return Arr;
}

function FindBalance(AccObj,Currency,ID)
{
    if(AccObj && AccObj.BalanceArr)
    {
        if(Currency===undefined)
            return AccObj.BalanceArr;

        for(var i=0;i<AccObj.BalanceArr.length;i++)
        {
            var Token=AccObj.BalanceArr[i];
            if(Token.Currency===Currency)
            {
                if(ID===undefined)
                    return Token.Arr;
                for(var n=0;n<Token.Arr.length;n++)
                {
                    if(Token.Arr[n].ID===ID)
                        return Token.Arr[n];
                }
            }
        }
    }
    return {SumCOIN:0,SumCENT:0};
}

//----------------------------- Token/NFT imgs
function GetTokenImage(ID,classname)
{
    if(!classname)
        classname="";
    if(!ID)
    {
        if(!window.SMART)
            return "";
        if(!SMART.IconBlockNum)
            return "";
        var SrcPath=GetURLPath("/file/" + SMART.IconBlockNum + "/" + SMART.IconTrNum)
        return `<img class="${classname}" src="${SrcPath}">`;
    }

    var StrID="idImg"+ID;
    var Element=$(StrID);
    if(Element && Element.src)
    {
        return `<img class="${classname}" src="${Element.src}"  id="${StrID}">`;
    }

    return `<img class="${classname} load_from_nft" data-id="${ID}" id="${StrID}">`;
}
function ConvertTokenImages()
{
    var modals = document.querySelectorAll(".load_from_nft");
    modals.forEach(SetTokenImage);
}

async function SetTokenImage(Item)
{
    var ID=Item.dataset.id;
    Item.classList.remove('load_from_nft');

    var Attr=await GetNFTData(ID);
    if(Attr)
        Item.src = GetURLPath(Attr.image);
}

//function SetTokenImage(Item)
// {
//     var ID=Item.dataset.id;
//     var Addr="/nft/"+ID;
//     Item.classList.remove('load_from_nft');
//
//     var Addr2=GetURLPath(Addr);
//
//     fetch(Addr2, {method:'get', cache:'default', mode:'cors', credentials2:'include', headers:this.Headers}).then(function (response)
//     {
//         response.text().then(function (text)
//         {
//             if(text.substr(0,1)==="{")
//             {
//                 var Attr=JSON.parse(text);
//                 //console.log(ID,Attr);
//                 if(Attr)
//                     Item.src = GetURLPath(Attr.image);
//             }
//         });
//     }).catch(function (err)
//     {
//         //console.log(err);
//     });
// }


async function GetNFTData(ID)
{
    var Addr="/nft/"+ID;
    var Addr2=GetURLPath(Addr);

    return new Promise(function(resolve, reject)
    {
        fetch(Addr2, {method:'get', cache:'default', mode:'cors', credentials2:'include', headers:this.Headers}).then(function (response)
        {
            response.text().then(function (text)
            {
                if(text.substr(0,1)==="{")
                {
                    var Attr=JSON.parse(text);
                    resolve(Attr);
                }
            });
        }).catch(function (err)
        {
            reject(err);
        });
    });
}


InitMapCurrency();

