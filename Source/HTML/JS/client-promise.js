//client-promise
//Promise support



async function AGetData(Method,Params)
{
    return new Promise(function(resolve, reject)
    {
        GetData(Method, Params,function (Value,Text)
        {
            resolve(Value);
        });
    });
}


function StaticCall(Account,MethodName,Params,ParamsArr,F)
{
    GetData("DappStaticCall", {Account:Account, MethodName:MethodName, Params:Params, ParamsArr:ParamsArr}, function (SetData)
    {
        if(SetData)
        {
            F(!SetData.result, SetData.RetValue);
        }
        else
        {
            F(1);
        }
    });
}


async function AStaticCall(AccNum,Name,Params,ParamsArr)
{
    return new Promise(function(resolve, reject)
    {
        StaticCall(AccNum,Name,Params,ParamsArr,function (Err,Value)
        {
            if(Err)
            {
                //SetError(Value);
                reject(Value);
            }
            else
            {
                resolve(Value);
            }
        });
    });
}
function ACall(AccNum,Name,Params,ParamsArr)
{
    return AStaticCall(AccNum,Name,Params,ParamsArr);
}


async function AReadAccount(Account)
{
    var Data=await AGetData("GetAccountList",{StartNum:Account,CountNum:1,GetCoin:1});
    if(Data && Data.result === 1 && Data.arr.length)
    {
        var Item = Data.arr[0];
        return Item;
    }
}
async function AReadBalance(Account,Currency,ID)
{
    var Data=await AGetData("GetBalance",{AccountID:Account,Currency:Currency,ID:ID});
    if(Data && Data.result === 1 && Data.Value)
    {
        return Data.Value;
    }
    return {SumCOIN:0,SumCENT:0};
}


async function AGetBalance(Account,Currency,ID)
{
    if(typeof Currency==="number")
    {
        //console.log("AGetBalance:",Account,Currency,ID);
        return AReadBalance(Account,Currency,ID);
    }
    else
    {
        var AccObj=await AReadAccount(Account);
        return FindBalance(AccObj,Currency,ID);
    }
}

async function AReadBlockFile(BlockNum,TrNum)
{
    var Data=await AGetData("DappBlockFile",{BlockNum:BlockNum,TrNum:TrNum});
    if(Data && Data.result === 1)
    {
        return Data;
    }
}


function GetSmartList(Params,F)
{
    GetData("GetDappList",Params,function (Data)
    {
        F(Data.arr);
    })
}

async function AReadSmart(Num,Fields)
{
    var Params={StartNum:Num,CountNum:1,Fields:Fields};
    var Ret=await AGetData("GetDappList",Params);
    if(Ret && Ret.arr && Ret.arr.length)
        return Ret.arr[0];
    else
        return undefined;
}
