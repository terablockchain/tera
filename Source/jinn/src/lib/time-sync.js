/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

global.CTimeMedian = class CTimeMedian
{
    constructor(Min, Max)
    {
        this.MIN_STAT_LENGTH = Min
        this.MAX_STAT_LENGTH = Max
        this.Clear()
    }
    Clear()
    {
        this.TimeArr = []
    }
    
    AddStat(Value)
    {
        this.TimeArr.push(Value)
    }
    GetStat()
    {
        if(this.TimeArr.length < this.MIN_STAT_LENGTH)
            return undefined;
        
        this.TimeArr.sort(function (a,b)
        {
            return a - b;
        })
        
        if(this.TimeArr.length > this.MAX_STAT_LENGTH)
        {
            this.TimeArr.length = Math.floor(3 * this.MAX_STAT_LENGTH / 4)
            this.TimeArr.splice(0, this.MAX_STAT_LENGTH / 4)
        }
        
        return this.TimeArr[Math.floor(0.9 + this.TimeArr.length / 2)];
    }
};
