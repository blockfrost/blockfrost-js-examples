import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import Bottleneck from "bottleneck";

const API = new BlockFrostAPI({
  projectId: "YOUR API KEY HERE",
});

(async () => {
  const limiter = new Bottleneck({
    /*
      How many jobs can be executed before the limiter stops executing jobs. 
      If reservoir reaches 0, no jobs will be executed until it is no longer 0. 
      New jobs will still be queued up. 
    */
    reservoir: 0,

    /*
      The increment applied to reservoir when reservoirIncreaseInterval is in use.
    */
    reservoirIncreaseAmount: 2000,

    /* Every reservoirRefreshInterval milliseconds, the reservoir value will be automatically updated to the value of reservoirRefreshAmount.
       The reservoirRefreshInterval value should be a multiple of 250(5000 for Clustering).
    */
    reservoirIncreaseInterval: 5000,

    /*
      The maximum value that reservoir can reach when reservoirIncreaseInterval is in use.
    */
    reservoirIncreaseMaximum: 10,
  });

  limiter.on("error", function (error) {
    console.log("custom rate limiter error", error);
  });

  API.rateLimiter = limiter;

  try {
    const latestBlock = await API.blocksLatest();

    console.log("latestBlock", latestBlock);
  } catch (err) {
    console.log("error", err);
  }
})();
