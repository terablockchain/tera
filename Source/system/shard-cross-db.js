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

//support cross-tx engine (db-module)

const CDBCrossTx = require("../jinn/tera/db/tera-db-cross");
const CDBTree = require("../jinn/tera/db/tera-db-tree");

class ShardCrossDB extends require("./shard-cross-lib")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        this.CrossSend = new CDBCrossTx("cross-send", {}, bReadOnly)
        const FormatRowHash = {RowHash:"hash", RowNum:"uint", ChannelNum:"uint32", BlockNum:"uint32", TxNum:"uint16", HeightStart:"uint32",
            Height:"uint32", BlockNumVote:"uint32", TxNumVote:"uint16", BlockNumRun:"uint32", TxNumRun:"uint16", PrevRowHash:"hash", PrevLogRowHash:"hash",
            Reserve:"arr10"};
        
        function FCompareRowHash(a,b)
        {
            return CompareArr(a.RowHash, b.RowHash);
        };
        
        this.CrossRowHashBlock = new CDBTree("cross-rowhash", FormatRowHash, bReadOnly, FCompareRowHash, "nFixed", "Bin")
        const FormatDataHash = {DataHash:"hash", BlockNumRun:"uint32", TxNumRun:"uint16", Reserve:"arr12"};
        function FCompareDataHash(a,b)
        {
            return CompareArr(a.DataHash, b.DataHash);
        };
        
        this.CrossDataHashRun = new CDBTree("cross-work-hash", FormatDataHash, bReadOnly, FCompareDataHash, "nFixed", "Bin")
        
        this.CrossSend.RegisterTrDB(52)
        
        REGISTER_TR_DB(this.CrossRowHashBlock.DB, 56)
        REGISTER_TR_DB(this.CrossDataHashRun.DB, 58)
        this.ShardProcessingTree = new RBTree(function (a,b)
        {
            if(a.ChannelName !== b.ChannelName)
                return (a.ChannelName > b.ChannelName) ? 1 :  - 1;
            return 0;
        })
    }
    
    CloseCrossDB()
    {
        this.CrossRowHashBlock.Close()
        this.CrossDataHashRun.Close()
        this.ShardProcessingTree.clear()
    }
    ClearCrossDB()
    {
        this.CrossRowHashBlock.Clear()
        this.CrossDataHashRun.Clear()
    }
    OnProcessCrossBlockStart(Block)
    {
        this.ShardProcessingTree.clear()
    }
    
    OnProcessCrossBlockFinish(Block)
    {
    }
    
    DeleteCrossTR(BlockNum)
    {
        this.CrossSend.DeleteFromBlock(BlockNum)
    }
};

module.exports = ShardCrossDB;
