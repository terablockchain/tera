//global variables
var ALL_DATA_ONCE=1;
var SMART={},BASE_ACCOUNT={}, INFO={}, USER_ACCOUNT=[],USER_ACCOUNT_MAP={},OPEN_PATH="",ACCOUNT_OPEN_NUM=0;
var ALL_ACCOUNTS=0;


//API
function SendPay(Data)
{
    Data.cmd="pay";
    SendData(Data)
}

function CloseDapp()
{
    SendData({cmd:"Close"});
}


function SetStorage(Key,Value)
{
    var Data={cmd:"setstorage",Key:Key,Value:Value}
    SendData(Data)
}

function GetStorage(Key,F)
{
    var Data={cmd:"getstorage",Key:Key}
    SendData(Data,F)
}
function SetCommon(Key,Value)
{
    var Data={cmd:"setcommon",Key:Key,Value:Value}
    SendData(Data)
}
function GetCommon(Key,F)
{
    var Data={cmd:"getcommon",Key:Key}
    SendData(Data,F)
}


function GetInfo(F)
{
    var Data={cmd:"DappInfo",AllAccounts:ALL_ACCOUNTS,AllData:ALL_DATA_ONCE};
    ALL_DATA_ONCE=0;
    SendData(Data,F);
}

function Call(Account, MethodName,Params, A,B)
{
    var F, ParamsArr;
    if (typeof A === "function")
    {
        F = A;
        ParamsArr=B;
    }
    else
    {
        F = B;
        ParamsArr=A;
    }
    var Data={cmd:"DappStaticCall",MethodName:MethodName,Params:Params,ParamsArr:ParamsArr, Account:Account}
    SendData(Data,F)
}

async function ACall(Account, MethodName,Params,ParamsArr)
{
    var Data={cmd:"DappStaticCall",MethodName:MethodName,Params:Params,ParamsArr:ParamsArr, Account:Account}
    return await ASendData(Data,2);
}


window.StaticCall=Call;
window.AStaticCall=ACall;



function SendCall(Account, MethodName,Params, A,B, TxTicks)
{
    if(!INFO.WalletCanSign)
    {
        SetError("PLS, OPEN WALLET");
        return 0;
    }

    var FromNum, ParamsArr;
    if (typeof A !== "object")
    {
        FromNum = A;
        ParamsArr=B;
    }
    else
    {
        FromNum = B;
        ParamsArr=A;
    }


    var Data={cmd:"DappSendCall",MethodName:MethodName,Params:Params,ParamsArr:ParamsArr, Account:Account, FromNum:FromNum,TxTicks:TxTicks}
    SendData(Data);
    return 1;
}

function ASendCall(Account, MethodName,Params, ParamsArr,FromNum,TxTicks)
{
    if(!INFO.WalletCanSign)
    {
        SetError("PLS, OPEN WALLET");
        return 0;
    }
    var Data={cmd:"DappSendCall",MethodName:MethodName,Params:Params,ParamsArr:ParamsArr, Account:Account, FromNum:FromNum,TxTicks:TxTicks}
    return ASendData(Data);
}


function GetWalletAccounts(F)
{
    var Data={cmd:"DappWalletList"}
    SendData(Data,F)
}
function GetAccountList(Params,F)
{
    var Data={cmd:"DappAccountList",Params:Params}
    SendData(Data,F)
}


function GetSmartList(Params,F)
{
    var Data={cmd:"DappSmartList",Params:Params}
    SendData(Data,F)
}

async function AReadSmart(Num,Fields)
{
    var Data={cmd:"DappSmartList",Params:{StartNum:Num,CountNum:1,Fields:Fields}}
    var Ret=await ASendData(Data,2);
    if(Ret && Ret.length)
        return Ret[0];
    else
        return undefined;
}

async function AReadAccount(Num,Fields)
{
    var Data={cmd:"DappAccountList",Params:{StartNum:Num,CountNum:1,Fields:Fields}}
    var Ret=await ASendData(Data,2);
    if(Ret && Ret.length)
        return Ret[0];
    else
        return undefined;
}

async function AReadBalance(Account,Currency,ID)
{
    var Data={cmd:"DappGetBalance",Params:{AccountID:Account,Currency:Currency,ID:ID}}
    var Ret=await ASendData(Data,2);
    if(Ret && Ret.Value)
    {
        return Ret.Value;
    }
    return {SumCOIN:0,SumCENT:0};
}







function GetBlockList(Params,F)
{
    var Data={cmd:"DappBlockList",Params:Params}
    SendData(Data,F)
}
function GetTransactionList(Params,F)
{
    var Data={cmd:"DappTransactionList",Params:Params}
    SendData(Data,F)
}

function DappSmartHTMLFile(Smart,F)
{
    var Data={cmd:"DappSmartHTMLFile",Params:{Smart:Smart}}
    SendData(Data,F)
}
function DappBlockFile(BlockNum,TrNum,F)
{
    var Data={cmd:"DappBlockFile",Params:{BlockNum:BlockNum,TrNum:TrNum}}
    SendData(Data,F)
}

async function AReadBlock(BlockNum,TrNum)
{
    var Data={cmd:"DappBlockFile",Params:{BlockNum:BlockNum,TrNum:TrNum}}
    return ASendData(Data,2);
}
async function AReadTx(BlockNum,TrNum)
{
    var RetData=await AReadBlock(BlockNum,TrNum);
    if(RetData.Type===135 || RetData.Type===136)
    {
        var Params;
        if(RetData.Params)
            try{Params=JSON.parse(RetData.Params);}catch (e){console.error(e)};
        return Params;
    }
}


function SetStatus(Str)
{
    SendData({cmd:"SetStatus",Message:Str});
}
function SetError(Str)
{
    SendData({cmd:"SetError",Message:Str});
}

function SetLocationPath(Str)
{
    SendData({cmd:"SetLocationHash",Message:Str});
}

function CreateNewAccount(Currency,Name,PubKey)
{
    return SendData({cmd:"CreateNewAccount",Currency:Currency,Name:Name,PubKey:PubKey});
}
function ACreateNewAccount(Currency,Name,PubKey)
{
    return ASendData({cmd:"CreateNewAccount",Currency:Currency,Name:Name,PubKey:PubKey});
}

function OpenLink(Str,bLocation)
{
     SendData({cmd:"OpenLink",Message:Str,Location:bLocation});
}

function SetMobileMode()
{
    SendData({cmd:"SetMobileMode"});
}



function ComputeSecret(PubKey,F,Account)
{
    if(!INFO.WalletCanSign)
    {
        SetError("Pls, open wallet");
        return 0;
    }
    if(!Account && USER_ACCOUNT.length)
        Account=USER_ACCOUNT[0].Num;

    if(typeof PubKey==="number")
    {
        var AccNum=PubKey;
        GetAccountList({StartNum:AccNum,CountNum:1},function (Err,Arr)
        {
            if(Err)
            {
                SetError(Err);
            }
            else
            {
                var PubKeyArr=Arr[0].PubKey;
                if(PubKeyArr.data)
                    PubKeyArr=PubKeyArr.data;
                SendData({cmd:"ComputeSecret",Account:Account,PubKey:PubKeyArr},F);
            }
        });
    }
    else
    {
        SendData({cmd:"ComputeSecret",Account:Account,PubKey:PubKey},F);
    }
}



function CheckInstall()
{
    SendData({cmd:"CheckInstall"});
}

function SendTransaction(Body,TR,SumPow,F)
{
    SetError("Cannt SEND TR: "+JSON.stringify(TR));
}



function ReloadDapp()
{
    SendData({cmd:"ReloadDapp"});
}


var SendCountUpdate=0;

var WasInitCurrency=0;
async function FindAllCurrency()
{
    WasInitCurrency=1;
    InitMapCurrency();
}






//LIB LIB



function GetParamsFromPath(Name)
{
    if(!OPEN_PATH)
        return undefined;

    var arr=OPEN_PATH.split("&");
    for(var i=0;i<arr.length;i++)
    {
        if(arr[i].indexOf(Name+"=")===0)
        {
            return arr[i].split("=")[1];
        }
    }

}


function GetState(AccNum,F,FErr)
{
    SendCountUpdate++;
    GetAccountList({StartNum:AccNum,CountNum:1},function (Err,Arr)
    {
        SendCountUpdate--;
        if(!Err && Arr.length)
        {
            var Item=Arr[0].SmartState;
            if(Item)
            {
                F(Item);
                return;
            }
        }
        if(FErr)
        {
            FErr();
            return;
        }
    });
}


//--------------------------------------------------
//NEW LIBRARY
//--------------------------------------------------


//Block walker lib
function GetDappBlock(Block,Tr,F)
{
    DappBlockFile(Block,Tr,function (Err,Data)
    {
        if(!Err && (Data.Type===135 || Data.Type===136))
        {
            try{var Params=JSON.parse(Data.Params);}catch (e){}
            if(Params)
            {
                F(0,Params,Data.MethodName,Data.FromNum);
                return;
            }
        }
        F(1);
    });
}


function UpdateListArr(Block,Tr, Arr,StopBlock,IgnoreTailBlock,MaxDepth,F)
{
    Arr.sort(function (a,b) {return a.Num-b.Num;});
    if(Arr.length)
        StopBlock=Math.max(StopBlock,Arr[Arr.length-1].BlockNum);

    UpdateRowArr(Block,Tr, Arr,StopBlock,IgnoreTailBlock,MaxDepth,F);
}

function UpdateRowArr(Block,Tr, Arr,StopMinBlock,IgnoreTailBlock,MaxDepth,F)
{
    if(Block<=StopMinBlock || !MaxDepth)
        return;

    SendCountUpdate++;
    GetDappBlock(Block,Tr,function (Err,Params)
    {
        SendCountUpdate--;
        if(!Err)
        {
            if(Block<=INFO.CurBlockNum-IgnoreTailBlock)
            {

                Params.BlockNum=Block;
                Params.TrNum=Tr;
                Params.Num=Params.BlockNum*100000+Params.TrNum;
                Params.Time=Date.now();

                if(!Arr.length || Arr[Arr.length-1].Num!==Params.Num)
                {
                    if(F)
                    {
                        if(F(Params))
                        {
                            return;
                        }
                    }
                    else
                    {
                        Arr.push(Params);
                    }
                }
            }

            if(Params.PrevBlock)
            {
                UpdateRowArr(Params.PrevBlock,Params.PrevTr, Arr,StopMinBlock,IgnoreTailBlock,MaxDepth-1,F);
            }
        }
    });
}



//---------------------------------------
//DB-Lib (template only)
//Based on random binary tree
//---------------------------------------
function GetKeyNum(Key)
{
    var Arr;
    if(typeof Key==="number")
    {
        Arr=sha3(""+Key);
    }
    else
    {
        Arr=sha3(Key);
    }
    var KeyNum=ReadUintFromArr(Arr,0);
    return KeyNum;
}

function GetKeyInner(Key,DBBlock,DBTr,F)
{
    FindItem(DBBlock,DBTr,Key,function (Result,PathArr)
    {
        for(var i=0;i<PathArr.length;i++)
        {
            var Elem=PathArr[i];
            if(Elem.Key===Key)
            {
                if(Elem.VB)
                {
                    LoadElement(Elem,i,PathArr,F);
                }
                else
                {
                    F(1,Elem,PathArr);
                }
                return;
            }
        }
        F(0,undefined,PathArr);

    });
}

function SetKeyInner(Key,Value,DBBlock,DBTr,F)
{
    FindItem(DBBlock,DBTr,Key,function (Result,PathArr)
    {
        var Elem;
        var bCreate=1;
        var ElemEdit=undefined;
        for(var i=0;i<PathArr.length;i++)
        {
            Elem=PathArr[i];
            if(Elem.Key===Key)
            {
                //clear item
                Elem.Key=undefined;
                Elem.VB=undefined;
                Elem.VT=undefined;
                Elem.Level=undefined;
                if(i===PathArr.length-1)
                    bCreate=0;

                if(typeof Value==="number")
                    ElemEdit=Elem;
            }
            if(Elem.VB)
            {
                //clear item
                Elem.Value=undefined;
            }
        }

        var L=PathArr.length-1;
        if(ElemEdit)
        {
            Elem=ElemEdit;
        }
        else
        {
            if(L===-1 || bCreate)//create new
            {
                L++;
                PathArr[L]={};
            }

            Elem=PathArr[L];
        }

        Elem.Key=Key;
        Elem.Value=Value;


        F(PathArr);
    });
}



var GetBlockKeyCount=0;
function FindItem(Block,Tr,Key,F)
{
    GetBlockKeyCount=0;
    var KeyNum=GetKeyNum(Key);
    FindItemNext(Block,Tr,Key,KeyNum,[], 0,F);
}

function FindItemNext(Block,Tr,Key,KeyNum,PathArr,Level,F)
{
    GetBlockKeyCount++;
    GetDappBlock(Block,Tr,function (Err,Params)
    {
        GetBlockKeyCount--;
        if(!Err)
        {
            var KeyNumStr=KeyNum.toString(2);
            var Arr=Params.Arr;

            //tree walk
            for(var L=Level;Arr && L<Arr.length;L++)
            {
                var Elem=Arr[L];
                PathArr[L]=Elem;

                if(Elem.Key!==undefined)//check key
                {
                    if(Elem.Key!==Key && !Elem.VB && typeof Elem.Value!=="number")//other key, but no link value
                    {
                        //create link (for correct next key find)
                        Elem.VB=Block;
                        Elem.VT=Tr;
                    }
                }


                var Bit=+KeyNumStr.substr(L,1);//type number
                if(Bit!==Elem.t)
                {
                    //mirroring link:
                    var IB=Elem.IB;
                    var IT=Elem.IT;
                    Elem.t=Bit;
                    Elem.IB=Block;
                    Elem.IT=Tr;

                    if(IB)//load next block
                    {
                        FindItemNext(IB,IT, Key,KeyNum,PathArr,L+1,F);
                    }
                    else
                    {
                        break;
                    }
                    return;
                }
            }

            F(1,PathArr);
            return;

        }

        if(GetBlockKeyCount===0)
            F(0,[]);
    });
}



function LoadElement(Element,Level,PathArr,F)
{
    GetBlockKeyCount++;
    GetDappBlock(Element.VB,Element.VT,function (Err,Params)
    {
        GetBlockKeyCount--;
        if(!Err)
        {
            F(1,Params.Arr[Level],PathArr);
            return;
        }
        if(GetBlockKeyCount===0)
            F(0);
    });
}





//Crypto-Lib
function GetXORArr(Arr1,Arr2)
{
    var Arr3=[];
    for(var i=0; i<32; i++)
    {
        Arr3[i]=Arr1[i]^Arr2[i];
    }
    return Arr3;
}


function EncryptUint32(ArrSecret,RandomNum,Value)
{
    WriteUintToArrOnPos(ArrSecret,0,0);
    WriteUintToArrOnPos(ArrSecret,RandomNum,6);

    var ValueArr=[];
    WriteUint32ToArr(ValueArr,Value);
    return GetHexFromArr(DoSecret(ValueArr,ArrSecret));
}

function DecryptUint32(ArrSecret,RandomNum,StrValue)
{
    WriteUintToArrOnPos(ArrSecret,0,0);
    WriteUintToArrOnPos(ArrSecret,RandomNum,6);

    var Arr0=GetArrFromHex(StrValue);
    var ValueArr=DoSecret(Arr0,ArrSecret);
    ValueArr.len=0;

    var Value=ReadUint32FromArr(ValueArr);
    return Value;
}
function EncryptArr32(ArrSecret,RandomNum,ValueArr)
{
    WriteUintToArrOnPos(ArrSecret,0,0);
    WriteUintToArrOnPos(ArrSecret,RandomNum,6);
    return GetHexFromArr(DoSecret(ValueArr,ArrSecret));
}

function DecryptArr32(ArrSecret,RandomNum,StrValue)
{
    WriteUintToArrOnPos(ArrSecret,0,0);
    WriteUintToArrOnPos(ArrSecret,RandomNum,6);

    var Arr0=GetArrFromHex(StrValue);
    var ValueArr=DoSecret(Arr0,ArrSecret);
    return ValueArr;
}




//--------------------------------------------------
var glMapF={};
var glKeyF=0;
function SendData(Data,F)
{
    if(!window.parent)
        return;

    if(F)
    {
        glKeyF++;
        Data.CallID=glKeyF;
        glMapF[glKeyF]=F;
    }

    window.parent.postMessage(Data, "*");
}

function ASendData(Data,Count)
{
    if(!window.parent)
        return;

    return new Promise(function(resolve, reject)
    {
        Data.Confirm=1;
        SendData(Data,function (RetData,RetData2)
        {
            if(Count==2)
            {
                if(RetData)
                {
                    //SetError(RetData2);
                    console.log("Find error!!")
                    reject(RetData2);
                }
                else
                {
                    resolve(RetData2);
                }
            }
            else
            {
                if(RetData.Err)
                {
                    //SetError(RetData.Err);
                    reject(RetData);
                }
                else
                {
                    resolve(RetData);
                }
            }
        });
    });
}



function OnMessage(event)
{
    var Data=event.data;
    if(!Data || typeof Data!=="object")
    {
        return;
    }
    // ToLog("Data:");
    // ToLog(Data);

    var CallID=Data.CallID;
    var cmd=Data.cmd;
    if(CallID)
    {
        var F=glMapF[CallID];
        if(F)
        {
            switch (cmd)
            {
                case "translate":
                    F(Data.Str,Data.Str2);
                    break;
                case "getstorage":
                case "getcommon":
                    F(Data.Key,Data.Value);
                    break;
                case "DappStaticCall":
                    F(Data.Err,Data.RetValue);
                    break;
                case "DappInfo":
                    F(Data.Err,Data);
                    break;
                case "DappGetBalance":
                    F(0,Data);
                    break;
                case "DappWalletList":
                case "DappAccountList":
                case "DappSmartList":
                case "DappBlockList":
                case "DappTransactionList":
                    F(Data.Err,Data.arr);
                    break;


                case "DappBlockFile":
                case "DappSmartHTMLFile":
                    F(Data.Err,Data.Body);
                    break;
                case "ComputeSecret":
                    F(Data.Result);
                    break;

                case "DATA":
                    F(Data);
                    break;
                //------------------------------------------------------------------------------------------------------
                case "Result":
                    F(Data.Result,Data.Err);
                    break;
                case "ResultOn":
                    F(Data.Result);
                    return; //no delete from glMapF
                //------------------------------------------------------------------------------------------------------


                default:
                    console.log("Error cmd: "+cmd);
            }

            delete Data.CallID;
            delete Data.cmd;
            delete glMapF[CallID];
        }
    }
    else
    {
        switch (cmd)
        {
            case "History":
                var eventEvent = new CustomEvent("History",{detail: Data});
                window.dispatchEvent(eventEvent);

                break;
            case "OnEvent":
                if(window.OnEvent)
                {
                    window.OnEvent(Data);
                }

                var eventEvent = new CustomEvent("Event",{detail: Data});
                window.dispatchEvent(eventEvent);
            // case "Alive":
            //     console.log("Alive");
        }

    }

    //SetStatus( "Get: " + JSON.stringify(event.data));
    // console.log( "Get: " + Data.Message);
}



function OpenRefFile(Str)
{
    var Param=ParseFileName(Str);
    if(Param.BlockNum)
    DappBlockFile(Param.BlockNum,Param.TrNum,function (Err,Body)
    {
        document.write(Body);
    })
    else
    {
        OpenLink(Str);
    }
}



//SAVE DIALOG
function SaveToStorageByArr(Arr)
{
    SetStorage("VerSave","1");
    for(var i=0;i<Arr.length;i++)
    {
        var name=Arr[i];
        var Item=$(name);
        if(Item)
        {
            if(Item.type==="checkbox")
                SetStorage(name,0+Item.checked);
            else
                SetStorage(name,Item.value);
        }
    }
}

function LoadFromStorageByArr(Arr,F,bAll)
{
    GetStorage("VerSave",function(Key,Value)
    {
        if(Value==="1")
        {
            for(var i=0;i<Arr.length;i++)
            {
                if(i===Arr.length-1)
                    LoadFromStorageById(Arr[i],F);
                else
                    LoadFromStorageById(Arr[i]);
            }
        }
        else
        if(bAll && F)
            F(0);
    });
}
async function ALoadFromStorageByArr(Arr)
{
    return new Promise(function(resolve, reject)
    {
        LoadFromStorageByArr(Arr,function (Key)
        {
            resolve();
        },1);
    });
}


function LoadFromStorageById(Name,F)
{
    GetStorage(Name,function(Key,Value)
    {
        var Item=document.getElementById(Name);
        if(Item)
        {
            if(Item.type==="checkbox")
                Item.checked=parseInt(Value);
            else
                Item.value=Value;
            //console.log(Name,Item.value);
        }
        if(F)
            F(Key,Value);
    });
}


var SendCountDappParams=0;
function GetDappParams(BNum,TrNum,F,bAll)
{
    if(!BNum)
    {
        if(bAll)
            F();
        return;
    }

    SendCountDappParams++;
    GetDappBlock(BNum,TrNum,function (Err,Params,MethodName,FromNum)
    {
        SendCountDappParams--;
        if(!Err)
        {
            F(Params,MethodName,FromNum);
            return;

        }
        if(bAll)
            F();

    });
}



//Run

document.addEventListener("DOMContentLoaded", function()
{
    var refs=document.getElementsByTagName("A")
    for (var i=0, L=refs.length; i<L; i++)
    {
        if(refs[i].href.indexOf("/file/")>=0)
        {
            refs[i].onclick=function()
            {
                OpenRefFile(this.href);
            }
        }
    }
});

if (window.addEventListener)
{
    window.addEventListener("message", OnMessage);
} else
{
    // IE8
    window.attachEvent("onmessage", OnMessage);
}



//init

var WasStartInit=0,WasStartInit2=0;
var eventInfo = new Event("UpdateInfo");


function UpdateDappInfo()//run every 3 sec
{
    GetInfo(async function (Err,Data)
    {
        if(Err)
        {
             return;
        }
        INFO=Data;
        SMART=Data.Smart;
        BASE_ACCOUNT=Data.Account;
        OPEN_PATH=Data.OPEN_PATH;
        ACCOUNT_OPEN_NUM=ParseNum(OPEN_PATH);

        //ToLog(JSON.stringify(BASE_ACCOUNT));

        SetBlockChainConstant(Data);

        await CheckNetworkID(INFO);

        if(SMART.Num==7)//test mode
        {
            RegCurrency(1,"USDT",undefined,1,1);
            RegCurrency(3,"SOFT",undefined,1,1);
        }


        if(!WasInitCurrency)
            await FindAllCurrency();


        USER_ACCOUNT=Data.ArrWallet;
        USER_ACCOUNT_MAP={};
        for(var i=0;i<USER_ACCOUNT.length;i++)
            USER_ACCOUNT_MAP[USER_ACCOUNT[i].Num]=USER_ACCOUNT[i];

        if(window.OnInit && !WasStartInit)
        {
            WasStartInit=1;
            window.OnInit(1);
        }
        else
        if(window.OnUpdateInfo)
        {
            window.OnUpdateInfo();
        }

        if(!WasStartInit2)
        {
            WasStartInit2=1;
            var eventInit = new Event("Init");
            window.dispatchEvent(eventInit);
        }

        window.dispatchEvent(eventInfo);



        //Events
        if(Data.ArrEvent)
        for(var i=0;i<Data.ArrEvent.length;i++)
        {
            var Item=Data.ArrEvent[i];

            // if(typeof Item.Description==="string")
            // {
            //     ToLog(Item);
            //     SetStatus(Item.Description);
            // }

            Item.cmd="OnEvent";
            OnMessage({data:Item});
        }

    });


}

window.addEventListener('load',function ()
{
    // if(!window.sha3)
    //     LoadLib("./JS/sha3.js");

    UpdateDappInfo();
    setInterval(UpdateDappInfo,3*1000);
    InitTranslater();
    SendData({cmd:"Show"});
});

window.onkeydown = function (e)
{
    if(e.keyCode===116 && INFO.CanReloadDapp)
    {
        e.preventDefault();
        ReloadDapp();
    }
    else
    if(e.keyCode===27)
    {
        if(window.closeModal)
            closeModal();


    }
    else
    if(e.keyCode===13)
    {
        if(glConfirmF)
            OnConfirmOK();
    }
};

//TRANSLATE TRANSLATE TRANSLATE
//TRANSLATE TRANSLATE TRANSLATE
//TRANSLATE TRANSLATE TRANSLATE

function CanTranslate(elem)
{
    var Text = elem.innerText;
    if (!Text)
        return 0;
    if(String(",STYLE,SCRIPT,").indexOf(","+elem.tagName+",")>=0)
        return 0;

    if(!elem.innerHTML)
        return 0;

    Text=Text.trim();
    if (elem.innerHTML.trim() !== Text)
        return 0;

    if (Text.substr(0,1)==="$")//template
        return 0;

    if (Text.toUpperCase() == Text.toLowerCase())//numbers
        return 0;

    return 1;
}


var glTranslateMap={};
var glTranslateMap2={};
var glTranslateNum=0;
function TranslateElement(elem)
{
    var StrText=elem.textContent.trim();
    if(!StrText || StrText.toUpperCase()===StrText.toLowerCase())
        return StrText;

    if(glTranslateMap2[StrText])
         return;

    glTranslateNum++;
    var StrKey="id"+GetHexFromArr(sha3(StrText));
    var Text=glTranslateMap[StrKey];
    if(Text!==undefined)
    {
        glTranslateMap2[Text]=1;
        elem.textContent=Text;
        return;
    }

    var Data={cmd:"translate",Key:StrKey,Str:StrText}
    SendData(Data,function (Str,Str2)
    {
        if(!Str2)
            return;

        glTranslateMap[StrKey]=Str2;
        glTranslateMap2[Str2]=1;

        if(Str!==Str2 && elem.textContent===Str)
        {
             elem.textContent=Str2;
        }
    });
}



function InitTranslater()
{

    var elems = document.getElementsByTagName("*");
    for (var elem, i = 0; elem = elems[i++];)
    {
        if(!CanTranslate(elem))
        {
            continue;
        }
        TranslateElement(elem);

        var observer = new MutationObserver(function(mutations)
        {
            mutations.forEach(function(mutation)
            {
                //console.dir(mutation);
                for(var i=0;i<mutation.addedNodes.length;i++)
                {
                    var elem2=mutation.addedNodes[i];
                    if(elem2.nodeName!== "#text" && !CanTranslate(elem2))
                    {
                        continue;
                    }

                    if(elem2.textContent)
                    {
                        TranslateElement(elem2);
                        continue;
                    }
                }
            });
        });

        observer.observe(

            elem,
            {
                childList: true,
                attributes: false,
                subtree: true,
                characterData: true,
            }
        );

    }


}

//----------------------------------------------------------------------------------------------------------------------
//web3 ethereum
//----------------------------------------------------------------------------------------------------------------------
if(!isMobile())
{
    window.ethereum =
        {
            isMetaMaskInstalled: async function ()
            {
                return new Promise(function (resolve, reject)
                {
                    var Data = {cmd: "ethereum-installed"}
                    SendData(Data, function (Res)
                    {
                        resolve(Res);
                    })
                });
            },
            request: async function (Params)
            {
                return new Promise(function (resolve, reject)
                {
                    var Data = {cmd: "ethereum-request", Params: Params}
                    SendData(Data, function (Res, IsErr)
                    {
                        if(IsErr)
                            reject(Res);
                        else
                            resolve(Res);
                    })
                });
            },
            on: function (Name, F)
            {
                SendData({cmd: "ethereum-on", Name: Name}, F);
            },
            removeListener: function (Name, F)
            {
                SendData({cmd: "ethereum-off", Name: Name}, F);
            },
            GetSelectedAddress: async function ()
            {
                return new Promise(function (resolve, reject)
                {
                    var Data = {cmd: "ethereum-selected"}
                    SendData(Data, function (Res)
                    {
                        resolve(Res);
                    })
                });
            },
        }

    Object.defineProperty(ethereum, "selectedAddress", {
        get: async function ()
        {
            var result = ethereum.GetSelectedAddress();
            return result;
        }
    });
}
else
{
    function RetZero()
    {
        return 0;
    }
    window.ethereum={isMetaMaskInstalled:RetZero,on:RetZero};
}

//----------------------------------------------------------------------------------------------------------------------
//Start transfer
//----------------------------------------------------------------------------------------------------------------------
async function StartTransfer(ParamsPay,ParamsCall,TxTicks)
{
    //ParamsPay: FromID,ToID,Value,Description,Currency,ID
    //ParamsCall: Method,Params,ParamsArr


    var Data={cmd:"StartTransfer",ParamsPay:ParamsPay,ParamsCall:ParamsCall,TxTicks:TxTicks};
    return ASendData(Data);

}

window.AStartTransfer=StartTransfer;

//----------------------------------------------------------------------------------------------------------------------

