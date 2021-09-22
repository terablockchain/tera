/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Logs for debugging
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Log"});

const LOGNET_MAXWIDTH = 1000;
const LOGNET_MAXSIZE = 500;

var LOGNET_MINWIDTH = 60;
var LOGNET_MINSIZE = 10;

if(global.DEV_MODE)
{
    LOGNET_MINWIDTH = 1000;
    LOGNET_MINSIZE = 3000;
}

//Engine context

function InitClass(Engine)
{
    
    Engine.ToLog = function (Str,StartLevel)
    {
        if(StartLevel)
            return Engine.ToWarning(Str, StartLevel);
        
        var Time;
        var ID = "" + Engine.ID;
        
        var Type = Str.substr(0, 2);
        if(Type === "<-" || Type === "->")
            ToLog("" + ID + Str);
        else
            ToLog("" + ID + "." + Str);
    };
    
    Engine.ToLog1 = function (Str)
    {
        Engine.ToWarning(Str, 1);
    };
    Engine.ToLog2 = function (Str)
    {
        Engine.ToWarning(Str, 2);
    };
    Engine.ToLog3 = function (Str)
    {
        Engine.ToWarning(Str, 3);
    };
    Engine.ToLog4 = function (Str)
    {
        Engine.ToWarning(Str, 4);
    };
    Engine.ToLog5 = function (Str)
    {
        Engine.ToWarning(Str, 5);
    };
    
    Engine.ToWarning = function (Str,StartLevel)
    {
        if(global.JINN_WARNING >= StartLevel || Engine.ID === global.DEBUG_ID)
            Engine.ToLog(Str);
    };
    
    Engine.ToDebug = function (Str)
    {
        if(global.DEBUG_ID !== "ALL")
            if(Engine.ID !== global.DEBUG_ID)
                return;
        
        Engine.ToLog(Str);
    };
    
    Engine.ToError = function (Child,Str,WarningLevel)
    {
        Engine.AddCheckErrCount(Child, 1, Str, 1);
        
        var ID = GetNodeWarningID(Child);
        if(WarningLevel === "t")
            ToLogTrace("" + Engine.ID + "<-->" + ID + " ********ERROR: " + Str, WarningLevel);
        else
            if(global.JINN_WARNING >= WarningLevel || Engine.ID === global.DEBUG_ID)
            {
                Engine.ToWarning("<-->" + ID + " ********ERROR: " + Str, WarningLevel);
            }
        
        Engine.ToLogNet(Child, Str);
    };
    Engine.GetStrOnlyTime = function (now)
    {
        if(!now)
            now = new Date();
        
        var Str = "" + now.getHours().toStringZ(2);
        Str = Str + ":" + now.getMinutes().toStringZ(2);
        Str = Str + ":" + now.getSeconds().toStringZ(2);
        Str = Str + "." + now.getMilliseconds().toStringZ(3);
        return Str;
    };
    
    function WriteLogToBuf(Buf,Time,Str)
    {
        var Num = (Buf.PosNum) % Buf.MaxSize;
        var Pos = Num * Buf.MaxWidth;
        
        for(var i = Pos; i < Pos + Buf.MaxWidth; i++)
            Buf[i] = 0;
        
        var length = Math.min(Buf.MaxWidth - 6, Str.length);
        Buf.writeUIntLE(Time, Pos, 6);
        Buf.write(Str, Pos + 6, length);
        
        Buf.PosNum++;
    };
    
    function WriteArrToLogBuf(Buf,Arr)
    {
        Buf.PosNum = 0;
        for(var n = 0; n < Arr.length; n++)
        {
            var CurItemLog = Arr[n];
            WriteLogToBuf(Buf, CurItemLog.Time, CurItemLog.Log);
        }
    };
    
    function GetArrLogFromBuf(Buf)
    {
        var Arr = [];
        for(var n = 0; n < Buf.MaxSize; n++)
        {
            if(n >= Buf.PosNum)
                break;
            var Num;
            if(Buf.PosNum >= Buf.MaxSize)
                Num = (n + Buf.PosNum) % Buf.MaxSize;
            else
                Num = n;
            
            var Pos = Num * Buf.MaxWidth;
            
            var Time = Buf.readUIntLE(Pos, 6);
            
            var CurStr = Buf.toString('utf8', Pos + 6, Pos + Buf.MaxWidth);
            
            for(var i = CurStr.length - 1; i >= 0; i--)
            {
                if(CurStr.charCodeAt(i) !== 0)
                {
                    CurStr = CurStr.substr(0, i + 1);
                    break;
                }
            }
            
            Arr.push({Time:Time, Log:CurStr});
        }
        return Arr;
    };
    
    Engine.ClearLogNetBuf = function (Child)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        if(Buf)
            Buf.PosNum = 0;
    };
    
    Engine.GetLogNetBuf = function (Child)
    {
        if(!global.Buffer)
            return undefined;
        
        var Item;
        if(Child.AddrItem)
        {
            Item = Child.AddrItem;
            if(!Item.LogNetBuf)
            {
                Item.LogNetBuf = AllocLogBuffer();
            }
            
            if(Child.LogNetBuf)
            {
                var Arr = GetArrLogFromBuf(Child.LogNetBuf);
                WriteArrToLogBuf(Child.LogNetBuf, Arr);
                delete Child.LogNetBuf;
            }
            
            return Item.LogNetBuf;
        }
        else
        {
            if(!Child.LogNetBuf)
            {
                Child.LogNetBuf = AllocLogBuffer();
            }
            return Child.LogNetBuf;
        }
    };
    function AllocLogBuffer(bMax)
    {
        var Buf;
        if(bMax)
        {
            Buf = Buffer.alloc(LOGNET_MAXSIZE * LOGNET_MAXWIDTH);
            Buf.MaxSize = LOGNET_MAXSIZE;
            Buf.MaxWidth = LOGNET_MAXWIDTH;
        }
        else
        {
            Buf = Buffer.alloc(LOGNET_MINSIZE * LOGNET_MINWIDTH);
            Buf.MaxSize = LOGNET_MINSIZE;
            Buf.MaxWidth = LOGNET_MINWIDTH;
        }
        Buf.PosNum = 0;
        return Buf;
    };
    
    Engine.ToLogNet = function (Child,Str,nLogLevel)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        if(!Buf)
            return;
        
        WriteLogToBuf(Buf, Date.now(), Str);
        
        if(nLogLevel)
        {
            var ID = GetNodeWarningID(Child);
            Engine.ToLog("<-->" + ID + " " + Str, nLogLevel);
        }
    };
    
    Engine.GetLogNetInfo = function (Child)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        var Str = "";
        if(!Buf)
            return Str;
        
        var Arr = GetArrLogFromBuf(Buf);
        
        if(Buf.MaxSize < LOGNET_MAXSIZE)
        {
            var Item = Child;
            if(Item.AddrItem)
                Item = Item.AddrItem;
            Item.LogNetBuf = AllocLogBuffer(1);
            WriteArrToLogBuf(Item.LogNetBuf, Arr);
        }
        
        for(var n = 0; n < Arr.length; n++)
        {
            var Item = Arr[n];
            var StrTime = Engine.GetStrOnlyTime(new Date(Item.Time));
            Str += StrTime + " " + Item.Log + "\n";
        }
        return Str;
    };
}

if(!global.ToLogTrace)
    global.ToLogTrace = function (Str,LogLevel)
    {
        var Data = new Error().stack;
        var index = Data.indexOf("\n");
        index = Data.indexOf("\n", index + 1);
        Data = Data.substr(index);
        
        ToLog("" + Str + ":" + Data, LogLevel);
    };

global.GetNodeWarningID = function (Child)
{
    if(global.MODELING)
        return "" + Child.ID + "[" + Child.Level + "] ";
    else
        return "" + Child.Level + ":" + Child.ID;
}
