/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Dual connection protection algorithm
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Connect"});


var glWorkConnect = 0;

//Engine context

function DoNode(Engine)
{
    if(Engine.TickNum % 5 !== 0)
        return;
    
    if(Engine.ROOT_NODE)
        return 0;
    
    var Delta = Date.now() - Engine.StartTime;
    if(Delta < 2000 * JINN_CONST.MAX_CONNECT_TIMEOUT / 3)
        Engine.IsStartingTime = 1;
    else
        Engine.IsStartingTime = 0;
    
    if(global.MODELING)
        Engine.IsStartingTime = 0;
    
    glWorkConnect++;
    if(!Engine.WasSendToRoot && JINN_EXTERN.NodeRoot)
    {
        var Child = Engine.NewConnect(JINN_EXTERN.NodeRoot.IDArr, JINN_EXTERN.NodeRoot.ip, JINN_EXTERN.NodeRoot.port);
        if(Child)
        {
            Engine.WasSendToRoot = 1;
            Child.ROOT_NODE = 1;
            Engine.SendConnectReq(Child);
        }
    }
    else
        if(Engine.NodesTree.size === 0 && Engine.TickNum > 10)
            Engine.WasSendToRoot = 0;
    for(var i = 0; i < Engine.ConnectArray.length; i++)
    {
        var Child = Engine.ConnectArray[i];
        if(!Child || Child.ROOT_NODE || Child.Del)
        {
            continue;
        }
        
        if(!Child.IsHot())
        {
            var DeltaTime = Date.now() - Child.ConnectStart;
            if(DeltaTime > JINN_CONST.MAX_CONNECT_TIMEOUT * 1000)
            {
                
                var StrError = "MAX_CONNECT_TIMEOUT StartDisconnect";
                Child.ToLogNet(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                continue;
            }
        }
        
        var AddrItem = Child.AddrItem;
        if(!AddrItem)
            continue;
        
        if(AddrItem.WorkConnect !== glWorkConnect)
        {
            AddrItem.ConnectCount = 0;
            AddrItem.WorkConnect = glWorkConnect;
        }
        
        AddrItem.ConnectCount++;
        Child.ConnectNum = AddrItem.ConnectCount;
    }
    for(var i = 0; i < Engine.ConnectArray.length; i++)
    {
        var Child = Engine.ConnectArray[i];
        if(!Child || Child.ROOT_NODE || Child.Del || !Child.AddrItem || !Child.IsOpen() || Child.Self || Child.IsHot())
        {
            continue;
        }
        
        if(Child.AddrItem.ConnectCount <= 1)
            continue;
        
        if(CompareArr(Engine.IDArr, Child.IDArr) > 0)
        {
            if(Child.InComeConnect)
            {
                var StrError = "---DOUBLE StartDisconnect 1 Num:" + Child.ConnectNum;
                Child.ToLogNet(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
        }
        else
        {
            if(!Child.InComeConnect)
            {
                var StrError = "---DOUBLE StartDisconnect 2 Num: " + Child.ConnectNum;
                Child.ToLogNet(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
        }
    }
    Engine.DoConnectLevels();
}


function InitClass(Engine)
{
    Engine.StartTime = Date.now();
    
    Engine.WasSendToRoot = 0;
    Engine.IndexChildLoop = 0;
    
    Engine.ConnectArray = [];
    Engine.ConnectToNode = function (ip,port)
    {
        var Child = Engine.RetNewConnectByIPPort(ip, port);
        if(!Child)
            return  - 1;
        
        if(Engine.SendConnectReq(Child))
            return 1;
        else
            return  - 2;
    };
    
    Engine.SendConnectReq = function (Child)
    {
        if(!Engine.CanConnect(Child))
            return 0;
        Engine.CreateConnectionToChild(Child, function (result)
        {
            if(result)
            {
                Engine.StartHandShake(Child);
            }
        });
        
        return 1;
    };
    
    Engine.CanConnect = function (Child)
    {
        if(Engine.ROOT_NODE)
            return 1;
        if(Child.Self)
        {
            Child.ToLogNet("Cannt self connect");
            
            return 0;
        }
        
        return 1;
    };
    Engine.FindConnectByHash = function (RndHash)
    {
        if(!RndHash || IsZeroArr(RndHash))
            return undefined;
        
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Item = Engine.ConnectArray[i];
            if(Item.Del)
                continue;
            
            if(Item.RndHash && IsEqArr(Item.RndHash, RndHash))
                return Item;
        }
        return undefined;
    };
    
    Engine.OnAddConnect = function (Child)
    {
    };
    
    Engine.StartDisconnect = function (Child,bSend,StrError)
    {
        Engine.DisconnectLevel(Child, bSend);
        if(bSend && Child.IsOpen())
        {
            Engine.CloseConnectionToChild(Child, StrError);
            Engine.OnDeleteConnect(Child);
        }
        else
        {
            Engine.OnDeleteConnect(Child);
        }
    };
    
    Engine.OnDeleteConnect = function (Child,StrError)
    {
        if(Engine.InHotStart(Child))
            Engine.DenyHotConnection(Child);
        
        Engine.DisconnectLevel(Child, 0);
        
        if(Engine.OnDeleteConnectNext)
            Engine.OnDeleteConnectNext(Child, StrError);
        
        Engine.RemoveConnect(Child);
    };
    
    Engine.GetTransferArrByLevel = function (ModeConnect,bNotConnect)
    {
        var LevelData;
        var ArrLevels = [];
        
        glWorkConnect++;
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_ALL(); L++)
        {
            LevelData = {HotChild:Engine.LevelArr[L], CrossChild:Engine.CrossLevelArr[L], Connect:[], NotConnect:[]};
            ArrLevels.push(LevelData);
        }
        if(ModeConnect)
        {
            for(var i = 0; i < Engine.ConnectArray.length; i++)
            {
                var Child = Engine.ConnectArray[i];
                if(!Child)
                    continue;
                
                if(Child.Level === undefined)
                    ToLogTrace("Error Child.Level===undefined");
                
                if(Child.AddrItem)
                    Child.AddrItem.WorkConnect = glWorkConnect;
                
                if(Child.Level < JINN_CONST.MAX_LEVEL_CONNECTION)
                {
                    LevelData = ArrLevels[Child.Level];
                    if((ModeConnect & 1) && Engine.CanSetHot(Child) > 0 && LevelData.HotChild !== Child)
                        LevelData.Connect.push(Child);
                    else
                        if((ModeConnect & 2) && Child.IsCluster && LevelData.CrossChild !== Child && LevelData.HotChild !== Child)
                            LevelData.Connect.push(Child);
                }
            }
        }
        if(bNotConnect)
        {
            var it = Engine.NodesTree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                if(Item.SendConnectPeriod === undefined)
                    ToLogTrace("Error Item.SendConnectPeriod===undefined");
                
                if(Item.WorkConnect === glWorkConnect)
                    continue;
                
                if(Item.Level === undefined)
                    ToLogTrace("Error Item.Level===undefined");
                
                var Power = Engine.GetAddrPower(Item.AddrHashPOW, Item.BlockNum);
                if(Item.System || global.MODELING)
                    Power += MIN_POW_ADDRES;
                
                if(Power >= global.MIN_POW_ADDRES && Item.Level < JINN_CONST.MAX_LEVEL_CONNECTION)
                {
                    LevelData = ArrLevels[Item.Level];
                    LevelData.NotConnect.push(Item);
                }
            }
        }
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_CONNECTION; L++)
        {
            var LevelData = ArrLevels[L];
            
            LevelData.Connect.sort(function (a,b)
            {
                if(a.SendHotConnectLastTime !== b.SendHotConnectLastTime)
                    return a.SendHotConnectLastTime - b.SendHotConnectLastTime;
                
                if(a.TestExchangeTime !== b.TestExchangeTime)
                    return b.TestExchangeTime - a.TestExchangeTime;
                
                if(a.Score !== b.Score)
                    return b.Score - a.Score;
                
                return a.ID - b.ID;
            });
            
            LevelData.NotConnect.sort(function (a,b)
            {
                if(a.SendConnectLastTime !== b.SendConnectLastTime)
                    return a.SendConnectLastTime - b.SendConnectLastTime;
                
                if(a.Score !== b.Score)
                    return b.Score - a.Score;
                
                return a.ID - b.ID;
            });
        }
        
        return ArrLevels;
    };
    
    Engine.GetActualNodesCount = function ()
    {
        var Count = 0;
        
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsOpen())
                continue;
            
            Count++;
        }
        
        return Count;
    };
    Engine.DoConnectLevels = function ()
    {
        var ArrLevels = Engine.GetTransferArrByLevel(3, 1);
        
        var MinNodeCounts = 1;
        if(Engine.IsStartingTime)
            MinNodeCounts = 10;
        
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_CONNECTION; L++)
        {
            var LevelData = ArrLevels[L];
            if(LevelData.Connect.length < MinNodeCounts)
            {
                for(var i = 0; i < LevelData.NotConnect.length; i++)
                {
                    var Item = LevelData.NotConnect[i];
                    
                    if(Engine.WasBanItem(Item))
                        continue;
                    
                    if(!CanTime(Item, "SendConnect", 1000, 1.5))
                        continue;
                    
                    if(!Item.CheckStartConnect && CompareArr(Engine.IDArr, Item.IDArr) > 0)
                    {
                        Item.CheckStartConnect = 1;
                        continue;
                    }
                    
                    var Child = Engine.RetNewConnectByAddr(Item);
                    if(Child && Engine.SendConnectReq(Child))
                    {
                        break;
                    }
                }
            }
            for(var i = 0; i < LevelData.Connect.length; i++)
            {
                var Child = LevelData.Connect[i];
                var Item = Child.AddrItem;
                if(Item && Item.SendConnectPeriod !== 1000)
                {
                    ResetTimePeriod(Item, "SendConnect", 1000, 10000);
                }
            }
        }
    };
}

function CanTime(Obj,Name,Period,kMult,TimeReset)
{
    var NameLastTime = Name + "LastTime";
    var NamePeriod = Name + "Period";
    
    var CurTume = Date.now();
    if(!Obj[NameLastTime])
    {
        Obj[NameLastTime] = 0;
        Obj[NamePeriod] = Period;
    }
    
    if(TimeReset)
        Obj[NamePeriod] = TimeReset;
    
    var Delta = CurTume - Obj[NameLastTime];
    if(Delta < Obj[NamePeriod])
        return 0;
    Obj[NameLastTime] = CurTume;
    
    if(kMult)
    {
        Obj[NamePeriod] = Obj[NamePeriod] * kMult;
    }
    
    if(TimeReset)
    {
        Obj[NamePeriod] = Period;
    }
    
    return 1;
}

function ResetTimePeriod(Obj,Name,Period,TimeReset)
{
    CanTime(Obj, Name, Period, 0, TimeReset);
}

global.CanTime = CanTime;
global.ResetTimePeriod = ResetTimePeriod;
