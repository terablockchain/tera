"use strict";
require("./core/library");

var fs = require("fs");
const http = require('http');
const https = require('https');

require("./core/update-net");

//global.DEV_MODE=1;


var Arr=[
    {num:0,ip:"https://t1.teraexplorer.com"},
    {num:0,ip:"https://t2.teraexplorer.com"},
    {num:0,ip:"https://t4.teraexplorer.com"},
    {num:0,ip:"https://t5.teraexplorer.com"},
    {num:0,ip:"http://terablockchain.org"},
];

if(!global.NoStartLoadNewCode)
{
    var Path=process.argv[2];
    if(Path)
        Arr=[{num:0,ip:Path}];
}


var CurNum=0;
global.StartLoadNewCode=function(bRestart)
{
    CurNum=0;
    for(var i=0;i<Arr.length;i++)
        Arr[i].num=Math.floor(1000000*Math.random());
    Arr.sort(function (a,b)
    {
        return a.num-b.num;
    });

    LoadNewCode(bRestart);
};

function LoadNewCode(bRestart)
{
    var path=Arr[CurNum%Arr.length].ip;
    CurNum++;

    var lib=http;
    if(path.substr(0,5)==="https")
        lib=https;
    else
    if(path.substr(0,4)!=="http")
        path="http://"+path;

    ToLog("Try connect to: "+path);
    lib.get(path+'/update/wallet.zip', (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];

        let error;
        if (statusCode !== 200)
        {
            error = new Error('Request Failed.\n' +
                `Status Code: ${statusCode}`);
        }
        else if (!/^application\/zip/.test(contentType))
        {
            error = new Error('Invalid content-type.\n' +
                `Expected application/zip but received ${contentType}`);

        }


        if (error)
        {
            console.error(error.message);
            // Consume response data to free up memory
            res.resume();
            if(CurNum<Arr.length)
                LoadNewCode(bRestart);
            else
                CheckFinish();
            return;
        }

        let fname="./wallet.zip";
        let file_handle=fs.openSync(fname, "w");
        let Bytes=0;
        res.on('data', (chunk) =>
        {
            Bytes+=chunk.length;
            fs.writeSync(file_handle, chunk,0,chunk.length);
        });
        res.on('end', () =>
        {
            fs.closeSync(file_handle);

            ToLog("Got "+Bytes+" bytes");
            ToLog("UnpackCodeFile: "+fname);
            try
            {
                UnpackCodeFile(fname,1);

                if(bRestart && !global.DEV_MODE)
                    global.RestartNode(1);
            }
            catch (e)
            {
                ToLog(e.message);
            }
            CheckFinish();
        });
    }).on('error', (e) =>
    {
        console.error(`Got error: ${e.message}`);
        if(CurNum<Arr.length)
            LoadNewCode(bRestart);
        else
            CheckFinish();
    });

}
function CheckFinish()
{
    if(!global.NoStartLoadNewCode)
        process.exit();

}
if(!global.NoStartLoadNewCode)
{
    StartLoadNewCode(0);
}



