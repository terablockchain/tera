/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Serialization / deserialization of data sent to other nodes via the network
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Serilize"});

//Engine context

function InitClass(Engine)
{
    Engine.SendFormatMap = {};
    Engine.GetBufferFromData = function (Method,Data,bSend)
    {
        var format = Engine.GetF(Method, bSend);
        if(format.struct === "")
            return undefined;
        
        var Buf = SerializeLib.GetBufferFromObject(Data, format.struct, format.wrk);
        return Buf;
    };
    
    Engine.GetDataFromBuffer = function (Method,Buf,bSend)
    {
        
        var format = Engine.GetF(Method, bSend);
        if(format.struct === "")
            return undefined;
        
        try
        {
            var Data = SerializeLib.GetObjectFromBuffer(Buf, format.struct, format.wrk);
            return Data;
        }
        catch(e)
        {
            ToLogOne(e);
            return undefined;
        }
    };
    
    Engine.GetF = function (Method,bSend)
    {
        var name;
        if(bSend)
            name = Method + "_SEND";
        else
            name = Method + "_RET";
        
        var format = Engine.SendFormatMap[name];
        if(format === undefined)
        {
            var Str = Engine[name];
            if(Str !== undefined)
            {
                if(typeof Str === "object")
                    Str = SerializeLib.GetFormatFromObject(Str);
                
                format = {struct:Str, wrk:{}};
            }
            else
            {
                ToLogOne("NOT FOUND FORMAT FOR METHOD: " + name);
                return {struct:""};
            }
            Engine.SendFormatMap[name] = format;
        }
        return format;
    };
}
