/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
var root = typeof global === "object" ? global : window;
var lib = {};
lib.Write = Write;
lib.Read = Read;
lib.GetObjectFromBuffer = GetObjectFromBuffer;
lib.GetBufferFromObject = GetBufferFromObject;
lib.GetFormatFromObject = GetFormatFromObject;
root.SerializeLib = lib;
var glError = root.DEV_MODE;
const TEMP_BUFFER8 = new ArrayBuffer(8);
const DATA_VIEW8 = new DataView(TEMP_BUFFER8);
function Write(buf,data,StringFormat,ParamValue,WorkStruct)
{
    if(typeof StringFormat === "number")
    {
        ToLogTrace("ERRR StringFormat ");
        throw "ERR!!";
    }
    else
    {
        var format = StringFormat;
        if(format.substr(0, 6) === "buffer" && format.length > 6)
        {
            ParamValue = parseInt(format.substr(6));
            format = "arr";
        }
        else
            if(format.substr(0, 3) === "arr" && format.length > 3)
            {
                ParamValue = parseInt(format.substr(3));
                format = "arr";
            }
            else
                if(format.substr(0, 3) === "str" && format.length > 3)
                {
                    var length = parseInt(format.substr(3));
                    WriteStr(buf, data, length);
                    return;
                }
        switch(format)
        {
            case "str":
                {
                    WriteStr(buf, data);
                    break;
                }
            case "byte":
                {
                    WriteByte(buf, data);
                    break;
                }
            case "double":
                {
                    DATA_VIEW8.setFloat64(0, data);
                    for(var i = 0; i < 8; i++)
                    {
                        buf[buf.length] = DATA_VIEW8.getUint8(i);
                    }
                    break;
                }
            case "uint":
                {
                    if(data < 0)
                        data = 0;
                    if(data >= 281474976710655)
                        data = 0;
                    WriteUint(buf, data);
                    break;
                }
            case "uint16":
                {
                    if(data < 0)
                        data = 0;
                    WriteUint16(buf, data);
                    break;
                }
            case "uint32":
                {
                    if(!data || data < 0)
                        data = 0;
                    data = data >>> 0;
                    WriteUint32(buf, data);
                    break;
                }
            case "time":
                {
                    var Time = data.valueOf();
                    WriteUint(buf, Time);
                    break;
                }
            case "zhash":
                ZCheck:
                {
                    for(var i = 0; data && i < 32; i++)
                    {
                        if(data[i] !== 0)
                            break ZCheck;
                    }
                    WriteByte(buf, 0);
                    break;
                }
                WriteByte(buf, 1);
                WriteArr(buf, data, 32);
                break;
            case "hash":
                {
                    WriteArr(buf, data, 32);
                    break;
                }
            case "arr":
                {
                    var length;
                    if(ParamValue === undefined)
                        throw "Error format " + format + " needs number of length";
                    else
                        length = ParamValue;
                    WriteArr(buf, data, length);
                    break;
                }
            case "tr":
                {
                    var length;
                    if(data)
                        length = data.length;
                    else
                        data = 0;
                    if(length > 65535)
                        length = 65535;
                    WriteUint16(buf, length);
                    WriteArr(buf, data, length);
                    break;
                }
            case "buffer":
            case "data":
                {
                    var length;
                    if(data)
                        length = data.length;
                    else
                        data = 0;
                    WriteUint32(buf, length);
                    WriteArr(buf, data, length);
                    break;
                }
            case "hashSTR":
                {
                    var Str = GetHexFromArr(data);
                    WriteStr(buf, Str, 64);
                    break;
                }
            case "uintSTR":
                {
                    var Str = data.toString();
                    WriteStr(buf, Str, 10);
                    break;
                }
            default:
                {
                    WorkStruct = WorkStruct || {};
                    var CurFormat = StringFormat.substr(0, 1);
                    if(CurFormat === "[")
                    {
                        var length;
                        if(data)
                            length = data.length;
                        var formatNext = GetMiddleString(format);
                        WriteUint32(buf, length);
                        for(var i = 0; i < length; i++)
                        {
                            Write(buf, data[i], formatNext, undefined, WorkStruct);
                        }
                    }
                    else
                        if(CurFormat === "<")
                        {
                            var length;
                            if(data)
                                length = data.length;
                            var formatNext = GetMiddleString(format);
                            var IndexCount = 0;
                            var IndexCountPos = buf.length;
                            buf.length = buf.length + 4;
                            for(var i = 0; i < length; i++)
                            {
                                if(data[i])
                                {
                                    IndexCount++;
                                    WriteUint32(buf, i);
                                    Write(buf, data[i], formatNext, undefined, WorkStruct);
                                }
                            }
                            WriteUint32AtPos(buf, IndexCount, IndexCountPos);
                        }
                        else
                            if(CurFormat === "{")
                            {
                                if(!data)
                                    data = {};
                                var attrs = WorkStruct[format];
                                if(!attrs)
                                {
                                    attrs = GetAttributes(GetMiddleString(format));
                                    WorkStruct[format] = attrs;
                                }
                                for(var i = 0; i < attrs.length; i++)
                                {
                                    var type = attrs[i];
                                    Write(buf, data[type.Key], type.Value, undefined, WorkStruct);
                                }
                            }
                            else
                            {
                                throw "Bad write type params: " + format;
                            }
                }
        }
    }
}
function Read(buf,StringFormat,ParamValue,WorkStruct,bNewVer)
{
    var ret;
    if(typeof StringFormat === "number")
    {
        ToLogTrace("ERR StringFormat");
        throw "ERRR!";
    }
    else
    {
        var format = StringFormat;
        if(format.substr(0, 6) === "buffer")
        {
            if(format.length > 6)
            {
                ParamValue = parseInt(format.substr(6));
                format = "arr";
            }
            else
            {
                ParamValue = 0;
            }
        }
        else
            if(format.substr(0, 3) === "arr")
            {
                if(format.length > 3)
                {
                    ParamValue = parseInt(format.substr(3));
                    format = "arr";
                }
                else
                {
                    ParamValue = 0;
                }
            }
            else
                if(format.substr(0, 3) === "str")
                {
                    if(format.length > 3)
                    {
                        var length = parseInt(format.substr(3));
                        ret = ReadStrConstL(buf, length);
                        return ret;
                    }
                    else
                    {
                        ParamValue = 0;
                    }
                }
        switch(format)
        {
            case "str":
                {
                    ret = ReadStr(buf);
                    break;
                }
            case "byte":
                {
                    ret = ReadByte(buf);
                    break;
                }
            case "double":
                {
                    if(buf.len + 8 <= buf.length)
                    {
                        for(var i = 0; i < 8; i++)
                        {
                            DATA_VIEW8.setUint8(i, buf[buf.len + i]);
                        }
                        ret = DATA_VIEW8.getFloat64(0);
                    }
                    else
                    {
                        ret = 0;
                    }
                    if(!ret && bNewVer)
                        ret = 0;
                    buf.len += 8;
                    break;
                }
            case "uint":
                {
                    ret = ReadUintFromArr(buf);
                    break;
                }
            case "uint16":
                {
                    ret = ReadUint16FromArr(buf);
                    break;
                }
            case "uint32":
                {
                    ret = ReadUint32FromArr(buf);
                    break;
                }
            case "time":
                {
                    ret = ReadUintFromArr(buf);
                    ret = new Date(ret);
                    break;
                }
            case "zhash":
                {
                    if(ReadByte(buf))
                        ret = ReadArr(buf, 32);
                    else
                        ret = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    break;
                }
            case "hash":
                {
                    ret = ReadArr(buf, 32);
                    break;
                }
            case "arr":
                {
                    if(ParamValue === undefined)
                        throw "Error format " + format + " needs number of length";
                    if(buf.len + ParamValue <= buf.length)
                    {
                        ret = ReadArr(buf, ParamValue);
                        break;
                    }
                    else
                    {
                        ret = [];
                        for(var i = 0; i < ParamValue; i++)
                            ret[i] = 0;
                    }
                    buf.len += ParamValue;
                    break;
                }
            case "tr":
                {
                    if(buf.len + 1 >= buf.length)
                    {
                        ret = undefined;
                        break;
                    }
                    var length = buf[buf.len] + buf[buf.len + 1] * 256;
                    buf.len += 2;
                    ret = ReadArr(buf, length);
                    break;
                }
            case "data":
            case "buffer":
                {
                    var length = ReadUint32FromArr(buf);
                    if(length > buf.length - buf.len)
                        length = 0;
                    ret = ReadArr(buf, length);
                    if(format === "buffer")
                        ret = Buffer.from(ret);
                    break;
                }
            case "hashSTR":
                {
                    var Str = ReadStrConstL(buf, 64);
                    ret = GetArrFromHex(Str);
                    break;
                }
            case "uintSTR":
                {
                    var Str = ReadStrConstL(buf, 10);
                    ret = parseInt(Str);
                    break;
                }
            default:
                {
                    WorkStruct = WorkStruct || {};
                    var LStr = format.substr(0, 1);
                    if(LStr === "[" || LStr === "<")
                    {
                        var bIndexArr = (LStr === "<");
                        ret = [];
                        var formatNext = GetMiddleString(format);
                        var length = Read(buf, "uint32");
                        if(!CheckLength(buf, length))
                        {
                            break;
                        }
                        for(var i = 0; i < length; i++)
                        {
                            if(buf.len <= buf.length)
                            {
                                if(bIndexArr)
                                {
                                    var index = Read(buf, "uint32");
                                    ret[index] = Read(buf, formatNext, undefined, WorkStruct, bNewVer);
                                }
                                else
                                {
                                    ret[i] = Read(buf, formatNext, undefined, WorkStruct, bNewVer);
                                }
                            }
                            else
                                break;
                        }
                    }
                    else
                        if(LStr === "{")
                        {
                            var attrs = WorkStruct[format];
                            if(!attrs)
                            {
                                attrs = GetAttributes(GetMiddleString(format));
                                WorkStruct[format] = attrs;
                            }
                            ret = {};
                            for(var i = 0; i < attrs.length; i++)
                            {
                                var type = attrs[i];
                                ret[type.Key] = Read(buf, type.Value, undefined, WorkStruct, bNewVer);
                            }
                        }
                        else
                        {
                            throw "Bad read type params: " + format;
                        }
                }
        }
    }
    return ret;
}
function GetObjectFromBuffer(buffer,format,WorkStruct,bNoSizeControl,bOldVer)
{
    var Arr = buffer;
    Arr.len = 0;
    if(typeof format === "object")
    {
        if(!WorkStruct.FromObject)
            WorkStruct.FromObject = GetFormatFromObject(format);
        format = WorkStruct.FromObject;
    }
    var Data = Read(Arr, format, undefined, WorkStruct, !bOldVer);
    if(root.DEV_MODE)
        if(!bNoSizeControl && glError && Arr.len > Arr.length)
        {
            ToLogOne("**********Find error size on format: " + format, " " + Arr.len + "/" + Arr.length);
        }
    return Data;
}
function GetBufferFromObject(data,format,WorkStruct,bGetAsBuffer,Arr)
{
    if(typeof format === "object")
    {
        if(!WorkStruct.FromObject)
            WorkStruct.FromObject = GetFormatFromObject(format);
        format = WorkStruct.FromObject;
    }
    if(!Arr)
        Arr = [];
    Arr.len = Arr.length;
    Write(Arr, data, format, undefined, WorkStruct);
    if(bGetAsBuffer && root.Buffer)
        Arr = Buffer.from(Arr);
    return Arr;
}
function GetFormatFromObject(Obj)
{
    var Str = "{";
    var Type = typeof Obj;
    LType:
    switch(Type)
    {
        case "object":
            var bFirst = 1;
            for(var key in Obj)
            {
                if(!bFirst)
                    Str += ",";
                else
                {
                    if(key === "0")
                    {
                        Str = "[" + GetFormatFromObject(Obj[0]) + "]";
                        break LType;
                    }
                    Str = "{";
                    bFirst = 0;
                }
                Str += key + ":" + GetFormatFromObject(Obj[key]);
            }
            Str += "}";
            break;
        case "array":
            {
                if(Obj.length === 0)
                    throw "Error format array length";
                Str = "[" + GetFormatFromObject(Obj[0]) + "]";
                break;
            }
        case "string":
            Str = Obj;
            break;
    }
    return Str;
}
function GetMiddleString(Str)
{
    return Str.substr(1, Str.length - 2);
}
function GetMiddleString2(Str,FromStr,ToStr)
{
    var Count = 0;
    var Result = "";
    for(var i = 0; i < Str.length; i++)
    {
        var FStr = Str.substr(i, 1);
        if(FStr === " " || FStr === "\n")
        {
            continue;
        }
        if(FStr === FromStr)
        {
            Count++;
            if(Count === 1)
                continue;
        }
        if(FStr === ToStr)
        {
            Count--;
            if(Count === 0)
                break;
        }
        if(Count)
            Result = Result + FStr;
    }
    return Result;
}
function GetAttributeStrings(Str)
{
    var Count = 0;
    var Result = [];
    var Element = "";
    for(var i = 0; i < Str.length; i++)
    {
        var FStr = Str.substr(i, 1);
        if(FStr === "{")
        {
            Count++;
        }
        else
            if(FStr === "}")
            {
                Count--;
            }
            else
                if(FStr === "," && Count === 0)
                {
                    if(Element.length > 0)
                        Result.push(Element);
                    Element = "";
                    continue;
                }
                else
                    if(FStr === " " || FStr === "\n")
                        continue;
        Element = Element + FStr;
    }
    if(Element.length > 0)
        Result.push(Element);
    return Result;
}
function GetKeyValueStrings(Str)
{
    var Key = "";
    for(var i = 0; i < Str.length; i++)
    {
        var FStr = Str.substr(i, 1);
        if(FStr === " " || FStr === "\n")
        {
            continue;
        }
        if(FStr === ":")
        {
            var Value = Str.substr(i + 1);
            return {Key:Key, Value:Value};
        }
        Key = Key + FStr;
    }
    throw "Error format Key:Value = " + Str;
}
function GetAttributes(Str)
{
    var arr = [];
    var attrstr = GetAttributeStrings(Str);
    for(var i = 0; i < attrstr.length; i++)
    {
        var type = GetKeyValueStrings(attrstr[i]);
        arr.push(type);
    }
    return arr;
}
function toUTF8Array(str)
{
    var utf8 = [];
    for(var i = 0; i < str.length; i++)
    {
        var charcode = str.charCodeAt(i);
        if(charcode < 0x80)
            utf8.push(charcode);
        else
            if(charcode < 0x800)
            {
                utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
            }
            else
                if(charcode < 0xd800 || charcode >= 0xe000)
                {
                    utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
                }
                else
                {
                    i++;
                    charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                    utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
                }
    }
    return utf8;
}
function Utf8ArrayToStrNew(array)
{
    var out = Utf8ArrayToStrInner(array);
    for(var i = 0; i < out.length; i++)
    {
        if(out.charCodeAt(i) === 0)
        {
            out = out.substr(0, i);
            break;
        }
    }
    return out;
}
var Utf8ArrayToStrInner = (function ()
{
    var charCache = new Array(128);
    var charFromCodePt = String.fromCodePoint || String.fromCharCode;
    var result = [];
    return function (array)
    {
        var codePt, byte1;
        var buffLen = array.length;
        result.length = 0;
        try
        {
            for(var i = 0; i < buffLen; )
            {
                byte1 = array[i++];
                if(byte1 <= 0x7F)
                {
                    codePt = byte1;
                }
                else
                    if(byte1 <= 0xDF)
                    {
                        codePt = ((byte1 & 0x1F) << 6) | (array[i++] & 0x3F);
                    }
                    else
                        if(byte1 <= 0xEF)
                        {
                            codePt = ((byte1 & 0x0F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
                        }
                        else
                            if(String.fromCodePoint)
                            {
                                codePt = ((byte1 & 0x07) << 18) | ((array[i++] & 0x3F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
                            }
                            else
                            {
                                codePt = 63;
                                i += 3;
                            }
                result.push(charCache[codePt] || (charCache[codePt] = charFromCodePt(codePt)));
            }
        }
        catch(e)
        {
            if(glError)
                ToLog("charFromCodePt:" + e, 3);
        }
        return result.join('');
    };
}
)();
function GetArr32FromStr(Str)
{
    return GetArrFromStr(Str, 32);
}
function GetArrFromStr(Str,Len)
{
    var arr = toUTF8Array(Str);
    for(var i = arr.length; i < Len; i++)
    {
        arr[i] = 0;
    }
    return arr.slice(0, Len);
}
function WriteByte(arr,Num)
{
    if(!Num)
        Num = 0;
    arr[arr.length] = Num & 0xFF;
}
function WriteUint(arr,Num)
{
    if(!Num)
        Num = 0;
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
    arr[len + 2] = (Num >>> 16) & 0xFF;
    arr[len + 3] = (Num >>> 24) & 0xFF;
    var NumH = Math.floor(Num / 4294967296);
    arr[len + 4] = NumH & 0xFF;
    arr[len + 5] = (NumH >>> 8) & 0xFF;
}
function WriteUint16(arr,Num)
{
    if(!Num)
        Num = 0;
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
}
function WriteUint32(arr,Num)
{
    if(!Num)
        Num = 0;
    var len = arr.length;
    arr[len] = Num & 0xFF;
    arr[len + 1] = (Num >>> 8) & 0xFF;
    arr[len + 2] = (Num >>> 16) & 0xFF;
    arr[len + 3] = (Num >>> 24) & 0xFF;
}
function WriteUint32AtPos(arr,Num,Pos)
{
    if(!Num)
        Num = 0;
    arr[Pos] = Num & 0xFF;
    arr[Pos + 1] = (Num >>> 8) & 0xFF;
    arr[Pos + 2] = (Num >>> 16) & 0xFF;
    arr[Pos + 3] = (Num >>> 24) & 0xFF;
}
function WriteUint32ReverseAtPos(arr,Num,Pos)
{
    if(!Num)
        Num = 0;
    arr[Pos + 3] = Num & 0xFF;
    arr[Pos + 2] = (Num >>> 8) & 0xFF;
    arr[Pos + 1] = (Num >>> 16) & 0xFF;
    arr[Pos] = (Num >>> 24) & 0xFF;
}
function WriteStr(arr,Str,ConstLength)
{
    if(!Str)
        Str = "";
    var arrStr = toUTF8Array(Str);
    var length;
    var len = arr.length;
    if(ConstLength)
    {
        length = ConstLength;
    }
    else
    {
        length = arrStr.length;
        if(length > 65535)
            length = 65535;
        arr[len] = length & 0xFF;
        arr[len + 1] = (length >>> 8) & 0xFF;
        len += 2;
    }
    for(var i = 0; i < length; i++)
    {
        if(arrStr[i])
            arr[len + i] = arrStr[i];
        else
            arr[len + i] = 0;
    }
}
function WriteArr(arr,arr2,ConstLength)
{
    var length;
    if(arr2)
        length = Math.min(ConstLength, arr2.length);
    else
        length = 0;
    for(var i = 0; i < length; i++)
    {
        arr[arr.length] = arr2[i];
    }
    for(var i = length; i < ConstLength; i++)
    {
        arr[arr.length] = 0;
    }
}
function ReadUintFromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 6;
    }
    if(glError && arr.len > arr.length)
    {
        ToLogOne("**********Error Uint buf len", "+: " + arr.len + "/" + arr.length);
        return 0;
    }
    var value = (arr[len + 5] << 23) * 2 + (arr[len + 4] << 16) + (arr[len + 3] << 8) + arr[len + 2];
    value = value * 256 + arr[len + 1];
    value = value * 256 + arr[len];
    return value;
}
function ReadUint32FromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 4;
    }
    if(glError && arr.len > arr.length)
    {
        ToLogOne("**********Error Uint32 buf len", "+: " + arr.len + "/" + arr.length);
        return 0;
    }
    return (arr[len + 3] << 23) * 2 + (arr[len + 2] << 16) + (arr[len + 1] << 8) + arr[len];
}
function ReadUint16FromArr(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 2;
    }
    if(glError && arr.len > arr.length)
    {
        ToLogOne("**********Error Uint16 buf len", "+: " + arr.len + "/" + arr.length);
        return 0;
    }
    return (arr[len + 1] << 8) + arr[len];
}
function ReadByte(arr,len)
{
    if(len === undefined)
    {
        len = arr.len;
        arr.len += 1;
    }
    if(glError && arr.len > arr.length)
    {
        ToLogOne("**********Error Uint8 buf len", "+: " + arr.len + "/" + arr.length);
        return 0;
    }
    return arr[len];
}
function ReadArr(arr,length)
{
    var Ret = [];
    if(!CheckLength(arr, length))
        return Ret;
    var len = arr.len;
    for(var i = 0; i < length; i++)
    {
        Ret[i] =  + arr[len + i];
        if(!Ret[i])
            Ret[i] = 0;
    }
    arr.len += length;
    return Ret;
}
function ReadStr(arr)
{
    var length = arr[arr.len] + arr[arr.len + 1] * 256;
    if(!CheckLength(arr, length))
        return "";
    arr.len += 2;
    return ReadStrConstL(arr, length);
}
function ReadStrConstL(arr,length)
{
    var arr2 = arr.slice(arr.len, arr.len + length);
    var Str = Utf8ArrayToStrNew(arr2);
    arr.len += length;
    return Str;
}
function CheckLength(Arr,length)
{
    if(isNaN(length) || length > Arr.length)
    {
        Arr.len = Arr.length;
        return 0;
    }
    return 1;
}
function GetArrFromHex(Str)
{
    var array = [];
    for(var i = 0; Str && i < Str.length / 2; i++)
    {
        array[i] = parseInt(Str.substr(i * 2, 2), 16);
    }
    return array;
}

var ErrorCount = 0;
var TestMapValue = {};
var TestMapFormat = {};
var glTestCount = 0;
function TestValue(Value,Format,bLog)
{
    var Buf = GetBufferFromObject(Value, Format, {});
    var Value2 = GetObjectFromBuffer(Buf, Format, {});
    var Str1 = JSON.stringify(Value);
    var Str2 = JSON.stringify(Value2);
    if(typeof Format === "object")
    {
        Format = GetFormatFromObject(Format);
    }
    if(Str1 !== Str2)
    {
        ToLog("Error format: " + Format + " <--------------------------------------------------");
        ToLog(JSON.stringify(Value));
        ToLog(JSON.stringify(Value2));
        ToLog(Buf);
        ErrorCount++;
        return 0;
    }
    else
    {
        if(bLog)
        {
            ToLog("Completed: " + Format);
            ToLog(JSON.stringify(Value));
            ToLog(JSON.stringify(Value2));
        }
        glTestCount++;
        var Key = "T" + glTestCount;
        TestMapValue[Key] = Value;
        TestMapFormat[Key] = Format;
        return 1;
    }
}
root.WriteUint32AtPos = WriteUint32AtPos;
root.WriteUint32ReverseAtPos = WriteUint32ReverseAtPos;
root.WriteUint32 = WriteUint32;
root.ReadUint32FromArr = ReadUint32FromArr;
root.ReadStrFromArr = Utf8ArrayToStrNew;
