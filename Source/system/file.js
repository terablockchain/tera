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

global.TYPE_TRANSACTION_FILE = 5;

global.FORMAT_FILE_CREATE = "{Type:byte,Name:str,ContentType:str,Reserve:arr10,Data:tr}";
const WorkStructRun = {};


class FileApp extends require("./dapp")
{
    constructor()
    {
        super()
    }
    
    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        return true;
    }
    
    GetFormatTransaction(Type)
    {
        return FORMAT_FILE_CREATE;
    }
    
    GetVerifyTransaction(Block, BlockNum, TrNum, Body)
    {
        return 1;
    }
}
module.exports = FileApp;
var App = new FileApp;
DApps["File"] = App;
DAppByType[TYPE_TRANSACTION_FILE] = App;
