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

//key-value db

const CDBTree = require("../jinn/tera/db/tera-db-tree");

class AccountKeyValue extends require("./accounts-tr")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        const FormatRow = {ID:"uint", Key:"str", Value:"tr", };
        function FCompareRow(a,b)
        {
            if(a.ID !== b.ID)
                return a.ID - b.ID;
            if(a.Key !== b.Key)
                return (a.Key > b.Key) ? 1 :  - 1;
            return 0;
        };
        
        this.DBKeyValue = new CDBTree("accounts-key-value", FormatRow, bReadOnly, FCompareRow, "nFixed", "nBin")
        REGISTER_TR_DB(this.DBKeyValue.DB, 28)
    }
    CloseKeyValue()
    {
        this.DBKeyValue.Close()
    }
    
    ClearKeyValue()
    {
        this.DBKeyValue.Clear()
    }
    
    DeleteDBKeyValueOnBlock(BlockNum)
    {
    }
};

module.exports = AccountKeyValue;
