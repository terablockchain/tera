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



class CDBRowTR extends global.CDBRow
{
    constructor(FileName, Format, bReadOnly, ColNumName, DeltaNum, DataSize, DeltaTrPos)
    {
        super(FileName, Format, bReadOnly, ColNumName, DeltaNum, DataSize, 0)
        
        if(DeltaTrPos === undefined)
            throw "Error DeltaTrPos=" + DeltaTrPos;
        
        this.DeltaTrPos = DeltaTrPos
    }
};

global.CDBRowTR = CDBRowTR;
