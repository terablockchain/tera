
//accounts && tokens


var bWasCodeSys = 0;
var glMapCurrencyNum = {};
var glMapCurrencyName = {};


function AccToListArr(UserArr,MaxStrLength,FilterCurrency)
{
    var Arr=[];
    if(MaxStrLength===undefined)
        MaxStrLength=50;
    for(var i=0;i<UserArr.length;i++)
    {
        var Item=UserArr[i];
        //console.log(Item.BalanceArr)
        var Was=0;
        var Str=""+Item.Num + "." + Item.Name;
        MTokens:
            for(var n=0;Item.BalanceArr && n<Item.BalanceArr.length;n++)
            {
                var Token=Item.BalanceArr[n];
                if(FilterCurrency!==undefined && Token.Currency!=FilterCurrency)
                    continue;
                for(var j=0;j<Token.Arr.length;j++)
                {
                    var Value2=Token.Arr[j];
                    var Sum=FLOAT_FROM_COIN(Value2);
                    if(Sum)
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
                        Str+=Sum+" "+Token.Token;
                    }
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
    // console.log("window.NETWORK_ID",window.NETWORK_ID);
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
        RegCurrency(9, "BTC", "./PIC/B.svg", 1);
        RegCurrency(10, "USD", undefined, 1);

        AccCoinList = 571;
    }
    else
    if(window.NETWORK_NAME === "LOCAL-JINN")
    {
        // RegCurrency(9, "BTC", "./PIC/B.svg", 1);
        RegCurrency(52, "USD", undefined, 1);
        RegCurrency(48, "TERA-NFT", undefined, 1);

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
    if(!Name)
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
            GetData("GetDappList", {StartNum: Num, CountNum: 1, Fields: ["Num", "ShortName"]}, function (Data)
            {
                if(Data && Data.result && Data.arr.length)
                {
                    var Smart = Data.arr[0];
                    //console.log(Num,Data.arr)

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
            var Data=await AGetData("GetDappList", {StartNum:Num, CountNum:1,Fields:["Num","ShortName"]});
            if(Data && Data.result && Data.arr.length)
                ShortName=Data.arr[0].ShortName;
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
function NormalizeCurrencyName(Name)
{
    if(!Name)
    {
        return;
    }
    const LETTER = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    var Str = "";
    for(var i = 0; i < Name.length; i++)
    {
        var C = Name.substr(i, 1);
        var Index = LETTER.indexOf(C);
        if(Index < 0)
            continue;
        if(i === 0 && Index < 1)
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



InitMapCurrency();

