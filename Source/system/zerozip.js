/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";

/*
    Сжатие нулей буфера
    Формат данных:
    Сначала читаем байт - признак маркера нуля
    Если он не равен нулю, то каждый следующий байт интерпретируется:
    - если равен маркеру, то в следующем байте берется число нулей, которое вставляется в выходной буфер
    - не равен маркеру - запись этого байта в выходной буфер
    Иначе если маркер это ноль, то далее данные идут в несжатом виде - простое копирование в выходной буфер
    Внимание ограничения:
     - макс размер блока данных для сжатия 65534
     - эффективно использовать при размере случайных данных в буфере до 1000 байт (без сжимаемых нулей)
     - возвращаемое значение - временный массив статического характера, который переиспользуется при повторном вызове функции
*/


const MIN_NUM_ZERO = 3;

var STAT_WORK = 0;
var STAT_ARR_WORK = new Float64Array(256);
var STAT_ARR_COUNT = new Uint32Array(256);

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
            if(STAT_ARR_WORK[b] !== STAT_WORK)
            {
                STAT_ARR_WORK[b] = STAT_WORK
                STAT_ARR_COUNT[b] = 0
            }
            STAT_ARR_COUNT[b]++
        }
        var BMarker = 0;
        for(var i = 0; i < 256; i++)
        {
            if(STAT_ARR_WORK[i] !== STAT_WORK)
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
        
        var RetArr = [];
        
        var BMarker = this.FindMarker(BufWrite);
        RetArr.push(BMarker)
        
        if(!BMarker)
        {
            for(var i = 0; i < MaxLength; i++)
                RetArr[1 + i] = BufWrite[i]
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
                    throw "GetBufferZZip: Error algo #1";
                
                if(b !== 0 && delta >= MIN_NUM_ZERO || delta === 255)
                {
                    RetArr.push(BMarker)
                    RetArr.push(delta)
                    
                    StartZ =  - 1
                    delta = 0
                }
                
                if(b !== 0 && delta < MIN_NUM_ZERO)
                {
                    if(delta)
                    {
                        for(var z = 0; z < delta; z++)
                        {
                            RetArr.push(0)
                        }
                    }
                    
                    if(b < 256)
                    {
                        RetArr.push(b)
                    }
                    
                    StartZ =  - 1
                }
            }
        }
        
        return RetArr;
    }
    
    GetBufferUnZZip(Buf)
    {
        var length = Buf.length;
        var RetArr = [];
        
        var BMarker = Buf[0];
        if(!BMarker)
        {
            return Buf.slice(1);
        }
        else
        {
            for(var i = 1; i < length; i++)
            {
                var b = Buf[i];
                if(b !== BMarker)
                {
                    RetArr.push(b)
                }
                else
                    if(b === BMarker)
                    {
                        i++
                        var delta = Buf[i];
                        for(var z = 0; z < delta; z++)
                        {
                            RetArr.push(0)
                        }
                    }
            }
        }
        
        return RetArr;
    }
};

module.exports = CZZip;
