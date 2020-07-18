
global.MODE_RUN="MAIN_JINN";
const crypto = require('crypto');

global.HTTP_PORT_NUMBER=Math.trunc(10000*Math.random())+50000;
if(!global.DATA_PATH || global.DATA_PATH==="")
    global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();

global.NWMODE=1;
//global.NWVERSION="0.37.4";

global.START_IP="";
global.START_PORT_NUMBER = 30000;
global.CREATE_ON_START=0;

global.LOCAL_RUN=0;
global.JINN_MODE = 1;

require('./core/library.js');
if(!global.HTTP_PORT_NUMBER)//try 2
    global.HTTP_PORT_NUMBER=Math.trunc(10000*Math.random())+50000;

require('./process/main-process');



setTimeout(function ()
{
    //global.WEB_LOG=1;

    var Path;
    global.NW_TOKEN=GetHexFromArr(crypto.randomBytes(32));
    if(global.HTTP_SERVER_START_OK)
    {
        //Path='http://localhost:'+global.HTTP_PORT_NUMBER+'/HTML/wallet.html';
        Path='http://localhost:'+global.HTTP_PORT_NUMBER+'/HTML/'+global.NW_TOKEN;
    }
    else
    {
        Path='/HTML/wallet.html';
        ToLog("ERR HTTP-SERVER NOT STARTING");
    }


    nw.Window.open(Path,
        {
            width: 840,
            height: 1000,
            icon: "../HTML/PIC/wallet.png",
        }, function(win)
        {
            //win.showDevTools();

            //http://test.ru:58409/HTML/wallet.html

            //Path+'/HTML/wallet.html'
            //var Path2=Path+'/HTML/wallet.html';
            //win.eval(null,'document.cookie = "NW_TOKEN='+global.NW_TOKEN+';path=/"');
            //win.eval(null,'window.location="'+Path2+'"');
            //window.location="http://localhost:58409/HTML/wallet.html"

            // Create a tray icon
            let Visible=1;
            var tray = new nw.Tray({ title: 'TERA', icon: '/HTML/PIC/wallet16.png'});
            tray.on('click',function ()
            {
                Visible=!Visible;
                if(Visible)
                    win.show();
                else
                    win.hide();
            })

            // Give it a menu
            var menu = new nw.Menu();
            menu.append(new nw.MenuItem({ label: 'Hide', click:function () {win.hide();Visible=0;}}));
            menu.append(new nw.MenuItem({ label: 'Show', click:function () {win.show();Visible=1;}}));
            menu.append(new nw.MenuItem({ type: "separator"}));
            menu.append(new nw.MenuItem({ label: 'DevTools', click:function () {win.showDevTools();}}));
            menu.append(new nw.MenuItem({ type: "separator"}));
            menu.append(new nw.MenuItem({ label: 'Exit', click:function () {process.exit(0)}}));
            tray.menu = menu;


            // win.on('navigation',function (frame, url, policy)
            // {
            //     console.log("url:"+url);
            // });
        });
},500);

