/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Nodes that the current user communicates with
 * Initializing values
 *
**/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Item"});

var glChildWorkNum = 0;

function InitClass(Engine)
{
    
    Engine.RetNewConnectByIPPort = function (ip,port0)
    {
        var port = port0 >>> 0;
        
        if(!port)
        {
            ToLogTrace("RetNewConnectByIPPort : Error port number = " + port0 + " from " + ip);
            return undefined;
        }
        
        if(ip === "0.0.0.0")
            return undefined;
        
        ip = GetNormalIP(ip);
        
        if(ip === Engine.ip && port === Engine.port)
            return undefined;
        
        var IDArr = CalcIDArr(ip, port);
        return Engine.NewConnect(IDArr, ip, port);
    };
    
    Engine.RetNewConnectByAddr = function (AddrItem)
    {
        var Item = Engine.NewConnect(AddrItem.IDArr, AddrItem.ip, AddrItem.port);
        if(Item)
        {
            
            Engine.SetAddrItemForChild(AddrItem, Item);
        }
        return Item;
    };
    
    Engine.NewConnect = function (IDArr,ip,port)
    {
        ip = GetNormalIP(ip);
        
        if(ip === "0.0.0.0")
            return undefined;
        
        if(global.LOCAL_RUN && global.IP_VERSION !== 6 && ip !== "127.0.0.1")
            return undefined;
        
        port = port >>> 0;
        
        if(!port)
        {
            ToLogTrace("NewConnect : Error port number = " + port);
            return undefined;
        }
        
        if(CompareArr(IDArr, Engine.IDStr) === 0)
        {
            return undefined;
        }
        
        var NodesCount = Engine.GetActualNodesCount();
        if(JINN_CONST.MAX_CONNECT_COUNT && NodesCount >= JINN_CONST.MAX_CONNECT_COUNT && !Engine.ROOT_NODE)
            return undefined;
        
        var IDStr = GetHexFromArr(IDArr);
        var Child = {IDStr:IDStr, IDArr:IDArr};
        
        Engine.SetChildID(Child, ip, port);
        Engine.SetIPPort(Child, ip, port);
        Engine.InitChild(Child);
        
        Engine.ConnectArray.push(Child);
        
        return Child;
    };
    
    Engine.SetChildID = function (Child,ip,port)
    {
        Child.ID = port % 1000;
    };
    Engine.SetIPPort = function (Child,ip,port)
    {
        ip = GetNormalIP(ip);
        
        Child.IDArr = CalcIDArr(ip, port);
        Child.IDStr = GetHexFromArr(Child.IDArr);
        
        Child.ip = ip;
        Child.port = port;
        Engine.RecalcChildLevel(Child, 3);
        
        if(JINN_EXTERN.NodeRoot && ip === JINN_EXTERN.NodeRoot.ip && port === JINN_EXTERN.NodeRoot.port)
            Child.ROOT_NODE = 1;
        
        if(ip === Engine.ip && port === Engine.port)
            Child.Self = 1;
    };
    
    Engine.ChildCounterID = 10000;
    Engine.InitChild = function (Child)
    {
        glChildWorkNum++;
        Engine.ChildCounterID++;
        
        Child.ID = Engine.ChildCounterID;
        Child.WorkNum = glChildWorkNum;
        
        Child.UseZip = global.glUseZip;
        
        Child.TransferCount = 0;
        Child.LastTransferTime = 0;
        Child.FirstTransferTime = 0;
        Child.SendTransferTime = 0;
        Child.DeltaTransfer = 1000;
        
        Child.ErrCount = 0;
        Child.IDContextNum = 0;
        Child.ContextCallMap = {};
        Child.SendAddrMap = {};
        
        Child.SendPacketCount = 0;
        Child.ReceivePacketCount = 0;
        
        Child.ReceiveDataArr = [];
        if(global.MODELING)
            Child.Node = Engine;
        
        Child.ConnectStart = Date.now();
        
        Child.TimeMap = {};
        Child.LastGetNetConstant = 0;
        Child.LastGetCodeVersion = 0;
        Child.LastGetCode = 0;
        Child.StartHotTransferNum = 0;
        
        Object.defineProperty(Child, "portweb", {get:function ()
            {
                if(this.AddrItem)
                    return this.AddrItem.portweb;
                else
                    return 0;
            }});
        Object.defineProperty(Child, "Score", {get:function ()
            {
                if(this.AddrItem)
                    return this.AddrItem.Score;
                else
                    return 0;
            }});
        Object.defineProperty(Child, "TestExchangeTime", {get:function ()
            {
                if(this.AddrItem)
                    return this.AddrItem.TestExchangeTime;
                else
                    return 0;
            }});
        Object.defineProperty(Child, "Debug", {set:function (value)
            {
                if(this.AddrItem)
                    this.AddrItem.Debug = value;
            }, get:function ()
            {
                if(this.AddrItem && this.AddrItem.Debug)
                    return 1;
                else
                    return 0;
            }});
        
        Child.IsOpen = function ()
        {
            return (Engine.GetSocketStatus(Child) === 100);
        };
        Child.IsHot = function ()
        {
            var LevelArr = Engine.GetLevelArr(Child);
            var ChildWas = LevelArr[this.Level];
            if(ChildWas && ChildWas === this && !Engine.InHotStart(this))
            {
                return 1;
            }
            return 0;
        };
        
        Child.IsHotReady = function ()
        {
            
            if(!Child.HotReady)
                return 0;
            
            if(!Child.IsOpen())
                return 0;
            
            if(!Child.IsHot())
                return 0;
            
            return 1;
        };
        
        if(Engine.InitChildNext)
            Engine.InitChildNext(Child);
        
        Child.ToError = function (Str,WarningLevel)
        {
            if(WarningLevel === undefined)
                WarningLevel = 3;
            Engine.ToError(Child, Str, WarningLevel);
        };
        Child.ToLog = function (Str,StartLevel)
        {
            var ID = GetNodeWarningID(Child);
            
            Engine.ToLog("<-->" + ID + ":  " + Str, StartLevel);
            Child.ToLogNet(Str, 0);
        };
        Child.ToDebug = function (Str)
        {
            if(global.DEBUG_ID !== "ALL")
                if(Engine.ID !== global.DEBUG_ID)
                    return;
            
            Child.ToLog(Str);
        };
        Child.Name = function ()
        {
            return Child.ip + ":" + Child.port;
        };
        
        Child.ToLogNet = function (Str,nLogLevel)
        {
            Engine.ToLogNet(Child, Str, nLogLevel);
        };
    };
    
    Engine.RemoveConnect = function (Child)
    {
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            if(Engine.ConnectArray[i] === Child)
            {
                Engine.ConnectArray.splice(i, 1);
                i--;
            }
        }
        
        Engine.ClearChild(Child);
    };
    Engine.FindConnectedChildByArr = function (IDArr)
    {
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsOpen())
                continue;
            
            if(IsEqArr(Child.IDArr, IDArr))
                return Child;
        }
        
        return undefined;
    };
}
