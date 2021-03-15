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

const fs = require('fs');

class CSertificate
{
    constructor(greenlock)
    {
        if(!greenlock)
            throw "CSertificate constructor: greenlock=" + greenlock;
        
        this.greenlock = greenlock
        this.file_sert = GetDataPath("sertif.lst")
    }
    
    GetDateSertificate()
    {
        if(fs.existsSync(this.file_sert))
        {
            
            this.certs = LoadParams(this.file_sert, {})
            return this.certs.expiresAt;
        }
        return 0;
    }
    HasValidSertificate(DeltaDays)
    {
        if(fs.existsSync(this.file_sert))
        {
            
            this.certs = LoadParams(this.file_sert, {})
            
            var Delta = this.certs.expiresAt - Date.now();
            if(Delta > DeltaDays * 24 * 3600 * 1000)
            {
                this.tlsOptions = {key:this.certs.privkey, cert:this.certs.cert + '\r\n' + this.certs.chain}
                return 1;
            }
        }
        
        return 0;
    }
    GetNewSertificate()
    {
        ToLog("*************** START GET NEW SERTIFICATE")
        if(!global.HTTPS_HOSTING_EMAIL)
        {
            ToLog("ERROR: Not set constant HTTPS_HOSTING_EMAIL - pls set any your email and reload node")
            return 0;
        }
        
        var opts = {domains:[global.HTTPS_HOSTING_DOMAIN], email:global.HTTPS_HOSTING_EMAIL, agreeTos:true, communityMember:true, };
        
        let SELF = this;
        this.greenlock.register(opts).then(function (certs)
        {
            var WasDate = SELF.GetDateSertificate();
            if(WasDate === certs.expiresAt)
            {
                ToLog("*************** GOT NOT NEW SERTIFICATE (DATE=" + formatDate(new Date(certs.expiresAt)) + ")")
                return;
            }
            SaveParams(SELF.file_sert, certs)
            
            ToLog("*************** GOT NEW SERTIFICATE (DATE=" + formatDate(new Date(certs.expiresAt)) + ")")
            
            setTimeout(Exit, 3000)
        }, function (err)
        {
            ToError(err)
        })
        
        return 1;
    }
    
    StartCheck()
    {
        let SELF = this;
        SELF.CheckValid()
        
        setInterval(function ()
        {
            SELF.CheckValid()
        }, 3600 * 1000)
    }
    CheckValid()
    {
        if(!this.HasValidSertificate(10))
            this.GetNewSertificate()
    }
};

module.exports = CSertificate;
