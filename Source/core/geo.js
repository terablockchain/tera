/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var fs = require('fs');
require("./library.js");

var BufIP;
var MapNames = {};
var FileIp = "./SITE/DB/iplocation.db";
var FileNames = "./SITE/DB/locationnames.csv";
var Format = "{Value:uint32,Length:uint32, id:uint32, latitude:uint32, longitude:uint32}";
var FormatStruct = {};
function SetGeoLocation(Item)
{
    if(!Item.ip || !BufIP || !BufIP.length)
        return false;
    
    var Num = IPToUint(Item.ip);
    var Location = FindItem(BufIP, 20, Num);
    
    if(Location)
    {
        Item.latitude = Location.latitude;
        Item.longitude = Location.longitude;
        Item.name = MapNames[Location.id];
    }
    
    Item.Geo = 1;
    return true;
}

function ReadItem(Num,Size)
{
    BufIP.len = Num * Size;
    var Data = BufLib.Read(BufIP, Format, undefined, FormatStruct);
    return Data;
}

function FindItem(Buf,Size,FindValue)
{
    
    var Item;
    var MaxNum = Math.trunc(Buf.length / Size);
    var MinItem = ReadItem(0, Size);
    var MaxItem = ReadItem(MaxNum, Size);
    var StartNum = 0;
    var EndNum = MaxNum;
    var CurNum = Math.trunc(FindValue * MaxNum / 0x100000000);
    if(CurNum >= MaxNum)
        CurNum = MaxNum - 1;
    if(CurNum < StartNum)
        CurNum = StartNum;
    
    var CountIt = 40;
    while(CountIt > 0)
    {
        CountIt--;
        
        Item = ReadItem(CurNum, Size);
        if(Item)
        {
            if(Item.Value > FindValue)
            {
                EndNum = CurNum - 1;
                var Delta = CurNum - StartNum;
                if(Delta === 0)
                    return undefined;
                Delta = Math.trunc((1 + Delta) / 2);
                CurNum = CurNum - Delta;
            }
            else
                if(Item.Value < FindValue)
                {
                    if(Item.Value + Item.Length >= FindValue)
                        return Item;
                    
                    StartNum = CurNum + 1;
                    var Delta = EndNum - CurNum;
                    if(Delta === 0)
                        return undefined;
                    Delta = Math.trunc((1 + Delta) / 2);
                    CurNum = CurNum + Delta;
                }
                else
                    if(Item.Value === FindValue)
                        return Item;
        }
        else
        {
            ToLog("GEO FindItem - Error read num: " + CurNum);
            return undefined;
        }
    }
    return undefined;
}

function Init()
{
    if(!fs.existsSync(FileIp))
        return;
    if(!fs.existsSync(FileNames))
        return;
    BufIP = fs.readFileSync(FileIp);
    var Buf = fs.readFileSync(FileNames);
    var index2 = 0;
    var Count = 0;
    
    while(true)
    {
        var index = Buf.indexOf("\n", index2);
        if(index < 0)
            break;
        
        var Str = Buf.toString('utf-8', index2, index - 1);
        
        index2 = index + 1;
        var Arr = Str.split(',');
        var Num = parseInt(Arr[0]);
        if(!Num)
            continue;
        
        Count++;
        
        var Name = Arr[10];
        if(!Name)
            Name = Arr[7];
        if(!Name)
            Name = Arr[5];
        
        MapNames[Num] = Name;
    }
}
function IPToUint(IPv4)
{
    var d = IPv4.split('.');
    return (((((( + d[0]) * 256) + ( + d[1])) * 256) + ( + d[2])) * 256) + ( + d[3]);
}

global.SetGeoLocation = SetGeoLocation;
Init();


