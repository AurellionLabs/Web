const https = require('https');

// Check ALL recent events from ALL contracts to see what's being indexed
const data = JSON.stringify({
  query: `{ 
    recentMints: mintedAssetEventss(limit: 3, orderBy: "blockNumber", orderDirection: "desc") {
      items { blockNumber transactionHash }
    }
    recentTransfers: transferEventss(limit: 3, orderBy: "blockNumber", orderDirection: "desc") {
      items { blockNumber transactionHash }
    }
    recentNodes: nodeRegisteredEventss(limit: 3, orderBy: "blockNumber", orderDirection: "desc") {
      items { blockNumber transactionHash }
    }
    recentOrders: orderPlacedEventss(limit: 3, orderBy: "blockNumber", orderDirection: "desc") {
      items { blockNumber transactionHash baseToken }
    }
  }`,
});

const options = {
  hostname: 'indexer.aurellionlabs.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => (body += d));
  res.on('end', () => console.log(JSON.stringify(JSON.parse(body), null, 2)));
});

req.write(data);
req.end();
