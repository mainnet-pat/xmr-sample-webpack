import assert from "assert";
import moneroTs from "monero-ts";

/**
 * Sample code using monero-ts.
 */
runMain();
async function runMain() {
  
  // connect to a daemon
  let daemon = await moneroTs.connectToDaemonRpc("http://localhost:38081", "superuser", "abctesting123");
  let height = await daemon.getHeight();            // 1523651
  let feeEstimate = await daemon.getFeeEstimate();  // 1014313512
  let txsInPool: moneroTs.MoneroTx[] = await daemon.getTxPool();         // get transactions in the pool
  
  // open wallet on monero-wallet-rpc
  let walletRpc = await moneroTs.connectToWalletRpc("http://localhost:38083", "rpc_user", "abc123");
  await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
  let primaryAddress = await walletRpc.getPrimaryAddress(); // 555zgduFhmKd2o8rPUz...
  let balance = await walletRpc.getBalance();               // 533648366742
  let txs = await walletRpc.getTxs();                       // get transactions containing transfers to/from the wallet
  
  // create wallet from seed phrase using WebAssembly bindings to monero-project
  let walletFull = await moneroTs.createWalletFull({
    password: "supersecretpassword123",
    networkType: moneroTs.MoneroNetworkType.STAGENET,
    server: {
      uri: 'http://localhost:38081',
      username: 'superuser',
      password: 'abctesting123'
    },
    seed: "hijack lucky rally sober hockey robot gumball amaze gave fifteen organs gecko skater wizard demonstrate upright system vegan tobacco tsunami lurk withdrawn tomorrow uphill organs",
    restoreHeight: 589429
  });
  
  // synchronize with progress notifications
  await walletFull.sync(new class extends moneroTs.MoneroWalletListener {
    async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
      // feed a progress bar?
    }
  });
  
  // synchronize in the background
  await walletFull.startSyncing();
  
  // listen for incoming transfers
  let fundsReceived = false;
  await walletFull.addListener(new class extends moneroTs.MoneroWalletListener {
    async onOutputReceived(output: moneroTs.MoneroOutputWallet) {
      let amount = output.getAmount();
      let txHash = output.getTx().getHash();
      fundsReceived = true;
    }
  });
  
  // send funds from RPC wallet to WebAssembly wallet
  let createdTx = await walletRpc.createTx({
    accountIndex: 0,
    address: await walletFull.getAddress(0, 0),
    amount: BigInt("5000000"), // amount to transfer in atomic units
    relay: false // create transaction and relay to the network if true
  });
  let fee = createdTx.getFee(); // "Are you sure you want to send... ?"
  await walletRpc.relayTx(createdTx); // relay the transaction
  
  // recipient receives unconfirmed funds within 10 seconds
  await new Promise(function(resolve) { setTimeout(resolve, 10000); });
  assert(fundsReceived);
  
  // close WebAssembly wallet
  await walletFull.close();
}