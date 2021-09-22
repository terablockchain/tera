/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Responsible for the work safety policy
 * Contains algorithms for filtering unreliable nodes
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Filter"});

global.MAXHASH_TIMING = 50;

//Engine context
var MapM = {};
MapM["GETNODES"] = {Period:1000};
MapM["HANDSHAKE"] = {Period:1000};
MapM["CONNECTLEVEL"] = {Period:1000};
MapM["DISCONNECTLEVEL"] = {Period:1000};
MapM["MAXHASH"] = {Period:20};
MapM["TRANSFERTT"] = {Period:50};
MapM["TRANSFERTX"] = {Period:50};

MapM["NETCONSTANT"] = {Period:10 * 1000};
MapM["VERSION"] = {Period:10 * 1000};
MapM["CODE"] = {Period:30 * 1000};



MapM["SPEED"] = {Period:100 * 1000};

MapM["CROSSMSG"] = {Period:100};

function InitClass(Engine)
{
    Engine.BAN_IP = {};
    
    Engine.CanProcessPacket = function (Child,Data)
    {
        if(!Child.IsOpen())
            return 0;
        
        return 1;
    };
    
    Engine.CanProcessMethod = function (Child,Obj)
    {
        var Method = Obj.Method;
        var Item = MapM[Method];
        if(!Item)
        {
            Child.ToError("Error Method name: " + Method, 3);
            return 0;
        }
        
        if(Engine.StopDoSendPacket(Child, Item, Method))
            return 0;
        
        return 1;
    };
    
    Engine.StopDoSendPacket = function (Child,Item,Method)
    {
        return 0;
        
        if(!Item.Period)
            return 0;
        
        var CurTime = Date.now();
        
        var ArrTime = Child.TimeMap[Method];
        if(!ArrTime)
        {
            ArrTime = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            Child.TimeMap[Method] = ArrTime;
        }
        
        ArrTime.sort(function (a,b)
        {
            return a - b;
        });
        
        var Delta = CurTime - ArrTime[0];
        ArrTime[0] = CurTime;
        if(Delta < Item.Period * JINN_CONST.MULT_TIME_PERIOD)
        {
            JINN_STAT.SkipMethod++;
            Engine.AddCheckErrCount(Child, 1, "Skip method: " + Method + " Delta=" + Delta + " ms");
            return 1;
        }
        return 0;
    };
    
    Engine.AddCheckErrCount = function (Child,Count,StrErr,bSilent)
    {
        JINN_STAT.ErrorCount += Count;
        Child.ErrCount += Count;
        
        if(Child.ErrCount >= 10)
        {
            Engine.DecrChildScore(Child, Math.floor(Child.ErrCount / 10));
            Child.ErrCount = 0;
        }
        
        if(!bSilent)
            Child.ToLog(StrErr, 3);
        
        if(Child.Score <  - JINN_CONST.MAX_ERR_PROCESS_COUNT)
        {
            Engine.AddToBan(Child, "Last err:" + StrErr);
        }
    };
    
    Engine.AddToBan = function (Child,StrErr)
    {
        if(typeof Child.ip !== "string")
            return;
        var Key = "" + Child.ip.trim();
        
        Child.ToLog("Ban node: " + ChildName(Child) + " - " + StrErr, 2);
        
        var DeltaBan = 600;
        var TimeTo = Date.now() + DeltaBan * 1000;
        if(Child.AddrItem)
            Child.AddrItem.BanTimeTo = TimeTo;
        Engine.BAN_IP[Key] = {TimeTo:TimeTo};
        
        JINN_STAT.BanCount++;
        
        Engine.StartDisconnect(Child, 1);
    };
    
    Engine.WasBanItem = function (Child)
    {
        var AddrItem;
        if(Child.AddrItem)
            AddrItem = Child.AddrItem;
        else
            AddrItem = Child;
        
        if(AddrItem && AddrItem.BanTimeTo)
        {
            if(AddrItem.BanTimeTo > Date.now())
                return 1;
        }
        return 0;
    };
    
    Engine.WasBanIP = function (rinfo)
    {
        if(!rinfo || !rinfo.address)
            return 0;
        
        var Key = "" + rinfo.address.trim();
        var Stat = Engine.BAN_IP[Key];
        if(Stat)
        {
            if(Stat.TimeTo > Date.now())
                return 1;
            else
                delete Engine.BAN_IP[Key];
        }
        
        return 0;
    };
}
