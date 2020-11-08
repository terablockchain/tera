/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

const MIN_NUM_ZERO = 3;

const TempBufferRet1 = Buffer.alloc(65536);
const TempBufferRet2 = Buffer.alloc(65536);

var STAT_WORK = 0;
var STAT_ARR = [];
for(var i = 0; i < 256; i++)
    STAT_ARR[i] = {Work:0, Count:0};

class CZZip
{
    constructor()
    {
    }
    
    FindMarker(Buf)
    {
        var MaxLength = Buf.length;
        
        STAT_WORK++
        for(var i = 0; i < MaxLength; i++)
        {
            var b = Buf[i];
            var Item = STAT_ARR[b];
            if(Item.Work !== STAT_WORK)
            {
                Item.Work = STAT_WORK
                Item.Count = 0
            }
            Item.Count++
        }
        var BMarker = 0;
        for(var i = 0; i < 256; i++)
        {
            var Item = STAT_ARR[i];
            if(Item.Work !== STAT_WORK)
            {
                BMarker = i
                break;
            }
        }
        
        return BMarker;
    }
    
    GetBufferZZip(BufWrite)
    {
        var MaxLength = BufWrite.length;
        
        if(MaxLength > 65534)
            throw "Error buf size for zzip";
        
        var BMarker = this.FindMarker(BufWrite);
        TempBufferRet1[0] = BMarker
        var len = 1;
        
        if(!BMarker)
        {
            for(var i = 0; i < MaxLength; i++)
                TempBufferRet1[1 + i] = BufWrite[i]
            len += MaxLength
        }
        else
        {
            var b;
            var delta;
            var StartZ =  - 1;
            
            for(var i = 0; i <= MaxLength; i++)
            {
                if(i < MaxLength)
                    b = BufWrite[i]
                else
                    b = 256
                
                if(StartZ >= 0)
                    delta = i - StartZ
                else
                    delta = 0
                
                if(b === 0)
                {
                    if(StartZ ===  - 1)
                        StartZ = i
                    delta++
                }
                
                if(delta > 255)
                    throw "WriteNZBuffer: Error algo #1";
                
                if(b !== 0 && delta >= MIN_NUM_ZERO || delta === 255)
                {
                    TempBufferRet1[len] = BMarker
                    len++
                    TempBufferRet1[len] = delta
                    len++
                    
                    StartZ =  - 1
                    delta = 0
                }
                
                if(b !== 0 && delta < MIN_NUM_ZERO)
                {
                    if(delta)
                    {
                        for(var z = 0; z < delta; z++)
                        {
                            TempBufferRet1[len] = 0
                            len++
                        }
                    }
                    
                    if(b < 256)
                    {
                        TempBufferRet1[len] = b
                        len++
                    }
                    
                    StartZ =  - 1
                }
            }
        }
        
        TempBufferRet1.len = len
        return TempBufferRet1;
    }
    
    GetBufferUnZZip(Buf, length)
    {
        var BMarker = Buf[0];
        var len = 0;
        
        for(var i = 1; i < length; i++)
        {
            var b = Buf[i];
            if(!BMarker || b !== BMarker)
            {
                TempBufferRet2[len] = b
                len++
            }
            else
                if(b === BMarker)
                {
                    i++
                    var delta = Buf[i];
                    for(var z = 0; z < delta; z++)
                    {
                        TempBufferRet2[len] = 0
                        len++
                    }
                }
        }
        
        TempBufferRet2.len = len
        return TempBufferRet2;
    }
};

module.exports = CZZip;
