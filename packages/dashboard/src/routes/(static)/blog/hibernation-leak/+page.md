PocketHost instances are supposed to hibernate about 30 seconds after their last request. Many of them weren't.

The edge counts the requests open on each instance and only puts an instance to sleep when that count reaches zero. When a client disconnected while an instance was still waking up, that request was never counted as finished. The count got stuck at one, and the instance stayed awake until the next edge restart, sometimes for days.

### The fix

The edge now notices a disconnect even if it happens before the instance is ready. Requests that go away early are released right away.

After we deployed the fix, the node had **about 95 awake containers instead of 518**, and **available memory went from 2 GB to over 18 GB**. Instances with real traffic stayed up. The rest went back to sleep.

### What you should expect

Nothing changes for you. Hibernation was always meant to work this way. Your instance still wakes automatically on the next request. See [Running vs Sleeping](/blog/instance-power-status) for how the states differ.

The freed memory means more headroom for busy instances and fewer slow starts.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
