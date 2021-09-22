/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/




require("./common-journal");
require("./common-tr");
require("./common-acts");
require("./common-tx");

require("./dapp");
require("./accounts");
require("./smart");
require("./shard-channel");
require("./file");

require("./syscore");

global.ACCOUNTS = DApps.Account;
global.SMARTS = DApps.Smart;
global.SHARDS = DApps.Shard;
global.SYSCORE = DApps.SysCore;

