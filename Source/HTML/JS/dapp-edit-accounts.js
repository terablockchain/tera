//play mode - dapp-edit-accounts
window.ACCOUNTS=
    {
        ReadStateTR: function (Num)
        {
            var Data=VM_ACCOUNTS[Num];
            if(Data)
            {
                if(Data.Currency)
                {
                    Data.CurrencyObj = SMARTS.ReadSmart(Data.Currency);
                }

                //ERC
                Data.BalanceArr=ReadBalanceArr(Data);
            }

            return Data;
        },
        GetBalance:function (Account,Currency,ID)
        {
            if(!Currency)
            {
                var Data = ACCOUNTS.ReadStateTR(Account);
                if(Data)
                    return {SumCOIN:Data.Value.SumCOIN, SumCENT:Data.Value.SumCENT, Currency:Currency};
            }
            else
            {
                var Smart = SMARTS.ReadSmart(Currency);

                var RetValue=CallMethodStatic(Smart, "OnGetBalance", Account,ID,0);
                if(RetValue)
                {
                    if(RetValue.length)
                        RetValue={Arr:RetValue};
                    RetValue.ID=ID;
                    RetValue.Currency=Currency;

                    return RetValue;
                }
            }

            return {SumCOIN:0,SumCENT:0,Currency:Currency,ID:ID};
        }

    };


function RegInWallet(BlockNum,Account,SmartNum)
{

    var Item=ReadRegWallet(Account);
    var ItemArr=Item.Arr;

    for(var i=0;i<ItemArr.length;i++)
        if(ItemArr[i]===SmartNum)
            return  0;//was add

    if(ItemArr.length>=10)
        return  0;//not add

    ItemArr.push(SmartNum);

    WriteRegWallet(Item);

    if(ItemArr.length>10)
        return 2;//need pay
    else
        return 1;
}
function WriteRegWallet(Item)
{
    VM_KEY_VALUE[Item.Key]=Item;
}
function ReadRegWallet(Account)
{
    var Key="0:WALLET:"+Account;
    var Item=VM_KEY_VALUE[Key];

    if(!Item)
        Item={Arr:[]};

    Item.Key=Key;
    return Item;
}

function ReadBalanceArr(Data)
{
    var Arr=ReadSoftBalanceArr(Data);
    if(!Arr)
        Arr=[];

    var Value={ID:"",SumCOIN:Data.Value.SumCOIN,SumCENT:Data.Value.SumCENT};
    var Smart=Data.CurrencyObj;
    var Token,IconBlockNum,IconTrNum;
    if(Smart)
    {
        //Token = "" + Data.Currency + "." + Smart.ShortName.trim();
        Token = Smart.ShortName.trim();
        if(Smart.IconBlockNum)
        {
            Value.IMG = GetURLPath("/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum);
            IconBlockNum = Smart.IconBlockNum;
            IconTrNum = Smart.IconTrNum;
        }
    }
    else
    {
        Token="TERA";
        Value.IMG=GetURLPath("/PIC/Tera.svg");
        IconBlockNum=undefined;
        IconTrNum=undefined;
    }

    Arr.unshift({Currency: Data.Currency, Token:Token, IconBlockNum:IconBlockNum,IconTrNum:IconTrNum, Inner:1, Arr: [Value]});

    return Arr;
}

function ReadSoftBalanceArr(Data)
{
    var Account=Data.Num;


    var Item=ReadRegWallet(Account);


    var Arr=[];
    for(var i=0;i<Item.Arr.length;i++)
    {
        var SmartNum=Item.Arr[i];
        var Smart = SMARTS.ReadSmart(SmartNum);
        if(Smart && Smart.Version>=2)
        {
            var RetValue=CallMethodStatic(Smart, "OnGetBalance", Account,undefined,0);

            //console.log(Account,RetValue);

            if(RetValue)
            {
                var ValueArr;
                if(!RetValue.length)
                {
                    if(ISZERO(RetValue))
                        continue;
                    if(!RetValue.ID)
                        RetValue.ID = "";
                    if(!RetValue.IMG)
                        RetValue.IMG = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
                    ValueArr=[RetValue];
                }
                else
                {
                    ValueArr=RetValue;
                }


                var Token = Smart.ShortName.trim();
                Arr.push({Currency: Smart.Num, Token:Token,IconBlockNum:Smart.IconBlockNum,IconTrNum:Smart.IconTrNum, Arr: ValueArr});
            }
        }
    }

    return Arr;

}


// function CurrencyName(Currency)
// {
//     console.log("CurrencyName=",Currency)
//     if(!Currency)
//         return "TERA";
//     var Smart=SMARTS.ReadSmart(Currency);
//     if(Smart)
//         return Smart.ShortName;
//     else
//         return ""+Currency+".Error";
// }

