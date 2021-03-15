## Metamask support from Dapp Tera

Within the dapp client side, you can call metamask methods and thereby send transactions to Ethereum and other compatible networks.

Access via a global object **ethereum**

The following methods are supported:
* ethereum.isMetaMaskInstalled() - checking for the presence of a metamask, returns a promise with a boolean value
* ethereum.request(Params) - request to Metamask, returns a promise with the result of execution
* ethereum.on(name,func) - subscribe to Metamask events (removeListener - delete subscribe)
* ethereum.selectedAddress - the user's current address(account) selected in the Metamask is returned as a promise


Ethereum RPC spec: 
* https://eth.wiki/json-rpc/API#eth_sign

Metamask spec:
* https://docs.metamask.io/guide/rpc-api.html
* https://docs.metamask.io/guide/ethereum-provider.html
 

DApp example: https://terawallet.org/dapp/129


More docs and examples: https://eips.ethereum.org/EIPS/eip-1193


### Example1:
```js
// Most Providers are available as window.ethereum on page load.
// This is only a convention, not a standard, and may not be the case in practice.
// Please consult the Provider implementation's documentation.
const ethereum = window.ethereum;

// Example 1: Log chainId
ethereum
  .request({ method: 'eth_chainId' })
  .then((chainId) => {
    console.log(`hexadecimal string: ${chainId}`);
    console.log(`decimal number: ${parseInt(chainId, 16)}`);
  })
  .catch((error) => {
    console.error(`Error fetching chainId: ${error.code}: ${error.message}`);
  });

// Example 2: Log last block
ethereum
  .request({
    method: 'eth_getBlockByNumber',
    params: ['latest', true],
  })
  .then((block) => {
    console.log(`Block ${block.number}:`, block);
  })
  .catch((error) => {
    console.error(
      `Error fetching last block: ${error.message}.
       Code: ${error.code}. Data: ${error.data}`
    );
  });

// Example 3: Log available accounts
ethereum
  .request({ method: 'eth_accounts' })
  .then((accounts) => {
    console.log(`Accounts:\n${accounts.join('\n')}`);
  })
  .catch((error) => {
    console.error(
      `Error fetching accounts: ${error.message}.
       Code: ${error.code}. Data: ${error.data}`
    );
  });

// Example 4: Log new blocks
ethereum
  .request({
    method: 'eth_subscribe',
    params: ['newHeads'],
  })
  .then((subscriptionId) => {
    ethereum.on('message', (message) => {
      if (message.type === 'eth_subscription') {
        const { data } = message;
        if (data.subscription === subscriptionId) {
          if ('result' in data && typeof data.result === 'object') {
            const block = data.result;
            console.log(`New block ${block.number}:`, block);
          } else {
            console.error(`Something went wrong: ${data.result}`);
          }
        }
      }
    });
  })
  .catch((error) => {
    console.error(
      `Error making newHeads subscription: ${error.message}.
       Code: ${error.code}. Data: ${error.data}`
    );
  });

// Example 5: Log when accounts change
const logAccounts = (accounts) => {
  console.log(`Accounts:\n${accounts.join('\n')}`);
};
ethereum.on('accountsChanged', logAccounts);
// to unsubscribe
ethereum.removeListener('accountsChanged', logAccounts);

// Example 6: Log if connection ends
ethereum.on('disconnect', (code, reason) => {
  console.log(`Ethereum Provider connection closed: ${reason}. Code: ${code}`);
});

```

### Example2:
```html
<script>

    const onClickConnect = async function()
    {
      try 
      {
        var res=await ethereum.request({ method: 'eth_requestAccounts' });
      } 
      catch (error) 
      {
        console.error(error);
      }
      if(res)
      {
          
          const netver = await ethereum.request({ method: 'net_version' });
          console.log("netver:",netver);
          
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          console.log("accounts:",accounts);
          
          console.log("blockNumber:",await ethereum.request({ method: 'eth_blockNumber',params:[] }));
          console.log("gasPrice:",await ethereum.request({ method: 'eth_gasPrice',params:[] }));
          console.log("Last Txs:",await ethereum.request({ method: 'eth_getBlockTransactionCountByNumber',params:["latest"] }));
          
          console.log("protocolVersion:",await ethereum.request({ method: 'eth_protocolVersion',params:[] }));
          
          console.log("result:",await ethereum.request({ 
                method: 'eth_getBlockByNumber',
                params: ["latest", true]
          }));
          
          

      }
    };

    async  function Sign()
    {
          console.log("run:",await ethereum.request({ method: 'eth_sign',
          params: [
            await ethereum.selectedAddress,
            "0xdeadbeafaaaaaaaabbbbbbbb"
            ] 
              
          }));
    }


    
    async  function SendTx()
    {
        const transactionParameters = {
              nonce: '0x00', // ignored by MetaMask
              
              gasPrice: '0x09184e72a0', // customizable by user during MetaMask confirmation.
              gas: '0x2710', // customizable by user during MetaMask confirmation.
              
              to: '0x4ee08a17f6020c79e4c93c768df8029b15579d18', // Required except during contract publications.
              from: await ethereum.selectedAddress, // must match user's active address.
              value: '0x00', // Only required to send ether to the recipient from the initiating external account.
              data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057', // Optional, but used for defining smart contract creation and interaction.
              chainId: '0x3', // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
            };
            
            
        try 
        {            
            // txHash is a hex string
            // As with any RPC call, it may throw an error
            const txHash = await ethereum.request({
              method: 'eth_sendTransaction',
              params: [transactionParameters],
            });
        }
        catch (error) 
        {
          console.log(error);
          SetError(error.message);
        }
      
    }
    
    async  function AddCoin()
    {
        const tokenAddress = '0xd00981105e61274c8a5cd5a88fe7e037d935b513';
        const tokenSymbol = 'TUT';
        const tokenDecimals = 18;
        const tokenImage = 'http://placekitten.com/200/300';
        
        try {
          // wasAdded is a boolean. Like any RPC method, an error may be thrown.
          const wasAdded = await ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20', // Initially only supports ERC20, but eventually more!
              options: {
                address: tokenAddress, // The address that the token is at.
                symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
                decimals: tokenDecimals, // The number of decimals in the token
                image: tokenImage, // A string url of the token logo
              },
            },
          });
        
          if (wasAdded) {
            console.log('Thanks for your interest!');
          } else {
            console.log('Your loss!');
          }
        } 
        catch (error) 
        {
          console.log(error);
        }
    }
    

    (async function ()
    {
        var result=await ethereum.isMetaMaskInstalled();
        console.log("Metamask:",await result)

        //console.log(await ethereum.GetSelectedAddress());
        console.log(await ethereum.selectedAddress);
        
    })();
    
    


    ethereum.on('accountsChanged', function (accounts) 
    {
        console.log("=accountsChanged:",accounts);
    });
    ethereum.on('chainChanged', function (chainId) {
      console.log("=chainChanged:",chainId);
    });
    
    
    ethereum.on('connect', function (result) {
      console.log("=connect:",result);
    });
    ethereum.on('disconnect', function (result) {
      console.log("=disconnect:",result);
    });
    
    



</script>


<br>

<button onclick="onClickConnect()">Connect</button>
<button onclick="Sign()">Sign</button>
<button onclick="SendTx()">SendTx</button>
<button onclick="AddCoin()">Add coin</button>





```
